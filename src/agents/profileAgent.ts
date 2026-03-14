// src/agents/profileAgent.ts
// Agent 1: Extracts structured user profile from natural language input

import { AgentBuilder } from "@iqai/adk";
import { z } from "zod";

export const UserProfileSchema = z.object({
  occupation: z
    .string()
    .describe(
      "User's occupation e.g. farmer, student, entrepreneur, homemaker, employed, unemployed, retired, daily wage worker"
    ),
  annualIncome: z
    .number()
    .describe("Annual income in rupees. Use 0 if not mentioned or unknown."),
  state: z
    .string()
    .describe(
      "Indian state name in lowercase e.g. 'himachal pradesh', 'uttar pradesh'. Use 'unknown' if not mentioned."
    ),
  age: z.number().describe("Age in years. Use 0 if not mentioned."),
  gender: z.enum(["male", "female", "other", "unknown"]),
  hasBplCard: z
    .boolean()
    .describe("Whether user has Below Poverty Line (BPL) card"),
  hasLand: z
    .boolean()
    .describe("Whether user owns agricultural land"),
  isDisabled: z.boolean().describe("Whether user has any disability"),
  category: z
    .string()
    .describe(
      "Social category: general, sc, st, obc, minority, unknown"
    ),
  specificNeeds: z
    .array(z.string())
    .describe(
      "Specific needs or goals mentioned by user e.g. ['housing', 'crop insurance', 'education loan', 'business loan']"
    ),
  summary: z
    .string()
    .describe("1-2 sentence summary of the user profile for display"),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export async function extractUserProfile(userText: string): Promise<UserProfile> {
  const profile = await AgentBuilder.create("profile_extractor")
    .withInstruction(`You are an expert at understanding Indian citizens and extracting structured profile information from their descriptions.

Extract the user's profile from their message. Be smart about inferring details:
- A "chhota kisan" or "small farmer" means occupation=farmer, hasLand=true
- "garib" or "poor" suggests BPL card might be applicable
- Student in college likely means age 17-25
- "mahila" or "woman" means gender=female
- Mentions of Himachal, HP = state is himachal pradesh
- Annual income: if monthly mentioned, multiply by 12
- If they say "2 lakh" income, that means 200000

Always be helpful and make reasonable inferences. If something truly cannot be determined, use sensible defaults.`)
    .withModel(process.env.LLM_MODEL ?? "gemini-2.5-flash")
    .withOutputSchema(UserProfileSchema)
    .ask(userText) as unknown as UserProfile;

  return profile;
}
