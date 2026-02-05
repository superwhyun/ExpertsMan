const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

let db;

async function initDb() {
    db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS experts (
            id TEXT PRIMARY KEY,
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
            accepted_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
