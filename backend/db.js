const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

let db;

async function initDb() {
    db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    // Create workspaces table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS workspaces (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Create experts table with workspace_id
    await db.exec(`
        CREATE TABLE IF NOT EXISTS experts (
            id TEXT PRIMARY KEY,
            workspace_id TEXT,
            name TEXT NOT NULL,
            organization TEXT,
            position TEXT,
            email TEXT,
            phone TEXT,
            fee TEXT,
            status TEXT DEFAULT 'none',
            password TEXT,
            selected_slot TEXT,
            confirmed_slots TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
        );

        CREATE TABLE IF NOT EXISTS polling_slots (
            id TEXT PRIMARY KEY,
            expertId TEXT,
            date TEXT,
            time TEXT,
            votes INTEGER DEFAULT 0,
            FOREIGN KEY(expertId) REFERENCES experts(id)
        );

        CREATE TABLE IF NOT EXISTS voter_responses (
            expertId TEXT,
            voterName TEXT,
            slotId TEXT,
            PRIMARY KEY(expertId, voterName, slotId),
            FOREIGN KEY(expertId) REFERENCES experts(id),
            FOREIGN KEY(slotId) REFERENCES polling_slots(id)
        );

        CREATE TABLE IF NOT EXISTS voter_passwords (
            expertId TEXT,
            voterName TEXT,
            password TEXT,
            PRIMARY KEY(expertId, voterName),
            FOREIGN KEY(expertId) REFERENCES experts(id)
        );
    `);

    // Migration: Add workspace_id column if not exists (for existing databases)
    try {
        await db.exec(`ALTER TABLE experts ADD COLUMN workspace_id TEXT REFERENCES workspaces(id)`);
        console.log('Migration: Added workspace_id column to experts');
    } catch (e) {
        // Column already exists, ignore
    }

    // Migration: Create default workspace and assign existing experts
    const defaultWorkspace = await db.get('SELECT id FROM workspaces WHERE slug = ?', ['default']);
    if (!defaultWorkspace) {
        await db.run(
            'INSERT INTO workspaces (id, name, slug, password) VALUES (?, ?, ?, ?)',
            ['default', 'Default Workspace', 'default', '0000']
        );
        await db.run('UPDATE experts SET workspace_id = ? WHERE workspace_id IS NULL', ['default']);
        console.log('Migration: Created default workspace and assigned existing experts');
    }

    // Create workspace_requests table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS workspace_requests (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            contact_name TEXT NOT NULL,
            contact_email TEXT NOT NULL,
            contact_phone TEXT,
            organization TEXT,
            message TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            processed_at DATETIME,
            processed_by TEXT
        );
    `);

    console.log('Database initialized');
    return db;
}

async function getDb() {
    if (!db) {
        await initDb();
    }
    return db;
}

module.exports = { getDb };
