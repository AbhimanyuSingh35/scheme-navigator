// src/agents/guideAgent.ts
// Agent 4 & 5: Ranks schemes by impact and generates application guidance

import { AgentBuilder } from "@iqai/adk";
import { z } from "zod";
import type { EligibleScheme } from "./discoveryAgent.js";
import type { UserProfile } from "./profileAgent.js";

export interface RankedSchemeGuide {
  id: string;
  rank: number;
  name: string;
  type: "central" | "state";
  ministry: string;
  benefits: string;
  benefitAmount?: string;
  category: string[];
  applicationUrl: string;
  officialUrl: string;
  impactSummary: string;         // Why this ranks highly for the user
  quickTip: string;              // Actionable first step
  requiredDocuments: string[];
  applicationSteps: string[];
  estimatedTime: string;         // e.g. "1-2 weeks", "Same day"
  difficultyLevel: "easy" | "medium" | "hard";
}

export interface FinalGuideResult {
  rankedSchemes: RankedSchemeGuide[];
  topPriorityMessage: string;   // Motivational message about top scheme
  languageHint: string;         // "Also available in Hindi at ..."
}

const FinalGuideResultSchema = z.object({
  rankedSchemes: z.array(
    z.object({
      id: z.string(),
      rank: z.number(),
      name: z.string(),
      type: z.enum(["central", "state"]),
      ministry: z.string(),
      benefits: z.string(),
      benefitAmount: z.string().optional(),
      category: z.array(z.string()),
      applicationUrl: z.string(),
      officialUrl: z.string(),
      impactSummary: z.string().describe("2-3 sentences on why this is valuable for this specific user"),
      quickTip: z.string().describe("The #1 most important thing to do first"),
      requiredDocuments: z.array(z.string()),
      applicationSteps: z.array(z.string()),
      estimatedTime: z.string().describe("How long application takes e.g. '1-2 weeks'"),
      difficultyLevel: z.enum(["easy", "medium", "hard"]).describe("How easy it is to apply"),
    })
  ),
  topPriorityMessage: z.string().describe("Encouraging message highlighting the best opportunity"),
  languageHint: z.string().describe("Note about applying in Hindi or regional language"),
});

export async function generateApplicationGuide(
  profile: UserProfile,
  eligibleSchemes: EligibleScheme[]
): Promise<FinalGuideResult> {
  if (eligibleSchemes.length === 0) {
    return {
      rankedSchemes: [],
      topPriorityMessage:
        "Based on the information provided, we couldn't find matching schemes. Try providing more details like your state, income, and occupation.",
      languageHint: "आप हिंदी में जानकारी भी पा सकते हैं।",
    };
  }

  const schemesJson = JSON.stringify(
    eligibleSchemes.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      ministry: s.ministry,
      benefits: s.benefits,
      benefitAmount: s.benefitAmount,
      category: s.category,
      applicationUrl: s.applicationUrl,
      officialUrl: s.officialUrl,
      requiredDocuments: s.requiredDocuments,
      applicationSteps: s.applicationSteps,
      relevanceScore: s.relevanceScore,
      relevanceReason: s.relevanceReason,
    })),
    null,
    2
  );

  const profileSummary = `
User: ${profile.occupation}, ${profile.state}, income ₹${profile.annualIncome.toLocaleString("en-IN")}, 
age ${profile.age || "unknown"}, gender: ${profile.gender}, BPL: ${profile.hasBplCard}, 
needs: ${profile.specificNeeds.join(", ") || "general"}
`;

  const result = (await AgentBuilder.create("application_guide")
    .withModel(process.env.LLM_MODEL ?? "gemini-2.5-flash")
    .withInstruction(`You are a caring government scheme advisor helping Indian citizens.
Your job is to rank schemes by real-world impact and create clear, actionable application guides.

Ranking criteria:
1. Highest monetary benefit first
2. Ease of application
3. Urgency (some have annual deadlines)
4. Specific relevance to user's stated needs

Make application steps crystal clear — imagine explaining to someone with no internet experience.
Include exact URLs, office names, and document names.
Keep language simple — this may be translated to Hindi.`)
    .withOutputSchema(FinalGuideResultSchema)
    .ask(`Rank and create application guides for this user:

User Profile: ${profileSummary}

Eligible Schemes (${eligibleSchemes.length} found):
${schemesJson}`) as unknown as FinalGuideResult);

  return result;
}
