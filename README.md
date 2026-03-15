# 🇮🇳 Sarkar Sahayak — Autonomous AI Government Scheme Navigator

> An autonomous multi-agent AI system that helps Indian citizens discover government welfare schemes they qualify for, verify eligibility, and receive personalized step-by-step application guidance — in natural language, including voice input in Hindi.

[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178c6)](https://www.typescriptlang.org/)
[![ADK-TS](https://img.shields.io/badge/Agent_Framework-ADK--TS-blue)](https://github.com/IQAIcom/adk-ts)
[![Node.js](https://img.shields.io/badge/Runtime-Node.js%2018%2B-green)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## 🧩 The Problem

India has **1,000+ active government welfare schemes** spanning agriculture, housing, health, education, and entrepreneurship. Despite this, the majority of eligible citizens never access them because:

- Scheme information is **fragmented across dozens of government portals**
- **Complex eligibility rules** differ by state, caste, income, age, and occupation
- **Language and literacy barriers** prevent self-navigation
- **Fake scheme scams** actively target rural and low-income populations

Sarkar Sahayak bridges this gap with a fully autonomous AI agent — one that understands a citizen's situation from plain conversation, reasons over eligibility rules, ranks schemes by impact, generates personalized application guides, and flags fraud, all without human-in-the-loop intervention.

---

## 💡 Solution Overview

Rather than a simple search or a chatbot, Sarkar Sahayak is a **sequential multi-agent pipeline** where each agent is a specialized reasoning unit with a single responsibility, typed inputs, and typed outputs. The system works autonomously — the user describes their situation once in natural language (or voice), and the pipeline handles everything else.

**Key capabilities:**
- Natural language profile extraction (no forms to fill)
- Eligibility matching across 15+ national and state schemes
- Impact-ranked scheme recommendations with annual benefit values (₹)
- Per-scheme document checklists and step-by-step application instructions
- Proactive fraud detection and safety warnings
- Real-time streaming of agent progress to the UI
- Hindi voice input support (`hi-IN` locale)

---

## 🏗️ System Architecture

The system is built as a **Sequential Multi-Agent Pipeline** using the [ADK-TS](https://github.com/IQAIcom/adk-ts) framework. Each agent is independently constructed, has a typed output contract enforced via Zod schemas, and passes structured data to the next stage.

```
User Input  (natural language or Hindi voice)
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ADK-TS Orchestrator                        │
│                       (orchestrator.ts)                         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Agent 1 — Profile Understanding Agent                  │  │
│  │  Extracts a structured citizen profile from free-form    │  │
│  │  text. Fields: age, gender, occupation, state, income,   │  │
│  │  caste, disability, landholding, education level.        │  │
│  │  Output: Zod-typed ProfileOutput JSON                    │  │
│  └──────────────────────────┬───────────────────────────────┘  │
│                             │ Typed ProfileOutput               │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Agent 2 — Scheme Discovery & Eligibility Agent          │  │
│  │  Invokes searchSchemesTool with profile parameters.      │  │
│  │  Filters schemes by eligibility rules, returns matched   │  │
│  │  schemes with match_score and benefit metadata.          │  │
│  │  Output: Zod-typed SchemeMatchOutput JSON                │  │
│  └──────────────────────────┬───────────────────────────────┘  │
│                             │ Typed SchemeMatchOutput           │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Agent 3 — Benefit Ranking & Application Guide Agent     │  │
│  │  Ranks matched schemes by annual benefit value (₹).      │  │
│  │  Generates per-scheme document checklists, application   │  │
│  │  steps, and official portal links.                       │  │
│  │  Output: Zod-typed GuideOutput JSON                      │  │
│  └──────────────────────────┬───────────────────────────────┘  │
│                             │ Typed GuideOutput                 │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Agent 4 — Fraud Detection Agent                         │  │
│  │  Cross-checks matched schemes against known fraud        │  │
│  │  patterns. Issues safety warnings for unverified or      │  │
│  │  lookalike schemes. Runs on every request, proactively.  │  │
│  │  Output: Zod-typed FraudCheckOutput JSON                 │  │
│  └──────────────────────────┬───────────────────────────────┘  │
│                             │ Final Composed Output             │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
              Personalized Scheme Report
      (ranked schemes + doc checklist + guide + fraud alerts)
                     streamed via SSE → UI
```

---

## ⚙️ Technical Implementation

### Agent Framework: ADK-TS

All agents are built using [ADK-TS](https://github.com/IQAIcom/adk-ts), a TypeScript-native framework for building autonomous multi-agent systems. Key primitives used:

**`AgentBuilder`** — Fluent interface for agent construction with zero boilerplate:

```typescript
import { AgentBuilder } from '@iqai/adk';

const profileAgent = AgentBuilder
  .create("profile_agent")
  .withModel("gemini-2.5-flash")
  .withDescription("Extracts structured citizen profile from natural language")
  .withInstruction(PROFILE_EXTRACTION_PROMPT)
  .withOutputSchema(profileSchema)
  .build();
```

**`createTool`** — Custom tool for external system integration (the scheme database / live API):

```typescript
import { createTool } from '@iqai/adk';

const searchSchemesTool = createTool({
  name: "search_schemes",
  description: "Searches the government schemes database for matching schemes",
  parameters: z.object({
    occupation: z.string(),
    state: z.string(),
    income_lpa: z.number(),
    gender: z.string(),
    caste: z.string().optional(),
  }),
  execute: async (params) => filterSchemesByEligibility(params),
});
```

**`.withOutputSchema(zodSchema)`** — Enforces typed output contracts between agents, making the pipeline machine-readable and robust against malformed LLM output:

```typescript
const profileSchema = z.object({
  age: z.number(),
  gender: z.enum(["male", "female", "other"]),
  occupation: z.string(),
  state: z.string(),
  income_lpa: z.number(),
  caste: z.string().optional(),
  is_disabled: z.boolean().optional(),
  landholding_acres: z.number().optional(),
});
```

**Sequential Orchestration** — Agents are chained so that each stage's typed output becomes the next stage's structured input:

```typescript
// orchestrator.ts
export async function runOrchestrator(userInput: string) {
  const profile = await runProfileAgent(userInput);
  const schemes = await runDiscoveryAgent(profile);
  const guide   = await runGuideAgent(profile, schemes);
  const fraud   = await runFraudAgent(schemes);
  return { profile, schemes, guide, fraud };
}
```

**`.withQuickSession()`** — In-memory session management for stateful interactions without an external database.

**SSE Streaming** — The `/api/find-schemes-stream` endpoint emits Server-Sent Events so the UI shows each agent activating in real time.

---

### Multi-Agent Patterns

| Pattern | Where Applied | Implementation |
|---|---|---|
| Sequential Pipeline | All 4 agents run in order | Manual orchestration in `orchestrator.ts` |
| Typed Agent Contracts | Every agent I/O boundary | `.withOutputSchema(zodSchema)` |
| Tool-Augmented Agent | Discovery Agent queries scheme data | `createTool` + `.withTools()` |
| Structured Reasoning | Fraud Agent evaluates scheme validity | `AgentBuilder` + instruction engineering |
| Real-Time Streaming | UI shows agent progress live | SSE via Express + `.withQuickSession()` |
| Context Passing | Profile → Discovery → Guide | Structured JSON injected per stage |

---

### Autonomy: What Makes This an Agent, Not a Chatbot

1. **Unstructured input → structured decisions** — The user speaks freely; the Profile Agent decides what to extract, fills ambiguous fields with safe defaults, and produces a machine-readable profile without user hand-holding.
2. **Tool-driven action** — The Discovery Agent independently decides which tool parameters to use based on the extracted profile, queries the external data source, and filters results — no human confirms the query.
3. **Impact-based prioritization** — The Guide Agent autonomously computes annual benefit values (₹) per scheme and re-ranks based on the citizen's income bracket.
4. **Proactive safety** — The Fraud Agent runs on every single response without being asked, and can override the output to insert warnings.
5. **Graceful degradation** — Zod validation on every agent output catches malformed LLM responses before they can break the pipeline.

---

## 🗂️ Project Structure

```
scheme-navigator/
├── src/
│   ├── agents/
│   │   ├── profileAgent.ts      # Agent 1: NL → Structured Profile
│   │   ├── discoveryAgent.ts    # Agent 2: Profile → Eligible Schemes
│   │   ├── guideAgent.ts        # Agent 3: Schemes → Ranked Guide
│   │   └── fraudAgent.ts        # Agent 4: Fraud detection
│   ├── data/
│   │   └── schemes.ts           # 15+ curated government schemes
│   ├── orchestrator.ts          # Sequential pipeline wiring
│   └── server.ts                # Express REST API + SSE streaming
├── frontend/
│   └── index.html               # Single-file UI with Hindi voice input
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 📦 Schemes Covered

| Category | Schemes |
|---|---|
| 🌾 Agriculture | PM-KISAN, PM Fasal Bima Yojana, Soil Health Card, Kisan Credit Card |
| 🏠 Housing | PMAY-Gramin, PMAY-Urban |
| 🏥 Health | Ayushman Bharat PM-JAY |
| 📚 Education | NSP Pre-Matric, NSP Post-Matric, Central Sector Scholarship, Beti Bachao Beti Padhao |
| 💼 Entrepreneurship | Mudra Shishu, Mudra Kishor, Stand-Up India |
| 🛠️ Skill Development | PM Kaushal Vikas Yojana (PMKVY) |
| 👴 Pension | IGNOAPS (Old Age Pension) |
| 🏔️ Himachal Pradesh | Sahara Yojana, Khet Sanrakshan Yojana, Beti Hai Anmol |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- A free API key — [Google AI Studio](https://aistudio.google.com/app/apikey) (Gemini, generous free tier), OpenAI, or Anthropic

### Setup

```bash
# 1. Clone and install
git clone https://github.com/AbhimanyuSingh35/scheme-navigator.git
cd scheme-navigator
npm install

# 2. Configure environment
cp .env.example .env
# Add your GOOGLE_API_KEY (or OPENAI_API_KEY / ANTHROPIC_API_KEY)

# 3. Start the backend
npm start
# → http://localhost:3001

# 4. Open the UI
open frontend/index.html
# OR: npx serve frontend
```

### Example Input

> *"I am a 38-year-old female farmer from Himachal Pradesh. My family income is ₹1.8 lakh per year. I own 2 acres of land and have a Class 10 education."*

The system activates all 4 agents sequentially and returns a ranked, personalized scheme report — PM-KISAN, Fasal Bima, PMAY, Soil Health Card — each with document checklist and application steps.

---

## 🌐 API Reference

### `POST /api/find-schemes`
Runs the full agent pipeline synchronously.

**Request:**
```json
{ "userInput": "Female student from HP, family income ₹2 lakh, Class 12 passed" }
```

**Response:**
```json
{
  "profile": { "age": 17, "gender": "female", "state": "himachal_pradesh", "income_lpa": 2 },
  "schemes": [{ "name": "NSP Post-Matric Scholarship", "match_score": 0.95, "benefit_inr": 10000 }],
  "guide": { "ranked_schemes": [...], "application_steps": [...] },
  "fraudCheck": { "warnings": [], "verified_schemes": [...] }
}
```

### `POST /api/find-schemes-stream`
Same pipeline, returns **Server-Sent Events** for real-time agent progress in the UI.

---

## 🔌 Extending the System

**Connect to live government APIs** — Replace the local scheme dataset in `discoveryAgent.ts` with a call to the official [myScheme API](https://api.myscheme.gov.in) or [data.gov.in](https://data.gov.in) for real-time scheme data.

**Add more languages** — Pass a `language` parameter to the Guide Agent with translation instructions. The architecture supports any language the underlying LLM supports.

**Add more agents** — Create a new file in `src/agents/`, export its run function, and insert it into `orchestrator.ts`. The typed pipeline makes this a one-file change.

**Deploy to production** — The Express server is stateless and sessions are in-memory, making it horizontally scalable behind any load balancer.

---

## 🌍 Impact

- **500M+** Indians live below or near the poverty line and are the primary target population for welfare schemes
- Most eligible beneficiaries are unaware of schemes they qualify for due to **information asymmetry**
- India's Digital India mission explicitly targets AI-assisted last-mile government service delivery
- **Hindi voice input** (`hi-IN`) bridges the digital literacy gap for non-typing users
- The **fraud detection layer** addresses a growing problem: scammers impersonate government schemes to steal from vulnerable citizens
- The architecture is fully **replicable for any country** with a government scheme catalogue

---

## 📚 Resources

- [ADK-TS Documentation](https://adk.iqai.com/docs)
- [ADK-TS GitHub](https://github.com/IQAIcom/adk-ts)
- [myScheme Official API](https://api.myscheme.gov.in)
- [National Scholarship Portal](https://scholarships.gov.in)
- [Ayushman Bharat Portal](https://pmjay.gov.in)
- [PM-KISAN Portal](https://pmkisan.gov.in)

---

## 👨‍💻 Author

Built by [Abhimanyu Singh](https://github.com/AbhimanyuSingh35)

*Sarkar Sahayak — because every eligible citizen deserves to know their rights.*
