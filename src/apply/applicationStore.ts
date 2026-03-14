// src/apply/applicationStore.ts
// In-memory store tracking every assisted-apply session.
// Each session goes through these states:
//
//  created → filling → awaiting_login → user_logged_in → submitting → completed | failed

export type ApplicationStatus =
  | "created"
  | "filling"
  | "awaiting_login"      // Agent paused — waiting for user to log in
  | "user_logged_in"      // User signalled they have logged in → resume
  | "submitting"
  | "completed"
  | "failed";

export interface DocumentUpload {
  name: string;           // e.g. "Aadhaar card"
  provided: boolean;
  note?: string;          // e.g. "scan front side"
}

export interface ApplicationSession {
  sessionId: string;
  schemeId: string;
  schemeName: string;
  applicationUrl: string;
  status: ApplicationStatus;
  createdAt: Date;
  updatedAt: Date;

  // What the agent pre-filled before pausing
  prefilledData: Record<string, string>;
  instructions: string[];       // Step-by-step for user after login
  documents: DocumentUpload[];

  // Set when status = awaiting_login
  loginInstructions?: string;   // e.g. "Enter Aadhaar + OTP on the login page"
  loginUrl?: string;

  // Set when status = completed
  confirmationNumber?: string;
  confirmationScreenshot?: string;  // base64 or URL

  // Set when status = failed
  errorMessage?: string;
}

// Simple in-memory map. In production replace with SQLite/PostgreSQL.
const store = new Map<string, ApplicationSession>();

export function createSession(data: Omit<ApplicationSession, "sessionId" | "createdAt" | "updatedAt">): ApplicationSession {
  const sessionId = `apply_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const session: ApplicationSession = {
    ...data,
    sessionId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  store.set(sessionId, session);
  return session;
}

export function getSession(sessionId: string): ApplicationSession | undefined {
  return store.get(sessionId);
}

export function updateSession(sessionId: string, patch: Partial<ApplicationSession>): ApplicationSession | undefined {
  const existing = store.get(sessionId);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch, updatedAt: new Date() };
  store.set(sessionId, updated);
  return updated;
}

export function getAllSessions(): ApplicationSession[] {
  return Array.from(store.values());
}

export function getSessionsByStatus(status: ApplicationStatus): ApplicationSession[] {
  return Array.from(store.values()).filter(s => s.status === status);
}
