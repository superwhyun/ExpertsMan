const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { getDb } = require('./db');

const app = express();
const port = 3001;

// GodGod master password (set via environment variable or default)
const GODGOD_PASSWORD = process.env.GODGOD_PASSWORD || 'godgod123';
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'expertsmanSecretKey2024';

app.use(cors());
app.use(express.json());

// ============ Token Utilities ============

function generateToken(payload, expiresInHours = 24) {
    const data = {
        ...payload,
        exp: Date.now() + (expiresInHours * 60 * 60 * 1000)
    };
    const json = JSON.stringify(data);
    const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(json).digest('hex');
    return Buffer.from(json).toString('base64') + '.' + signature;
}

function verifyToken(token) {
    try {
        const [dataB64, signature] = token.split('.');
        const json = Buffer.from(dataB64, 'base64').toString('utf8');
        const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(json).digest('hex');
        if (signature !== expectedSig) return null;
        const data = JSON.parse(json);
        if (data.exp < Date.now()) return null;
        return data;
    } catch {
        return null;
    }
}

// ============ Middleware ============

// GodGod authentication middleware
const requireGodGod = (req, res, next) => {
    const token = req.headers['x-godgod-token'];
    if (!token) {
        return res.status(401).json({ error: 'GodGod 인증이 필요합니다.' });
    }
    const payload = verifyToken(token);
    if (!payload || payload.type !== 'godgod') {
        return res.status(401).json({ error: 'GodGod 토큰이 유효하지 않습니다.' });
    }
    next();
};

// Workspace validation middleware
const validateWorkspace = async (req, res, next) => {
    const { slug } = req.params;
    const db = await getDb();
    const workspace = await db.get('SELECT * FROM workspaces WHERE slug = ?', [slug]);
    if (!workspace) {
        return res.status(404).json({ error: '워크스페이스를 찾을 수 없습니다.' });
    }
    req.workspace = workspace;
    next();
};

// Workspace authentication middleware
const requireWorkspaceAuth = (req, res, next) => {
    const token = req.headers['x-workspace-token'];
    if (!token) {
        return res.status(401).json({ error: '워크스페이스 인증이 필요합니다.' });
    }
    const payload = verifyToken(token);
    if (!payload || payload.type !== 'workspace') {
        return res.status(401).json({ error: '워크스페이스 토큰이 유효하지 않습니다.' });
    }
    if (payload.slug !== req.params.slug) {
        return res.status(403).json({ error: '다른 워크스페이스에 대한 접근 권한이 없습니다.' });
    }
    next();
};

// ============ GodGod API ============

// GodGod authentication
app.post('/api/godgod/auth', (req, res) => {
    const { password } = req.body;
    if (password === GODGOD_PASSWORD) {
        const token = generateToken({ type: 'godgod' }, 1); // 1 hour
        res.json({ success: true, token });
    } else {
        res.status(401).json({ success: false, error: '비밀번호가 일치하지 않습니다.' });
    }
});

// Verify GodGod token
app.get('/api/godgod/verify', requireGodGod, (req, res) => {
    res.json({ valid: true });
});

// Get all workspaces
app.get('/api/godgod/workspaces', requireGodGod, async (req, res) => {
    try {
        const db = await getDb();
        const workspaces = await db.all('SELECT id, name, slug, created_at FROM workspaces');

        // Get expert count for each workspace
        for (let ws of workspaces) {
            const count = await db.get('SELECT COUNT(*) as count FROM experts WHERE workspace_id = ?', [ws.id]);
            ws.expertCount = count.count;
        }

        res.json(workspaces);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Create workspace
app.post('/api/godgod/workspaces', requireGodGod, async (req, res) => {
    try {
        const db = await getDb();
        const { name, slug, password } = req.body;

        if (!name || !slug || !password) {
            return res.status(400).json({ error: '이름, 슬러그, 비밀번호는 필수입니다.' });
        }

        // Check slug uniqueness
        const existing = await db.get('SELECT id FROM workspaces WHERE slug = ?', [slug]);
        if (existing) {
            return res.status(400).json({ error: '이미 사용 중인 슬러그입니다.' });
        }

        const id = crypto.randomUUID();
        await db.run(
            'INSERT INTO workspaces (id, name, slug, password) VALUES (?, ?, ?, ?)',
            [id, name, slug, password]
        );

        res.json({ success: true, id, slug });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Update workspace
app.put('/api/godgod/workspaces/:id', requireGodGod, async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        const { name, password } = req.body;

        const updates = [];
        const params = [];

        if (name) {
            updates.push('name = ?');
            params.push(name);
        }
        if (password) {
            updates.push('password = ?');
            params.push(password);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: '변경할 내용이 없습니다.' });
        }

        params.push(id);
        await db.run(`UPDATE workspaces SET ${updates.join(', ')} WHERE id = ?`, params);

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Delete workspace (cascade delete all related data)
app.delete('/api/godgod/workspaces/:id', requireGodGod, async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;

        // Get all experts in this workspace
        const experts = await db.all('SELECT id FROM experts WHERE workspace_id = ?', [id]);

        // Delete all related data for each expert
        for (let expert of experts) {
            await db.run('DELETE FROM voter_responses WHERE expertId = ?', [expert.id]);
            await db.run('DELETE FROM voter_passwords WHERE expertId = ?', [expert.id]);
            await db.run('DELETE FROM polling_slots WHERE expertId = ?', [expert.id]);
        }

        // Delete all experts in workspace
        await db.run('DELETE FROM experts WHERE workspace_id = ?', [id]);

        // Delete workspace
        await db.run('DELETE FROM workspaces WHERE id = ?', [id]);

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// ============ Workspace Authentication ============

// Get workspace info (public - just to check if workspace exists)
app.get('/api/workspaces/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const db = await getDb();
        const workspace = await db.get('SELECT id, name, slug FROM workspaces WHERE slug = ?', [slug]);

        if (!workspace) {
            return res.status(404).json({ error: '워크스페이스를 찾을 수 없습니다.' });
        }

        res.json(workspace);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Workspace login
app.post('/api/workspaces/:slug/auth', validateWorkspace, async (req, res) => {
    const { password } = req.body;

    if (password === req.workspace.password) {
        const token = generateToken({
            type: 'workspace',
            workspaceId: req.workspace.id,
            slug: req.workspace.slug
        }, 24); // 24 hours
        res.json({ success: true, token, workspace: { id: req.workspace.id, name: req.workspace.name, slug: req.workspace.slug } });
    } else {
        res.status(401).json({ success: false, error: '비밀번호가 일치하지 않습니다.' });
    }
});

// Verify workspace token
app.get('/api/workspaces/:slug/verify', validateWorkspace, requireWorkspaceAuth, (req, res) => {
    res.json({ valid: true, workspace: { id: req.workspace.id, name: req.workspace.name, slug: req.workspace.slug } });
});

// ============ Workspace-scoped Expert APIs ============

// Get all experts in workspace
app.get('/api/workspaces/:slug/experts', validateWorkspace, requireWorkspaceAuth, async (req, res) => {
    try {
        const db = await getDb();
        const experts = await db.all('SELECT * FROM experts WHERE workspace_id = ?', [req.workspace.id]);

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

// Get single expert (public - for form/poll pages)
app.get('/api/workspaces/:slug/experts/:id', validateWorkspace, async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;

        const expert = await db.get('SELECT * FROM experts WHERE id = ? AND workspace_id = ?', [id, req.workspace.id]);

        if (!expert) {
            return res.status(404).json({ error: '전문가를 찾을 수 없습니다.' });
        }

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

        res.json(expert);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Create/Update expert
app.post('/api/workspaces/:slug/experts', validateWorkspace, requireWorkspaceAuth, async (req, res) => {
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
                'INSERT INTO experts (id, workspace_id, name, organization, position, email, phone, fee, status, password, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [expert.id, req.workspace.id, expert.name, expert.organization, expert.position, expert.email, expert.phone, expert.fee, expert.status || 'none', expert.password, expert.createdAt || new Date().toISOString()]
            );
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Delete expert
app.delete('/api/workspaces/:slug/experts/:id', validateWorkspace, requireWorkspaceAuth, async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;

        await db.run('DELETE FROM voter_responses WHERE expertId = ?', [id]);
        await db.run('DELETE FROM voter_passwords WHERE expertId = ?', [id]);
        await db.run('DELETE FROM polling_slots WHERE expertId = ?', [id]);
        await db.run('DELETE FROM experts WHERE id = ? AND workspace_id = ?', [id, req.workspace.id]);

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Add polling slot
app.post('/api/workspaces/:slug/experts/:id/slots', validateWorkspace, requireWorkspaceAuth, async (req, res) => {
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
app.delete('/api/workspaces/:slug/experts/:id/slots/:slotId', validateWorkspace, requireWorkspaceAuth, async (req, res) => {
    try {
        const db = await getDb();
        const { slotId } = req.params;

        await db.run('DELETE FROM voter_responses WHERE slotId = ?', [slotId]);
        await db.run('DELETE FROM polling_slots WHERE id = ?', [slotId]);

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Verify/Set voter password (public - for poll page)
app.post('/api/workspaces/:slug/experts/:id/verify-password', validateWorkspace, async (req, res) => {
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

// Submit member votes (public - for poll page)
app.post('/api/workspaces/:slug/experts/:id/vote', validateWorkspace, async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        const { voterName, selectedSlotIds } = req.body;

        const expert = await db.get('SELECT status FROM experts WHERE id = ?', [id]);
        if (expert.status === 'confirmed' || expert.status === 'registered') {
            return res.status(400).json({ error: '투표가 마감되었습니다.' });
        }

        await db.run('BEGIN TRANSACTION');

        await db.run('DELETE FROM voter_responses WHERE expertId = ? AND voterName = ?', [id, voterName]);

        for (let slotId of selectedSlotIds) {
            await db.run('INSERT INTO voter_responses (expertId, voterName, slotId) VALUES (?, ?, ?)', [id, voterName, slotId]);
        }

        await db.run('COMMIT');

        res.json({ success: true });
    } catch (error) {
        const db = await getDb();
        await db.run('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Start polling
app.post('/api/workspaces/:slug/experts/:id/start-polling', validateWorkspace, requireWorkspaceAuth, async (req, res) => {
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
app.post('/api/workspaces/:slug/experts/:id/confirm', validateWorkspace, requireWorkspaceAuth, async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        const { slotIds } = req.body;

        if (!slotIds || slotIds.length === 0) {
            return res.status(400).json({ error: '선택된 슬롯이 없습니다.' });
        }

        const slots = await db.all(
            `SELECT id, date, time FROM polling_slots WHERE expertId = ? AND id IN (${slotIds.map(() => '?').join(',')})`,
            [id, ...slotIds]
        );

        await db.run(
            'UPDATE experts SET status = ?, confirmed_slots = ? WHERE id = ?',
            ['confirmed', JSON.stringify(slots), id]
        );

        res.json({ success: true, confirmedSlots: slots });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Reset confirmation
app.post('/api/workspaces/:slug/experts/:id/reset-confirmation', validateWorkspace, requireWorkspaceAuth, async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;

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

// Select expert slot (public - for expert form page)
app.post('/api/workspaces/:slug/experts/:id/select-slot', validateWorkspace, async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        const { slot } = req.body;

        if (!slot) {
            return res.status(400).json({ error: '슬롯 정보가 없습니다.' });
        }

        // Verify expert exists in this workspace
        const expert = await db.get('SELECT * FROM experts WHERE id = ? AND workspace_id = ?', [id, req.workspace.id]);
        if (!expert) {
            return res.status(404).json({ error: '전문가를 찾을 수 없습니다.' });
        }

        await db.run(
            'UPDATE experts SET status = ?, selected_slot = ? WHERE id = ? AND workspace_id = ?',
            ['registered', JSON.stringify(slot), id, req.workspace.id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('select-slot error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Expert marks no available schedule (public - for expert form page)
app.post('/api/workspaces/:slug/experts/:id/no-available-schedule', validateWorkspace, async (req, res) => {
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

// ============ Workspace Request APIs ============

// Create workspace request (public)
app.post('/api/workspace-requests', async (req, res) => {
    try {
        const db = await getDb();
        const { name, slug, password, contactName, contactEmail, contactPhone, organization, message } = req.body;

        if (!name || !slug || !password || !contactName || !contactEmail) {
            return res.status(400).json({ error: '필수 항목을 모두 입력해주세요.' });
        }

        // Check slug uniqueness in workspaces
        const existingWorkspace = await db.get('SELECT id FROM workspaces WHERE slug = ?', [slug]);
        if (existingWorkspace) {
            return res.status(400).json({ error: '이미 사용 중인 URL입니다.' });
        }

        // Check slug uniqueness in requests
        const existingRequest = await db.get('SELECT id FROM workspace_requests WHERE slug = ? AND status = ?', [slug, 'pending']);
        if (existingRequest) {
            return res.status(400).json({ error: '이미 신청 대기 중인 URL입니다.' });
        }

        const id = crypto.randomUUID();
        await db.run(
            'INSERT INTO workspace_requests (id, name, slug, password, contact_name, contact_email, contact_phone, organization, message, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, name, slug, password, contactName, contactEmail, contactPhone || '', organization || '', message || '', 'pending']
        );

        res.json({ success: true, id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Get all workspace requests (GodGod only)
app.get('/api/godgod/workspace-requests', requireGodGod, async (req, res) => {
    try {
        const db = await getDb();
        const requests = await db.all('SELECT * FROM workspace_requests ORDER BY created_at DESC');
        res.json(requests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Approve workspace request (GodGod only)
app.post('/api/godgod/workspace-requests/:id/approve', requireGodGod, async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;

        const request = await db.get('SELECT * FROM workspace_requests WHERE id = ?', [id]);
        if (!request) {
            return res.status(404).json({ error: '신청을 찾을 수 없습니다.' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ error: '이미 처리된 신청입니다.' });
        }

        // Create workspace
        const workspaceId = crypto.randomUUID();
        await db.run(
            'INSERT INTO workspaces (id, name, slug, password) VALUES (?, ?, ?, ?)',
            [workspaceId, request.name, request.slug, request.password]
        );

        // Update request status
        await db.run(
            'UPDATE workspace_requests SET status = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['approved', id]
        );

        res.json({ success: true, workspaceId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Reject workspace request (GodGod only)
app.post('/api/godgod/workspace-requests/:id/reject', requireGodGod, async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;

        const request = await db.get('SELECT * FROM workspace_requests WHERE id = ?', [id]);
        if (!request) {
            return res.status(404).json({ error: '신청을 찾을 수 없습니다.' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ error: '이미 처리된 신청입니다.' });
        }

        await db.run(
            'UPDATE workspace_requests SET status = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['rejected', id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Delete workspace request (GodGod only)
app.delete('/api/godgod/workspace-requests/:id', requireGodGod, async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        await db.run('DELETE FROM workspace_requests WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`GodGod password: ${GODGOD_PASSWORD}`);
});
