// src/server.ts
// REST API server exposing the multi-agent navigator

import "dotenv/config";
import express from "express";
import cors from "cors";
import { runSchemeNavigator } from "./orchestrator.js";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT ?? 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));
app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Health check
app.get("/health", (_, res) => {
  res.json({ status: "ok", message: "AI Government Scheme Navigator is running 🇮🇳" });
});

// Main endpoint: find schemes for a user
app.post("/api/find-schemes", async (req, res) => {
  const { userInput } = req.body as { userInput?: string };

  if (!userInput || userInput.trim().length < 10) {
    return res.status(400).json({
      error: "Please provide more information about yourself (at least 10 characters).",
    });
  }

  console.log("\n════════════════════════════════════════");
  console.log("New Request:", userInput.substring(0, 100));
  console.log("════════════════════════════════════════");

  try {
    const result = await runSchemeNavigator(userInput);
    return res.json(result);
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({
      error: "An error occurred while processing your request. Please try again.",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

// Streaming endpoint (SSE) for real-time agent progress
app.post("/api/find-schemes-stream", async (req, res) => {
  const { userInput } = req.body as { userInput?: string };

  if (!userInput || userInput.trim().length < 10) {
    return res.status(400).json({ error: "Please provide more information." });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    sendEvent("start", { message: "Starting analysis..." });

    const result = await runSchemeNavigator(userInput, (step) => {
      sendEvent("progress", step);
    });

    sendEvent("result", result);
    sendEvent("done", { message: "Analysis complete" });
  } catch (err) {
    sendEvent("error", {
      message: err instanceof Error ? err.message : "Unknown error",
    });
  } finally {
    res.end();
  }
  return;
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║     🇮🇳  AI Government Scheme Navigator              ║
║     Multi-Agent System powered by ADK-TS             ║
╠══════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                      ║
║  API:    POST /api/find-schemes                      ║
║  Stream: POST /api/find-schemes-stream               ║
╚══════════════════════════════════════════════════════╝

Agents ready:
  ✓ Profile Understanding Agent
  ✓ Scheme Discovery & Eligibility Agent  
  ✓ Benefit Ranking & Application Guide Agent
  ✓ Fraud Detection Agent
  `);
});
console.log("API KEY:", process.env.GOOGLE_API_KEY);
