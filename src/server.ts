// src/server.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import {
  runSchemeNavigator,
  startNewConversation,
  handleConversationTurn,
  getExistingConversation,
} from "./orchestrator.js";
import {
  prepareApplication,
  resumeAfterLogin,
  confirmApplication,
  failApplication,
} from "./apply/applyAgent.js";
import { getSession } from "./apply/applicationStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));
app.get("/", (_, res) => res.sendFile(path.join(__dirname, "../frontend/index.html")));

// ── Health ─────────────────────────────────────────────────────────────────────
app.get("/health", (_, res) => res.json({ status: "ok" }));

// ── Original one-shot endpoint (kept for backward compat) ──────────────────────
app.post("/api/find-schemes", async (req, res) => {
  const { userInput } = req.body as { userInput?: string };
  if (!userInput || userInput.trim().length < 10)
    return res.status(400).json({ error: "Please provide more information." });
  try {
    const result = await runSchemeNavigator(userInput);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

// SSE streaming version
app.post("/api/find-schemes-stream", async (req, res) => {
  const { userInput } = req.body as { userInput?: string };
  if (!userInput || userInput.trim().length < 10)
    return res.status(400).json({ error: "Please provide more information." });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    send("start", { message: "Starting analysis..." });
    const result = await runSchemeNavigator(userInput, (step) => send("progress", step));
    send("result", result);
    send("done", {});
  } catch (err) {
    send("error", { message: err instanceof Error ? err.message : "Unknown error" });
  } finally {
    res.end();
  }
  return;
});

// ── Conversational Profile Endpoints ──────────────────────────────────────────

// Start a new conversation
app.post("/api/conversation/start", (_, res) => {
  const conv = startNewConversation();
  res.json({
    conversationId: conv.sessionId,
    // First question from agent
    reply: conv.openingMessage,
    isComplete: false,
  });
});

// Send a message in an existing conversation
app.post("/api/conversation/:conversationId/message", async (req, res) => {
  const { conversationId } = req.params;
  const { message } = req.body as { message?: string };

  if (!message || message.trim().length === 0)
    return res.status(400).json({ error: "Message cannot be empty." });

  const conv = getExistingConversation(conversationId);
  if (!conv) return res.status(404).json({ error: "Conversation not found." });

  if (conv.isComplete)
    return res.status(400).json({ error: "Conversation already complete." });

  try {
    const turn = await handleConversationTurn(conversationId, message);
    return res.json(turn);
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

// Get conversation state
app.get("/api/conversation/:conversationId", (req, res) => {
  const conv = getExistingConversation(req.params.conversationId);
  if (!conv) return res.status(404).json({ error: "Not found" });
  return res.json(conv);
});

// ── Apply Agent Endpoints ──────────────────────────────────────────────────────

// STEP 1: Start assisted application for a scheme
app.post("/api/apply/start", async (req, res) => {
  const { scheme, profile } = req.body;
  if (!scheme || !profile)
    return res.status(400).json({ error: "scheme and profile are required." });

  try {
    const session = await prepareApplication(scheme, profile);
    return res.json({
      sessionId: session.sessionId,
      status: session.status,
      loginUrl: session.loginUrl,
      loginInstructions: session.loginInstructions,
      prefilledData: session.prefilledData,
      documents: session.documents,
      message: `Everything is prepared! Please open the portal and log in. Come back here after logging in.`,
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

// STEP 2: User signals they have logged in → agent resumes
app.post("/api/apply/:sessionId/resume", async (req, res) => {
  const { sessionId } = req.params;
  const session = getSession(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found." });

  try {
    const resumeData = await resumeAfterLogin(sessionId);
    return res.json({
      sessionId,
      status: "submitting",
      ...resumeData,
      message: "You are logged in. Follow these steps to complete your application.",
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

// STEP 3: User confirms they submitted successfully
app.post("/api/apply/:sessionId/confirm", (req, res) => {
  const { sessionId } = req.params;
  const { confirmationNumber } = req.body as { confirmationNumber?: string };
  const session = confirmApplication(sessionId, confirmationNumber);
  if (!session) return res.status(404).json({ error: "Session not found." });
  return res.json({ sessionId, status: "completed", confirmationNumber: session.confirmationNumber });
});

// Mark as failed
app.post("/api/apply/:sessionId/fail", (req, res) => {
  const { sessionId } = req.params;
  const { reason } = req.body as { reason?: string };
  const session = failApplication(sessionId, reason ?? "User reported failure");
  if (!session) return res.status(404).json({ error: "Session not found." });
  return res.json({ sessionId, status: "failed" });
});

// Get session status
app.get("/api/apply/:sessionId", (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Not found" });
  return res.json(session);
});

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║     🇮🇳  AI Government Scheme Navigator              ║
╠══════════════════════════════════════════════════════╣
║  Open browser: http://localhost:${PORT}                ║
║                                                      ║
║  Agents:                                             ║
║  ✓ Conversational Profile Agent (chat mode)          ║
║  ✓ Scheme Discovery & Eligibility Agent              ║
║  ✓ Benefit Ranking & Guide Agent                     ║
║  ✓ Fraud Detection Agent                             ║
║  ✓ Assisted Apply Agent (suspend/resume)             ║
╚══════════════════════════════════════════════════════╝
  `);
});
