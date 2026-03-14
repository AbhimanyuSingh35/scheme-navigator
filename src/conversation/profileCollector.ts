// src/conversation/profileCollector.ts
//
// Zero LLM calls during conversation.
// Just a simple question state machine — parses user answers with regex/keywords.
// LLM is only called ONCE at the very end to normalize the collected raw answers
// into a clean UserProfile before passing to the agents.

import { AgentBuilder } from "@iqai/adk";
import { UserProfileSchema, type UserProfile } from "../agents/profileAgent.js";

// ── Question definitions ───────────────────────────────────────────────────────

interface Question {
  key: string;
  ask: string;
  hint?: string;   // shown below input as helper text
  parse: (answer: string) => unknown;
  validate?: (parsed: unknown) => boolean;
  skip?: (collected: Partial<RawAnswers>) => boolean; // skip if condition is true
}

interface RawAnswers {
  occupation?: string;
  state?: string;
  income?: string;
  age?: string;
  gender?: string;
  bpl?: string;
  land?: string;
  category?: string;
}

const QUESTIONS: Question[] = [
  {
    key: "occupation",
    ask: "Namaste! 🙏 What is your occupation or profession?",
    hint: "e.g. farmer, student, shopkeeper, homemaker, daily wage worker",
    parse: (a) => a.trim().toLowerCase(),
    validate: (v) => (v as string).length > 1,
  },
  {
    key: "state",
    ask: "Which state are you from?",
    hint: "e.g. Himachal Pradesh, Uttar Pradesh, Karnataka, Rajasthan",
    parse: (a) => a.trim().toLowerCase(),
    validate: (v) => (v as string).length > 2,
  },
  {
    key: "income",
    ask: "What is your approximate annual family income?",
    hint: "e.g. 1.5 lakh, 80,000, 3 lakh per year — approximate is fine",
    parse: (a) => a.trim(),
    validate: (v) => (v as string).length > 0,
  },
  {
    key: "gender",
    ask: "What is your gender?",
    hint: "male / female / other",
    parse: (a) => {
      const l = a.toLowerCase();
      if (l.includes("female") || l.includes("woman") || l.includes("mahila") || l.includes("girl")) return "female";
      if (l.includes("male") || l.includes("man") || l.includes("boy") || l.includes("purush")) return "male";
      return "other";
    },
  },
  {
    key: "age",
    ask: "How old are you? (optional — helps find age-specific schemes)",
    hint: "e.g. 35 — or type 'skip' to continue",
    parse: (a) => {
      if (a.toLowerCase().includes("skip") || a.toLowerCase().includes("no")) return "0";
      const num = a.match(/\d+/);
      return num ? num[0] : "0";
    },
  },
  {
    key: "bpl",
    ask: "Do you have a BPL (Below Poverty Line) ration card?",
    hint: "yes / no",
    parse: (a) => {
      const l = a.toLowerCase();
      return l.includes("yes") || l.includes("haan") || l.includes("ha") || l.includes("hai") ? "yes" : "no";
    },
  },
  {
    key: "land",
    ask: "Do you own any agricultural land?",
    hint: "yes / no — relevant for farmer schemes",
    parse: (a) => {
      const l = a.toLowerCase();
      return l.includes("yes") || l.includes("haan") || l.includes("ha") || l.includes("hai") ? "yes" : "no";
    },
    skip: (collected) => {
      // Only ask if occupation suggests farming
      const occ = collected.occupation ?? "";
      return !occ.includes("farm") && !occ.includes("kisan") && !occ.includes("kheti") && !occ.includes("agri");
    },
  },
  {
    key: "category",
    ask: "What is your social category? (optional)",
    hint: "General / SC / ST / OBC / Minority — or type 'skip'",
    parse: (a) => {
      const l = a.toLowerCase();
      if (l.includes("skip") || l.includes("no") || l.includes("don")) return "general";
      if (l.includes("obc")) return "obc";
      if (l.includes("sc") && !l.includes("st")) return "sc";
      if (l.includes("st")) return "st";
      if (l.includes("minority") || l.includes("muslim") || l.includes("christian") || l.includes("sikh")) return "minority";
      if (l.includes("general") || l.includes("open") || l.includes("unreserved")) return "general";
      return l.trim() || "general";
    },
  },
];

// ── Session state ──────────────────────────────────────────────────────────────

export interface CollectorSession {
  sessionId: string;
  currentQuestionIndex: number;
  answers: RawAnswers;
  isComplete: boolean;
  profile?: UserProfile;
  messages: Array<{ role: "agent" | "user"; text: string }>;
}

const sessions = new Map<string, CollectorSession>();

// ── Create session ─────────────────────────────────────────────────────────────

export function createCollectorSession(): CollectorSession {
  const sessionId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const session: CollectorSession = {
    sessionId,
    currentQuestionIndex: 0,
    answers: {},
    isComplete: false,
    messages: [],
  };
  sessions.set(sessionId, session);
  return session;
}

export function getCollectorSession(sessionId: string): CollectorSession | undefined {
  return sessions.get(sessionId);
}

// Returns the first question to show user
export function getOpeningMessage(): string {
  return QUESTIONS[0].ask + (QUESTIONS[0].hint ? `\n\n💡 ${QUESTIONS[0].hint}` : "");
}

// ── Process one user answer ────────────────────────────────────────────────────

export async function processAnswer(
  sessionId: string,
  userAnswer: string
): Promise<{ reply: string; isComplete: boolean; profile?: UserProfile }> {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("Session not found");
  if (session.isComplete) throw new Error("Session already complete");

  // Record user message
  session.messages.push({ role: "user", text: userAnswer });

  // Get current question
  const currentQ = QUESTIONS[session.currentQuestionIndex];

  // Parse the answer
  const parsed = currentQ.parse(userAnswer);
  (session.answers as Record<string, unknown>)[currentQ.key] = parsed;

  // Advance to next non-skipped question
  let nextIndex = session.currentQuestionIndex + 1;
  while (nextIndex < QUESTIONS.length && QUESTIONS[nextIndex].skip?.(session.answers)) {
    nextIndex++;
  }
  session.currentQuestionIndex = nextIndex;

  // Check if we've asked all questions
  if (nextIndex >= QUESTIONS.length) {
    // ── All answers collected — ONE LLM call to normalize into UserProfile ──
    session.isComplete = true;
    const profile = await normalizeToProfile(session.answers);
    session.profile = profile;

    const reply = `Thank you! 🙏 I have everything I need.\n\nLet me now search for government schemes you are eligible for...`;
    session.messages.push({ role: "agent", text: reply });
    sessions.set(sessionId, session);

    return { reply, isComplete: true, profile };
  }

  // ── Ask the next question ──────────────────────────────────────────────────
  const nextQ = QUESTIONS[nextIndex];
  const reply = nextQ.ask + (nextQ.hint ? `\n\n💡 ${nextQ.hint}` : "");
  session.messages.push({ role: "agent", text: reply });
  sessions.set(sessionId, session);

  return { reply, isComplete: false };
}

// ── One LLM call at the end to normalize answers into UserProfile ─────────────

async function normalizeToProfile(answers: RawAnswers): Promise<UserProfile> {
  const raw = `
Occupation: ${answers.occupation}
State: ${answers.state}
Income stated: ${answers.income}
Age: ${answers.age}
Gender: ${answers.gender}
BPL card: ${answers.bpl}
Owns land: ${answers.land ?? "not asked"}
Category: ${answers.category ?? "not asked"}
`.trim();

  const profile = await AgentBuilder.create("profile_normalizer")
    .withModel(process.env.LLM_MODEL ?? "gemini-2.5-flash")
    .withInstruction(`You normalize raw user answers into a structured profile for finding Indian government schemes.

INCOME PARSING:
- "2 lakh" or "2L" = 200000
- "80,000" = 80000
- "monthly 15000" = 180000 (multiply by 12)
- "very poor" or "garib" = 80000
- "1.5 lakh" = 150000

STATE: normalize to full lowercase state name e.g. "hp" → "himachal pradesh", "up" → "uttar pradesh"

OCCUPATION: normalize to simple lowercase word e.g. "main kisan hoon" → "farmer"

Always fill all fields — use sensible defaults for anything unclear.`)
    .withOutputSchema(UserProfileSchema)
    .ask(`Normalize these raw answers into a UserProfile:\n\n${raw}`) as unknown as UserProfile;

  return profile;
}
