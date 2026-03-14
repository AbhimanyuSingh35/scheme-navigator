// src/agents/conversationalProfileAgent.ts
// Conversational agent that chats with the user to collect their profile.
// Instead of requiring one big paragraph, it asks questions one at a time
// and builds the profile progressively across multiple turns.

import { AgentBuilder } from "@iqai/adk";
import { z } from "zod";
import { UserProfileSchema, type UserProfile } from "./profileAgent.js";

// ── What we track per conversation ────────────────────────────────────────────
export interface ConversationState {
  conversationId: string;
  messages: Array<{ role: "user" | "agent"; text: string }>;
  collectedProfile: Partial<UserProfile>;
  isComplete: boolean;
  missingFields: string[];
}

// Fields we MUST have before considering profile complete
const REQUIRED_FIELDS: Array<keyof UserProfile> = [
  "occupation",
  "state",
  "annualIncome",
  "gender",
];

// In-memory store of ongoing conversations
const conversations = new Map<string, ConversationState>();

// ── Schema for agent's turn response ──────────────────────────────────────────
const AgentTurnSchema = z.object({
  reply: z
    .string()
    .describe("Your conversational reply to the user — ask ONE question or confirm details"),
  extractedData: z
    .object({
      occupation: z.string().optional(),
      annualIncome: z.number().optional(),
      state: z.string().optional(),
      age: z.number().optional(),
      gender: z.enum(["male", "female", "other", "unknown"]).optional(),
      hasBplCard: z.boolean().optional(),
      hasLand: z.boolean().optional(),
      isDisabled: z.boolean().optional(),
      category: z.string().optional(),
      specificNeeds: z.array(z.string()).optional(),
    })
    .describe("Any profile fields you could extract from the user's latest message"),
  isProfileComplete: z
    .boolean()
    .describe(
      "True only when you have: occupation, state, income, and gender. Other fields are bonus."
    ),
  missingFields: z
    .array(z.string())
    .describe("List of important fields still missing"),
});

type AgentTurn = z.infer<typeof AgentTurnSchema>;

// ── Create a new conversation ──────────────────────────────────────────────────
export function createConversation(): ConversationState {
  const conversationId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const state: ConversationState = {
    conversationId,
    messages: [],
    collectedProfile: {},
    isComplete: false,
    missingFields: [...REQUIRED_FIELDS],
  };
  conversations.set(conversationId, state);
  return state;
}

export function getConversation(conversationId: string): ConversationState | undefined {
  return conversations.get(conversationId);
}

// ── Process one user message, return agent reply ───────────────────────────────
export async function processConversationTurn(
  conversationId: string,
  userMessage: string
): Promise<{ reply: string; isComplete: boolean; profile?: UserProfile }> {
  let state = conversations.get(conversationId);
  if (!state) throw new Error(`Conversation ${conversationId} not found`);

  // Add user message to history
  state.messages.push({ role: "user", text: userMessage });

  // Build conversation history string for the agent
  const historyText = state.messages
    .map((m) => `${m.role === "user" ? "User" : "Agent"}: ${m.text}`)
    .join("\n");

  const collectedSoFar = JSON.stringify(state.collectedProfile, null, 2);

  // Ask the agent what to say next and what data to extract
  const turn = (await AgentBuilder.create("conversational_profile_agent")
    .withModel(process.env.LLM_MODEL ?? "gemini-2.5-flash")
    .withInstruction(`You are a friendly, helpful assistant for the Sarkar Sahayak app — an AI tool that helps Indian citizens find government schemes they qualify for.

Your job is to have a warm conversation to collect the user's profile. Be conversational, not like a form.

RULES:
- Ask only ONE question per reply — never multiple questions at once
- Be warm and encouraging. Use simple English (or mix Hindi words naturally like "aap", "theek hai")
- Start by asking their occupation/profession if not known
- Then ask their state
- Then ask their annual income (say "approximate is fine")
- Then ask gender (needed for women-specific schemes)
- Optional but valuable: age, BPL card, land ownership, caste category
- Once you have the 4 required fields, confirm with user and set isProfileComplete=true
- If user gives a Hindi/mixed response, understand it correctly
- Never ask for Aadhaar number, bank details, or passwords

INCOME UNDERSTANDING:
- "2 lakh" = 200000
- "monthly 15000" = 180000 per year
- "very poor" / "garib" = likely under 1 lakh, hasBplCard likely true

OCCUPATION CLUES:
- "kisan" / "kheti" = farmer
- "padhai" / "college" = student  
- "dukaan" / "shop" = small business owner`)
    .withOutputSchema(AgentTurnSchema)
    .ask(`Conversation so far:
${historyText}

Profile collected so far:
${collectedSoFar}

Missing fields: ${state.missingFields.join(", ")}

Based on the conversation, what should the agent say next? Extract any data from the latest user message.`)) as unknown as AgentTurn;

  // Merge extracted data into profile
  if (turn.extractedData) {
    state.collectedProfile = {
      ...state.collectedProfile,
      ...Object.fromEntries(
        Object.entries(turn.extractedData).filter(([, v]) => v !== undefined && v !== null)
      ),
    };
  }

  // Update missing fields
  state.missingFields = turn.missingFields;

  // Add agent reply to history
  state.messages.push({ role: "agent", text: turn.reply });

  // Check if complete
  state.isComplete = turn.isProfileComplete;
  conversations.set(conversationId, state);

  if (state.isComplete) {
    // Fill in defaults for optional fields
    const finalProfile: UserProfile = {
      occupation: state.collectedProfile.occupation ?? "unknown",
      annualIncome: state.collectedProfile.annualIncome ?? 0,
      state: state.collectedProfile.state ?? "unknown",
      age: state.collectedProfile.age ?? 0,
      gender: state.collectedProfile.gender ?? "unknown",
      hasBplCard: state.collectedProfile.hasBplCard ?? false,
      hasLand: state.collectedProfile.hasLand ?? false,
      isDisabled: state.collectedProfile.isDisabled ?? false,
      category: state.collectedProfile.category ?? "general",
      specificNeeds: state.collectedProfile.specificNeeds ?? [],
      summary: `${state.collectedProfile.occupation ?? "Citizen"} from ${state.collectedProfile.state ?? "India"}, income ₹${(state.collectedProfile.annualIncome ?? 0).toLocaleString("en-IN")}/year`,
    };
    return { reply: turn.reply, isComplete: true, profile: finalProfile };
  }

  return { reply: turn.reply, isComplete: false };
}
