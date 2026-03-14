// src/orchestrator.ts
// Orchestrates all agents using ADK-TS SequentialAgent pattern

import { extractUserProfile } from "./agents/profileAgent.js";
import { discoverEligibleSchemes } from "./agents/discoveryAgent.js";
import { generateApplicationGuide } from "./agents/guideAgent.js";
import { checkForFraud } from "./agents/fraudAgent.js";
import type { UserProfile } from "./agents/profileAgent.js";
import type { FinalGuideResult } from "./agents/guideAgent.js";
import type { FraudCheckResult } from "./agents/fraudAgent.js";

export interface AgentProgress {
  step: string;
  status: "running" | "done" | "error";
  message?: string;
}

export interface NavigatorResult {
  profile: UserProfile;
  guide: FinalGuideResult;
  fraud: FraudCheckResult;
  processingTime: number;
  agentSteps: AgentProgress[];
}

export async function runSchemeNavigator(
  userInput: string,
  onProgress?: (step: AgentProgress) => void
): Promise<NavigatorResult> {
  const startTime = Date.now();
  const steps: AgentProgress[] = [];

  const progress = (step: string, status: AgentProgress["status"], message?: string) => {
    const s: AgentProgress = { step, status, message };
    steps.push(s);
    onProgress?.(s);
    if (status !== "error") {
      console.log(`[${status.toUpperCase()}] ${step}${message ? ": " + message : ""}`);
    }
  };

  // ── Step 1: Profile Extraction ─────────────────────────────────────────────
  progress("Profile Understanding Agent", "running", "Analyzing your information...");
  const profile = await extractUserProfile(userInput);
  progress("Profile Understanding Agent", "done", `Detected: ${profile.occupation} from ${profile.state}`);

  // ── Step 2: Scheme Discovery + Eligibility ─────────────────────────────────
  progress("Scheme Discovery & Eligibility Agent", "running", "Searching 15+ schemes...");
  const discoveryResult = await discoverEligibleSchemes(profile);
  progress(
    "Scheme Discovery & Eligibility Agent",
    "done",
    `Found ${discoveryResult.totalFound} eligible schemes`
  );

  // ── Step 3: Benefit Ranking + Application Guide ───────────────────────────
  progress("Benefit Ranking & Application Guide Agent", "running", "Creating personalized guide...");
  const guide = await generateApplicationGuide(profile, discoveryResult.eligibleSchemes);
  progress(
    "Benefit Ranking & Application Guide Agent",
    "done",
    `Ranked ${guide.rankedSchemes.length} schemes`
  );

  // ── Step 4: Fraud Check ───────────────────────────────────────────────────
  progress("Fraud Detection Agent", "running", "Verifying scheme authenticity...");
  const fraud = await checkForFraud(userInput);
  progress("Fraud Detection Agent", "done", fraud.isSuspicious ? "⚠️ Warning detected!" : "All clear ✓");

  return {
    profile,
    guide,
    fraud,
    processingTime: Date.now() - startTime,
    agentSteps: steps,
  };
}
