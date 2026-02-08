-- Add settings columns to workspaces table
ALTER TABLE workspaces ADD COLUMN contact_email TEXT;
ALTER TABLE workspaces ADD COLUMN contact_phone TEXT;
ALTER TABLE workspaces ADD COLUMN organization TEXT;
ALTER TABLE workspaces ADD COLUMN sender_name TEXT;
