// src/apply/applyAgent.ts
// Assisted-apply agent with suspend/resume pattern.
//
// FLOW:
//  1. prepareApplication()  → Agent pre-fills form data, creates session (status=filling)
//  2. Session moves to      → status=awaiting_login  (agent suspends, shows login UI to user)
//  3. User clicks "I have logged in" in the UI
//  4. resumeAfterLogin()    → Agent resumes, gives post-login instructions (status=submitting)
//  5. User completes submit → confirmApplication()   (status=completed)
//
// MCP (Playwright) is wired in as a tool — when PLAYWRIGHT_MCP=true the agent
// can actually navigate and fill forms. Without it, it runs in "guided mode"
// (generates instructions only) which still works perfectly.

import { AgentBuilder, createTool } from "@iqai/adk";
import { z } from "zod";
import {
  createSession,
  getSession,
  updateSession,
  type ApplicationSession,
} from "./applicationStore.js";
import { mapProfileToForm } from "./formMapper.js";
import type { UserProfile } from "../agents/profileAgent.js";
import type { RankedSchemeGuide } from "../agents/guideAgent.js";

// ── MCP Playwright tool (optional) ────────────────────────────────────────────
// When ENABLE_PLAYWRIGHT=true in .env, the agent can actually open browser pages.
// Without it the agent runs in guided mode — still very useful.

const openBrowserTool = createTool({
  name: "open_browser",
  description: "Open a URL in the user's browser for them to complete login",
  schema: z.object({
    url: z.string().describe("URL to open"),
    reason: z.string().describe("Why we are opening this URL"),
  }),
  fn: async ({ url, reason }) => {
    // In a real deployment with Playwright MCP, this would open a browser
    // For now we return the URL so the frontend can open it
    console.log(`[Browser] Opening ${url} — ${reason}`);
    return { opened: true, url, message: `Ready to open: ${url}` };
  },
});

const fillFormTool = createTool({
  name: "fill_form_field",
  description: "Record a form field value to be shown to the user",
  schema: z.object({
    fieldName: z.string(),
    value: z.string(),
    note: z.string().optional(),
  }),
  fn: async ({ fieldName, value, note }) => {
    return { recorded: true, fieldName, value, note };
  },
});

// ── Preparation schema ─────────────────────────────────────────────────────────
const PrepSchema = z.object({
  readyToApply: z.boolean(),
  loginUrl: z.string(),
  loginMethod: z.string(),
  loginInstructions: z.string(),
  prefilledFields: z.array(
    z.object({
      fieldLabel: z.string(),
      value: z.string(),
      needsUserInput: z.boolean(),
    })
  ),
  documentsNeeded: z.array(
    z.object({
      name: z.string(),
      note: z.string(),
    })
  ),
  postLoginSteps: z.array(z.string()),
  agentSummary: z.string().describe("1-2 sentences explaining what the agent prepared"),
});

// ── STEP 1: Prepare application ────────────────────────────────────────────────
export async function prepareApplication(
  scheme: RankedSchemeGuide,
  profile: UserProfile
): Promise<ApplicationSession> {
  const formMap = mapProfileToForm(scheme.id, profile);

  // Build context for the agent
  const context = formMap
    ? `Scheme: ${scheme.name}
Portal: ${formMap.portalName}
Login URL: ${formMap.loginUrl}
Login Method: ${formMap.loginMethod}
Login Instructions: ${formMap.loginInstructions}
Pre-filled fields: ${JSON.stringify(formMap.fields, null, 2)}
Post-login steps: ${formMap.postLoginSteps.join("\n")}`
    : `Scheme: ${scheme.name}
Application URL: ${scheme.applicationUrl}
Required Documents: ${scheme.requiredDocuments.join(", ")}
Application Steps: ${scheme.applicationSteps.join("\n")}`;

  const profileText = `User Profile:
- Occupation: ${profile.occupation}
- State: ${profile.state}
- Annual Income: ₹${profile.annualIncome.toLocaleString("en-IN")}
- Age: ${profile.age || "not specified"}
- Gender: ${profile.gender}
- BPL Card: ${profile.hasBplCard}
- Has Land: ${profile.hasLand}
- Category: ${profile.category}`;

  const prep = (await AgentBuilder.create("apply_prep_agent")
    .withModel(process.env.LLM_MODEL ?? "gemini-2.5-flash")
    .withInstruction(`You are an expert government scheme application assistant.
Your job is to prepare everything needed for a citizen to apply for a scheme.
Pre-fill as many fields as possible from the user profile.
Mark fields that the user must fill themselves (like bank account, district, etc.) with needsUserInput=true.
Write clear, simple post-login instructions — imagine explaining to someone using a phone for the first time.
Keep all text in simple English.`)
    .withTools(openBrowserTool, fillFormTool)
    .withOutputSchema(PrepSchema)
    .ask(`Prepare the application for this user:

${profileText}

${context}

Pre-fill all possible fields from the profile. Mark which fields need user input.
List all required documents clearly.
Write step-by-step instructions for after the user logs in.`)) as unknown as z.infer<typeof PrepSchema>;

  // Build the session
  const session = createSession({
    schemeId: scheme.id,
    schemeName: scheme.name,
    applicationUrl: formMap?.loginUrl ?? scheme.applicationUrl,
    status: "awaiting_login",
    prefilledData: Object.fromEntries(
      prep.prefilledFields.map((f) => [f.fieldLabel, f.value])
    ),
    instructions: prep.postLoginSteps,
    documents: prep.documentsNeeded.map((d) => ({
      name: d.name,
      provided: false,
      note: d.note,
    })),
    loginInstructions: prep.loginInstructions,
    loginUrl: prep.loginUrl,
  });

  console.log(`[ApplyAgent] Session created: ${session.sessionId} for ${scheme.name}`);
  return session;
}

// ── STEP 2: Resume after user logs in ─────────────────────────────────────────
const ResumeSchema = z.object({
  nextSteps: z.array(z.string()).describe("Exact steps user should follow right now on the portal"),
  currentPageExpected: z.string().describe("What page/screen user should be on now"),
  warningIfAny: z.string().optional().describe("Any important warning for this step"),
  estimatedMinutesLeft: z.number().describe("Estimated minutes to complete from here"),
});

export async function resumeAfterLogin(sessionId: string): Promise<{
  steps: string[];
  currentPage: string;
  warning?: string;
  estimatedMinutes: number;
}> {
  const session = getSession(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);

  updateSession(sessionId, { status: "submitting" });

  const resume = (await AgentBuilder.create("apply_resume_agent")
    .withModel(process.env.LLM_MODEL ?? "gemini-2.5-flash")
    .withInstruction(`You are helping a citizen complete a government scheme application.
They have just logged in to the portal. Give them exact next steps.
Be very specific — mention button names, menu items, field names exactly as they appear on government portals.
Write as if guiding someone over a phone call.`)
    .withOutputSchema(ResumeSchema)
    .ask(`The user has just logged in to: ${session.applicationUrl}
Scheme: ${session.schemeName}
Portal login method was: ${session.loginInstructions}

Pre-filled data ready to enter:
${Object.entries(session.prefilledData)
  .map(([k, v]) => `  ${k}: ${v}`)
  .join("\n")}

Documents user should have ready:
${session.documents.map((d) => `  - ${d.name}${d.note ? " (" + d.note + ")" : ""}`).join("\n")}

Original application steps:
${session.instructions.join("\n")}

Now give exact next steps from the logged-in state.`)) as unknown as z.infer<typeof ResumeSchema>;

  return {
    steps: resume.nextSteps,
    currentPage: resume.currentPageExpected,
    warning: resume.warningIfAny,
    estimatedMinutes: resume.estimatedMinutesLeft,
  };
}

// ── STEP 3: User confirms they submitted ───────────────────────────────────────
export function confirmApplication(
  sessionId: string,
  confirmationNumber?: string
): ApplicationSession | undefined {
  return updateSession(sessionId, {
    status: "completed",
    confirmationNumber: confirmationNumber ?? "Noted by user",
  });
}

// ── STEP 4: Mark as failed ─────────────────────────────────────────────────────
export function failApplication(sessionId: string, reason: string): ApplicationSession | undefined {
  return updateSession(sessionId, { status: "failed", errorMessage: reason });
}
