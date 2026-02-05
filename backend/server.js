const express = require('express');
const cors = require('cors');
const { getDb } = require('./db');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Get all experts
app.get('/api/experts', async (req, res) => {
    try {
        const db = await getDb();
        const experts = await db.all('SELECT * FROM experts');

        // Fetch slots for each expert
        for (let expert of experts) {
            expert.pollingSlots = await db.all('SELECT * FROM polling_slots WHERE expertId = ?', [expert.id]);
            for (let slot of expert.pollingSlots) {
                const voters = await db.all('SELECT voterName FROM voter_responses WHERE slotId = ?', [slot.id]);
                slot.voters = voters.map(v => v.voterName);
                slot.votes = slot.voters.length;
            }

            if (expert.selected_slot) {
                expert.selectedSlot = JSON.parse(expert.selected_slot);
            }
            if (expert.confirmed_slots) {
                expert.confirmedSlots = JSON.parse(expert.confirmed_slots);
            } else {
                expert.confirmedSlots = [];
            }
            if (expert.accepted_at) {
                expert.acceptedAt = expert.accepted_at;
            }

            // Voter passwords (only used internally, but let's fetch for compatibility if needed)
            const passwords = await db.all('SELECT voterName, password FROM voter_passwords WHERE expertId = ?', [expert.id]);
            expert.voterPasswords = {};
            passwords.forEach(p => {
                expert.voterPasswords[p.voterName] = p.password;
            });
        }

        res.json(experts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Create/Update expert
app.post('/api/experts', async (req, res) => {
    try {
        const db = await getDb();
        const expert = req.body;

        const existing = await db.get('SELECT id FROM experts WHERE id = ?', [expert.id]);

        if (existing) {
            await db.run(
                'UPDATE experts SET name = ?, organization = ?, position = ?, email = ?, phone = ?, fee = ?, status = ?, password = ?, selected_slot = ?, confirmed_slots = ? WHERE id = ?',
                [expert.name, expert.organization, expert.position, expert.email, expert.phone, expert.fee, expert.status, expert.password, expert.selectedSlot ? JSON.stringify(expert.selectedSlot) : null, expert.confirmedSlots ? JSON.stringify(expert.confirmedSlots) : null, expert.id]
            );
        } else {
            await db.run(
                'INSERT INTO experts (id, name, organization, position, email, phone, fee, status, password, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [expert.id, expert.name, expert.organization, expert.position, expert.email, expert.phone, expert.fee, expert.status || 'none', expert.password, expert.createdAt || new Date().toISOString()]
            );
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Delete expert
app.delete('/api/experts/:id', async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;

        await db.run('DELETE FROM voter_responses WHERE expertId = ?', [id]);
        await db.run('DELETE FROM voter_passwords WHERE expertId = ?', [id]);
        await db.run('DELETE FROM polling_slots WHERE expertId = ?', [id]);
        await db.run('DELETE FROM experts WHERE id = ?', [id]);

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Add polling slot
app.post('/api/experts/:id/slots', async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        const slot = req.body;

        await db.run(
            'INSERT INTO polling_slots (id, expertId, date, time, votes) VALUES (?, ?, ?, ?, ?)',
            [slot.id, id, slot.date, slot.time, 0]
        );

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Delete polling slot
app.delete('/api/experts/:id/slots/:slotId', async (req, res) => {
    try {
        const db = await getDb();
        const { id, slotId } = req.params;

        await db.run('DELETE FROM voter_responses WHERE slotId = ?', [slotId]);
        await db.run('DELETE FROM polling_slots WHERE id = ?', [slotId]);

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Verify/Set voter password
app.post('/api/experts/:id/verify-password', async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        const { voterName, password } = req.body;

        const existing = await db.get('SELECT password FROM voter_passwords WHERE expertId = ? AND voterName = ?', [id, voterName]);

        if (existing) {
            if (existing.password === password) {
                res.json({ success: true });
            } else {
                res.json({ success: false, message: '비밀번호가 일치하지 않습니다.' });
            }
        } else {
            await db.run('INSERT INTO voter_passwords (expertId, voterName, password) VALUES (?, ?, ?)', [id, voterName, password]);
            res.json({ success: true, isNew: true });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Submit member votes
app.post('/api/experts/:id/vote', async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        const { voterName, selectedSlotIds } = req.body;

        // Check status
        const expert = await db.get('SELECT status FROM experts WHERE id = ?', [id]);
        if (expert.status === 'confirmed' || expert.status === 'registered') {
            return res.status(400).json({ error: '투표가 마감되었습니다.' });
        }

        // Transaction manually
        await db.run('BEGIN TRANSACTION');

        // Remove old votes for this voter
        await db.run('DELETE FROM voter_responses WHERE expertId = ? AND voterName = ?', [id, voterName]);

        // Add new votes
        for (let slotId of selectedSlotIds) {
            await db.run('INSERT INTO voter_responses (expertId, voterName, slotId) VALUES (?, ?, ?)', [id, voterName, slotId]);
        }

        await db.run('COMMIT');

        res.json({ success: true });
    } catch (error) {
        await db.run('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Start polling
app.post('/api/experts/:id/start-polling', async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        await db.run('UPDATE experts SET status = ? WHERE id = ?', ['polling', id]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Confirm slots
app.post('/api/experts/:id/confirm', async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        const { slotIds } = req.body;

        console.log('[Confirm] expertId:', id, 'slotIds:', slotIds);

        if (!slotIds || slotIds.length === 0) {
            return res.status(400).json({ error: '선택된 슬롯이 없습니다.' });
        }

        // Get full slot data (id, date, time) for confirmed slots
        const slots = await db.all(
            `SELECT id, date, time FROM polling_slots WHERE expertId = ? AND id IN (${slotIds.map(() => '?').join(',')})`,
            [id, ...slotIds]
        );

        console.log('[Confirm] Found slots:', slots);

        await db.run(
            'UPDATE experts SET status = ?, confirmed_slots = ? WHERE id = ?',
            ['confirmed', JSON.stringify(slots), id]
        );

        console.log('[Confirm] Updated expert with confirmed_slots:', JSON.stringify(slots));

        res.json({ success: true, confirmedSlots: slots });
    } catch (error) {
        console.error('[Confirm] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Reset confirmation (일정 변경 - 확정 취소)
app.post('/api/experts/:id/reset-confirmation', async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;

        // Reset status to 'polling' and clear confirmed_slots and selected_slot
        await db.run(
            'UPDATE experts SET status = ?, confirmed_slots = NULL, selected_slot = NULL WHERE id = ?',
            ['polling', id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Select expert slot
app.post('/api/experts/:id/select-slot', async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        const { slot } = req.body;

        const acceptedAt = new Date().toISOString();

        await db.run(
            'UPDATE experts SET status = ?, selected_slot = ?, accepted_at = ? WHERE id = ?',
            ['registered', JSON.stringify(slot), acceptedAt, id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Expert marks no available schedule
app.post('/api/experts/:id/no-available-schedule', async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;

        await db.run(
            'UPDATE experts SET status = ? WHERE id = ?',
            ['unavailable', id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
