# 🇮🇳 Sarkar Sahayak — AI Government Scheme Navigator

> **Multi-agent AI system** that helps Indian citizens discover, understand, and apply for government schemes they are eligible for — built with [ADK-TS](https://github.com/IQAIcom/adk-ts).

---

## Architecture

```
User Input (natural language)
        ↓
┌──────────────────────────────────────────┐
│           ADK-TS Orchestrator            │
│                                          │
│  1. Profile Understanding Agent          │  ← Extracts structured profile (Zod schema)
│  2. Scheme Discovery & Eligibility Agent │  ← Searches dataset + checks eligibility
│  3. Benefit Ranking & Guide Agent        │  ← Ranks by impact, writes application guide
│  4. Fraud Detection Agent                │  ← Warns about fake schemes                  
└──────────────────────────────────────────┘
        ↓
Personalized scheme guide with
documents, steps, and URLs
```

**ADK-TS features used:**
- `AgentBuilder` — fluent agent construction
- `createTool` — custom scheme search tool
- `.withOutputSchema(zodSchema)` — typed JSON output from every agent
- `.withQuickSession()` — in-memory state management
- Sequential orchestration via the `orchestrator.ts` pipeline
- SSE streaming for real-time agent progress in the UI

---

## Quick Start

### Prerequisites
- Node.js 18+
- At least one LLM API key (Google Gemini recommended — free tier available)

### Setup

```bash
# 1. Install dependencies
cd scheme-navigator
npm install

# 2. Configure API keys
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY (or OPENAI/ANTHROPIC)

# 3. Start the backend
npm start
# Server runs on http://localhost:3001

# 4. Open the frontend
# Open frontend/index.html in your browser
# OR serve it: npx serve frontend
```

### Get a free Gemini API key
Go to [Google AI Studio](https://aistudio.google.com/app/apikey) — it's free with generous limits.

---

## Project Structure

```
scheme-navigator/
├── src/
│   ├── agents/
│   │   ├── profileAgent.ts     # Agent 1: Extract user profile
│   │   ├── discoveryAgent.ts   # Agent 2+3: Find + filter eligible schemes
│   │   ├── guideAgent.ts       # Agent 4: Rank + application guide
│   │   └── fraudAgent.ts       # Agent 5: Fraud detection
│   ├── data/
│   │   └── schemes.ts          # 15+ curated government schemes
│   ├── orchestrator.ts         # Sequential agent pipeline
│   └── server.ts               # Express REST API
├── frontend/
│   └── index.html              # Single-file UI with voice input
├── .env.example
└── package.json
```

---

## API Reference

### `POST /api/find-schemes`
```json
{ "userInput": "I am a farmer from Himachal Pradesh earning 2 lakhs..." }
```
Returns full analysis result with profile, ranked schemes, and fraud check.

### `POST /api/find-schemes-stream`  
Same input — returns **Server-Sent Events** for real-time agent progress display.

---

## Schemes Dataset (15+ included)

| Category | Schemes |
|----------|---------|
| Agriculture | PM-KISAN, PM Fasal Bima, Soil Health Card, Kisan Credit Card |
| Housing | PMAY-Gramin, PMAY-Urban |
| Health | Ayushman Bharat |
| Education | NSP Pre-Matric, NSP Post-Matric, Central Sector Scholarship, Beti Bachao |
| Entrepreneurship | Mudra Shishu, Mudra Kishor, Stand-Up India |
| Skill Development | PM Kaushal Vikas Yojana |
| Pension | IGNOAPS |
| Himachal Pradesh | Sahara Yojana, Khet Sanrakshan, Beti Hai Anmol |

---

## Extending

### Add more schemes
Edit `src/data/schemes.ts` — add entries to the `SCHEMES` array following the `Scheme` interface.

### Connect to real APIs
Replace `searchSchemesTool` in `discoveryAgent.ts` with a call to:
- [myScheme API](https://api.myscheme.gov.in) (official Government of India API)
- [data.gov.in](https://data.gov.in)

### Add language support
The guide agent can translate output — pass a `language` parameter and add translation instructions.

### Add more agents
Create a new file in `src/agents/` following the same pattern, then add the call in `orchestrator.ts`.

---

## Hackathon Tips

- **Demo story**: Input "Female student from Himachal Pradesh, family income ₹2 lakh" → show 4 agents activating → show ranked scholarship results
- **Highlight**: The multi-agent architecture separating concerns (profile vs eligibility vs ranking vs fraud)
- **Wow factor**: Voice input works in Hindi (`recognition.lang = 'hi-IN'`)
- **Impact**: India has 1,000+ schemes — most citizens don't know what they qualify for

---

## Resources
- ADK-TS Docs: https://adk.iqai.com
- ADK-TS GitHub: https://github.com/IQAIcom/adk-ts
- myScheme API: https://api.myscheme.gov.in
- National Scholarship Portal: https://scholarships.gov.in
