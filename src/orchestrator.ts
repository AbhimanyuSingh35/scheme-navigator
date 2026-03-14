// src/orchestrator.ts

import { extractUserProfile } from "./agents/profileAgent.js";
import { discoverEligibleSchemes } from "./agents/discoveryAgent.js";
import { generateApplicationGuide } from "./agents/guideAgent.js";
import { checkForFraud } from "./agents/fraudAgent.js";
import {
  createCollectorSession,
  getCollectorSession,
  processAnswer,
  getOpeningMessage,
  type CollectorSession,
} from "./conversation/profileCollector.js";
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

// ── One-shot flow (Quick Search tab) ──────────────────────────────────────────
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
    console.log(`[${status.toUpperCase()}] ${step}${message ? ": " + message : ""}`);
  };

  progress("Profile Understanding Agent", "running", "Analyzing your information...");
  const profile = await extractUserProfile(userInput);
  progress("Profile Understanding Agent", "done", `Detected: ${profile.occupation} from ${profile.state}`);

  progress("Scheme Discovery & Eligibility Agent", "running", "Searching schemes...");
  const discoveryResult = await discoverEligibleSchemes(profile);
  progress("Scheme Discovery & Eligibility Agent", "done", `Found ${discoveryResult.totalFound} eligible schemes`);

  progress("Benefit Ranking & Application Guide Agent", "running", "Creating personalized guide...");
  const guide = await generateApplicationGuide(profile, discoveryResult.eligibleSchemes);
  progress("Benefit Ranking & Application Guide Agent", "done", `Ranked ${guide.rankedSchemes.length} schemes`);

  progress("Fraud Detection Agent", "running", "Verifying scheme authenticity...");
  const fraud = await checkForFraud(userInput);
  progress("Fraud Detection Agent", "done", fraud.isSuspicious ? "⚠️ Warning!" : "All clear ✓");

  return { profile, guide, fraud, processingTime: Date.now() - startTime, agentSteps: steps };
}

// ── Chat flow (Chat tab) ───────────────────────────────────────────────────────

export function startNewConversation(): { sessionId: string; openingMessage: string } {
  const session = createCollectorSession();
  return {
    sessionId: session.sessionId,
    openingMessage: getOpeningMessage(),
  };
}

export function getExistingConversation(sessionId: string): CollectorSession | undefined {
  return getCollectorSession(sessionId);
}

export async function handleConversationTurn(
  sessionId: string,
  userMessage: string
): Promise<{ reply: string; isComplete: boolean; result?: NavigatorResult }> {

  const turn = await processAnswer(sessionId, userMessage);

  if (!turn.isComplete || !turn.profile) {
    return { reply: turn.reply, isComplete: false };
  }

  // Profile complete — run the 3 agents (discovery + guide + fraud) in sequence
  const profile = turn.profile;

  const discoveryResult = await discoverEligibleSchemes(profile);
  const guide = await generateApplicationGuide(profile, discoveryResult.eligibleSchemes);
  const fraud = await checkForFraud(
    `${profile.occupation} from ${profile.state} income ${profile.annualIncome}`
  );

  const result: NavigatorResult = {
    profile,
    guide,
    fraud,
    processingTime: 0,
    agentSteps: [],
  };

  return { reply: turn.reply, isComplete: true, result };
}
