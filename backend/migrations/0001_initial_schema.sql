-- Workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Experts table with workspace_id
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

-- Polling slots table
CREATE TABLE IF NOT EXISTS polling_slots (
    id TEXT PRIMARY KEY,
    expertId TEXT,
    date TEXT,
    time TEXT,
    votes INTEGER DEFAULT 0,
    FOREIGN KEY(expertId) REFERENCES experts(id)
);

-- Voter responses table
CREATE TABLE IF NOT EXISTS voter_responses (
    expertId TEXT,
    voterName TEXT,
    slotId TEXT,
    PRIMARY KEY(expertId, voterName, slotId),
    FOREIGN KEY(expertId) REFERENCES experts(id),
    FOREIGN KEY(slotId) REFERENCES polling_slots(id)
);

-- Voter passwords table
CREATE TABLE IF NOT EXISTS voter_passwords (
    expertId TEXT,
    voterName TEXT,
    password TEXT,
    PRIMARY KEY(expertId, voterName),
    FOREIGN KEY(expertId) REFERENCES experts(id)
);

-- Workspace requests table
CREATE TABLE IF NOT EXISTS workspace_requests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
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

-- Create default workspace
INSERT OR IGNORE INTO workspaces (id, name, slug, password)
VALUES ('default', 'Default Workspace', 'default', '0000');
