import type { D1Database } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  GODGOD_PASSWORD: string;
  TOKEN_SECRET: string;
  CORS_ORIGIN: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  password: string;
  created_at: string;
  contact_email?: string;
  contact_phone?: string;
  organization?: string;
  sender_name?: string;
  expertCount?: number;
}

export interface Expert {
  id: string;
  workspace_id: string;
  name: string;
  organization?: string;
  position?: string;
  email?: string;
  phone?: string;
  fee?: string;
  status: 'none' | 'polling' | 'confirmed' | 'registered' | 'unavailable';
  password?: string;
  selected_slot?: string;
  confirmed_slots?: string;
  created_at: string;
  pollingSlots?: PollingSlot[];
  selectedSlot?: PollingSlot;
  confirmedSlots?: PollingSlot[];
  voterPasswords?: Record<string, string>;
}

export interface PollingSlot {
  id: string;
  expertId: string;
  date: string;
  time: string;
  votes: number;
  voters?: string[];
}

export interface VoterResponse {
  expertId: string;
  voterName: string;
  slotId: string;
}

export interface VoterPassword {
  expertId: string;
  voterName: string;
  password: string;
}

export interface WorkspaceRequest {
  id: string;
  name: string;
  slug: string;
  password: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  organization?: string;
  sender_name?: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  processed_at?: string;
  processed_by?: string;
}

export interface TokenPayload {
  type: 'godgod' | 'workspace';
  exp: number;
  workspaceId?: string;
  slug?: string;
}
