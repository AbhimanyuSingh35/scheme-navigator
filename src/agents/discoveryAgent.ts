// src/agents/discoveryAgent.ts
// Agent 2 & 3: Discover relevant schemes and check eligibility

import { AgentBuilder, createTool } from "@iqai/adk";
import { z } from "zod";
import { searchSchemes, getAllSchemes, type Scheme } from "../data/schemes.js";
import type { UserProfile } from "./profileAgent.js";

// Tool: Search schemes from local dataset
const searchSchemesTool = createTool({
  name: "search_schemes",
  description: "Search government schemes based on user's state, occupation, income, age and gender",
  schema: z.object({
    state: z.string().describe("User's state in lowercase"),
    occupation: z.string().describe("User's occupation"),
    income: z.number().describe("Annual income in rupees"),
    age: z.number().describe("Age in years"),
    gender: z.string().describe("Gender: male/female/other/unknown"),
  }),
  fn: async ({ state, occupation, income, age }) => {
    const results = searchSchemes({
      state: state !== "unknown" ? state : undefined,
      occupation,
      income: income > 0 ? income : undefined,
      age: age > 0 ? age : undefined,
    });

    return {
      totalFound: results.length,
      schemes: results.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        state: s.state ?? "All India",
        targetAudience: s.targetAudience,
        eligibility: s.eligibility,
        benefits: s.benefits,
        benefitAmount: s.benefitAmount,
        category: s.category,
      })),
    };
  },
});

// Tool: Get full details of specific scheme
const getSchemeDetailsTool = createTool({
  name: "get_scheme_details",
  description: "Get full details, required documents, and application steps for a specific scheme",
  schema: z.object({
    schemeId: z.string().describe("Scheme ID"),
  }),
  fn: async ({ schemeId }) => {
    const all = getAllSchemes();
    const scheme = all.find((s) => s.id === schemeId);
    if (!scheme) return { error: "Scheme not found" };
    return scheme;
  },
});

export interface EligibleScheme {
  id: string;
  name: string;
  type: "central" | "state";
  ministry: string;
  benefits: string;
  benefitAmount?: string;
  requiredDocuments: string[];
  applicationSteps: string[];
  applicationUrl: string;
  officialUrl: string;
  category: string[];
  relevanceScore: number;
  relevanceReason: string;
}

export interface DiscoveryResult {
  eligibleSchemes: EligibleScheme[];
  summary: string;
  totalFound: number;
}

const DiscoveryResultSchema = z.object({
  eligibleSchemes: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(["central", "state"]),
      ministry: z.string(),
      benefits: z.string(),
      benefitAmount: z.string().optional(),
      requiredDocuments: z.array(z.string()),
      applicationSteps: z.array(z.string()),
      applicationUrl: z.string(),
      officialUrl: z.string(),
      category: z.array(z.string()),
      relevanceScore: z.number().min(1).max(10).describe("Relevance score 1-10"),
      relevanceReason: z.string().describe("1 sentence explaining why this scheme is relevant"),
    })
  ),
  summary: z.string().describe("Brief summary of what was found"),
  totalFound: z.number(),
});

export async function discoverEligibleSchemes(
  profile: UserProfile
): Promise<DiscoveryResult> {
  const profileContext = `
User Profile:
- Occupation: ${profile.occupation}
- Annual Income: ₹${profile.annualIncome.toLocaleString("en-IN")}
- State: ${profile.state}
- Age: ${profile.age > 0 ? profile.age : "Not specified"}
- Gender: ${profile.gender}
- BPL Card: ${profile.hasBplCard ? "Yes" : "No"}
- Owns Land: ${profile.hasLand ? "Yes" : "No"}
- Social Category: ${profile.category}
- Specific Needs: ${profile.specificNeeds.join(", ") || "None specified"}
`;

  const { runner } = await AgentBuilder.create("scheme_discovery_and_eligibility")
    .withModel(process.env.LLM_MODEL ?? "gemini-2.5-flash")
    .withInstruction(`You are an expert on Indian government schemes. Your job is to:
1. Search for relevant schemes using the search_schemes tool
2. Get full details using get_scheme_details for the most relevant ones
3. Carefully check eligibility rules against the user profile
4. Return only schemes the user is GENUINELY eligible for
5. Rank them by relevance and potential benefit (score 1-10)

Be accurate — do not include schemes where the user clearly doesn't qualify.
Prioritize high-impact schemes (cash benefits, health cover, education).`)
    .withTools(searchSchemesTool, getSchemeDetailsTool)
    .withOutputSchema(DiscoveryResultSchema)
    .withQuickSession({ state: {} })
    .build();

  const result = (await runner.ask(
    `Find and check eligibility for government schemes for this user:\n${profileContext}`
  )) as unknown as DiscoveryResult;

  return result;
}
