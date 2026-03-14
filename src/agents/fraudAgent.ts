// src/agents/fraudAgent.ts
// Agent 6: Detects and warns about fake/fraudulent scheme claims

import { AgentBuilder } from "@iqai/adk";
import { z } from "zod";
import { getAllSchemes } from "../data/schemes.js";

const FraudCheckSchema = z.object({
  isSuspicious: z.boolean(),
  warningMessage: z.string().optional(),
  verifiedSchemes: z.array(z.string()),
  tips: z.array(z.string()),
});

export interface FraudCheckResult {
  isSuspicious: boolean;
  warningMessage?: string;
  verifiedSchemes: string[];
  tips: string[];
}

export async function checkForFraud(
  userQuery: string
): Promise<FraudCheckResult> {
  const officialSchemes = getAllSchemes().map((s) => ({
    id: s.id,
    name: s.name,
    officialUrl: s.officialUrl,
  }));

  const result = (await AgentBuilder.create("fraud_detector")
    .withModel(process.env.LLM_MODEL ?? "gemini-2.5-flash")
    .withInstruction(`You are a fraud detection expert for Indian government schemes.
Detect suspicious patterns in user queries like:
- Mentions of "agents" charging fees to apply for free schemes
- Promises of instant approval without documents
- Unofficial phone numbers or WhatsApp contacts for government schemes  
- "Lucky draw" or "lottery" for government benefits
- Requests for OTP or UPI PIN "to verify eligibility"

All legitimate Indian government schemes are FREE to apply.
No agent should charge money. Aadhaar OTPs are only for biometric verification.

Provide safety tips relevant to the user's situation.`)
    .withOutputSchema(FraudCheckSchema)
    .ask(`Check this user query for fraud indicators: "${userQuery}"
Official schemes available: ${JSON.stringify(officialSchemes.slice(0, 10))}`) as unknown as FraudCheckResult);

  return result;
}
