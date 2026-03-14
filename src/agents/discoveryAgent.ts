// src/agents/discoveryAgent.ts
// Agent 1 (Enhanced): Profile Understanding & Query Expansion
// Agent 2: Discover relevant schemes and check eligibility (Context-aware with BM25 retrieved chunks)

import { AgentBuilder, createTool } from "@iqai/adk";
import { z } from "zod";
import { searchSchemes, getAllSchemes, type Scheme } from "../data/schemes.js";
import type { UserProfile } from "./profileAgent.js";

// ────────────────────────────────────────────────────────────────────────────
// PHASE 3: RETRIEVAL FLOW - QUERY EXPANSION & VECTORLESS SEARCH
// ────────────────────────────────────────────────────────────────────────────

/**
 * Agent 1 Enhancement: Profile Understanding & Query Expansion
 * Generates government keywords and synonyms from user profile for semantic search
 */
export async function expandProfileToKeywords(profile: UserProfile): Promise<string[]> {
  try {
    const { runner } = await AgentBuilder.create("keyword_expander")
      .withModel(process.env.LLM_MODEL ?? "gemini-2.5-flash")
      .withInstruction(`You are an expert on Indian government schemes terminology. Your job is to expand a user profile into relevant government keywords and official terminology.
    
OUTPUT FORMAT: Return a JSON array of keywords. Example: ["farmer", "senior citizen", "women entrepreneur", "Uttar Pradesh", "BPL", "low income", "agricultural subsidy"]

RULES:
- Use official government scheme keywords (e.g., "BPL" instead of "poor")
- Include synonyms and related terms (e.g., "kisan", "farmer", "agriculture")
- Include state names and abbreviations where applicable
- Include demographic keywords if relevant (e.g., "senior citizen", "widow", "disabled")
- Include economic keywords (e.g., "low income", "self-employed")
- Expand occupations into related scheme categories
- Keep keywords concise and relevant to government schemes`)
      .build();

    const response = await runner.ask(`Based on this user profile, generate a list of government scheme keywords and synonyms:

Occupation: ${profile.occupation}
Annual Income: ₹${profile.annualIncome.toLocaleString("en-IN")}
State: ${profile.state}
Age: ${profile.age > 0 ? profile.age : "Not specified"}
Gender: ${profile.gender}
BPL Card: ${profile.hasBplCard ? "Yes" : "No"}
Owns Land: ${profile.hasLand ? "Yes" : "No"}
Social Category: ${profile.category}
Specific Needs: ${profile.specificNeeds.join(", ") || "None"}

Return ONLY a valid JSON array of keywords. No explanation needed.`) as unknown as string[];

    // Parse response if it's a string containing JSON
    const keywords = typeof response === "string" 
      ? JSON.parse(response) 
      : response;
    return Array.isArray(keywords) ? keywords : [];
  } catch (err) {
    console.error("Failed to expand keywords via Gemini:", err);
    // Fallback: manually generate basic keywords
    return generateFallbackKeywords(profile);
  }
}

/**
 * Fallback keyword generation if LLM fails
 */
function generateFallbackKeywords(profile: UserProfile): string[] {
  const keywords: string[] = [];
  
  // Occupation-based keywords
  if (profile.occupation && profile.occupation !== "unknown") {
    keywords.push(profile.occupation);
    if (profile.occupation.toLowerCase().includes("farmer")) {
      keywords.push("agriculture", "kisan", "crop", "subsidy");
    }
    if (profile.occupation.toLowerCase().includes("student")) {
      keywords.push("education", "scholarship", "youth");
    }
  }
  
  // Income-based keywords
  if (profile.annualIncome > 0 && profile.annualIncome < 300000) {
    keywords.push("low income", "below poverty line", "BPL", "poor");
  }
  
  // State keywords
  if (profile.state && profile.state !== "unknown") {
    keywords.push(profile.state);
  }
  
  // Age-based keywords
  if (profile.age > 60) {
    keywords.push("senior citizen", "elderly", "pension");
  } else if (profile.age > 0 && profile.age < 25) {
    keywords.push("youth", "young", "skill development");
  }
  
  // Gender-based keywords
  if (profile.gender === "female") {
    keywords.push("women", "mahila", "female", "women entrepreneur");
  }
  
  // Category-based keywords
  if (profile.category && profile.category !== "general") {
    keywords.push(profile.category, "reserved", "SC", "ST", "OBC");
  }
  
  // Special circumstances
  if (profile.hasBplCard) keywords.push("BPL", "poverty");
  if (profile.hasLand) keywords.push("land", "agriculture", "farmer");
  if (profile.isDisabled) keywords.push("disabled", "disability", "handicap", "PWD");
  
  // Specific needs
  if (profile.specificNeeds.length > 0) {
    keywords.push(...profile.specificNeeds);
  }
  
  return [...new Set(keywords)]; // Remove duplicates
}

/**
 * Phase 3: Execute Vectorless Search via BM25
 * Query the search API with expanded keywords to retrieve relevant text chunks
 */
async function queryBM25Search(keywords: string[]): Promise<RetrievedChunk[]> {
  const searchServerUrl = process.env.SEARCH_API_URL ?? "http://localhost:8000";
  const searchQuery = keywords.join(" ");
  
  try {
    const response = await fetch(`${searchServerUrl}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: searchQuery,
        top_n: 5, // Retrieve top 5 relevant chunks
      }),
    });
    
    if (!response.ok) {
      console.error(`Search API error: ${response.status}`);
      return [];
    }
    
    const data = (await response.json()) as { results: RetrievedChunk[] };
    return data.results || [];
  } catch (err) {
    console.error("BM25 search failed:", err);
    return [];
  }
}

// Type for retrieved search results
interface RetrievedChunk {
  score: number;
  source: string;
  text: string;
}

// ────────────────────────────────────────────────────────────────────────────
// PHASE 4: PARSING & STRUCTURED EXTRACTION
// ────────────────────────────────────────────────────────────────────────────

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
  retrievedContext?: string; // From Phase 3 BM25 search
}

export interface DiscoveryResult {
  eligibleSchemes: EligibleScheme[];
  summary: string;
  totalFound: number;
  retrievalPhaseMetadata?: {
    expandedKeywords: string[];
    retrievedChunks: number;
  };
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
      relevanceReason: z.string().describe("1-2 sentences explaining why this scheme is relevant"),
      retrievedContext: z.string().optional().describe("Government document text supporting this scheme"),
    })
  ),
  summary: z.string().describe("Brief summary of what was found and eligibility status"),
  totalFound: z.number(),
});

/**
 * Enhanced Discovery Flow integrating Phase 3 & Phase 4:
 * 1. Expand user profile to keywords (Agent 1) - OPTIONAL with fallback
 * 2. Query BM25 search for relevant text chunks (Phase 3) - OPTIONAL with fallback
 * 3. Pass profile + chunks to eligibility agent (Agent 2 - Phase 4) - REQUIRED
 */
export async function discoverEligibleSchemes(
  profile: UserProfile
): Promise<DiscoveryResult> {
  
  // ─ Phase 3: Profile Understanding & Query Expansion (OPTIONAL - has fallback)
  console.log("🔍 Phase 3: Expanding profile to keywords...");
  let expandedKeywords: string[] = [];
  try {
    expandedKeywords = await expandProfileToKeywords(profile);
    if (expandedKeywords.length === 0) {
      console.warn("⚠️  Keyword expansion returned empty, using fallback generation");
      expandedKeywords = generateFallbackKeywords(profile);
    }
  } catch (err) {
    console.warn("⚠️  Keyword expansion failed, using fallback generation:", err);
    expandedKeywords = generateFallbackKeywords(profile);
  }
  console.log("📋 Expanded keywords:", expandedKeywords);

  // ─ Phase 3: Vectorless Search via BM25 (OPTIONAL - graceful degradation)
  console.log("🔎 Phase 3: Querying BM25 index for relevant chunks...");
  let retrievedChunks: RetrievedChunk[] = [];
  try {
    if (expandedKeywords.length > 0) {
      retrievedChunks = await queryBM25Search(expandedKeywords);
    }
  } catch (err) {
    console.warn("⚠️  BM25 search failed, continuing without retrieved documents:", err);
  }
  console.log(`📚 Retrieved ${retrievedChunks.length} text chunks from corpus`);

  // ─ Context String: Build document context from retrieved chunks
  const retrievedContext = retrievedChunks.length > 0
    ? retrievedChunks.map((chunk) => `[Source: ${chunk.source}]\n${chunk.text}`).join("\n---\n")
    : "[No government documents retrieved - using internal knowledge]";

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

Expanded Keywords: ${expandedKeywords.join(", ")}
`;

  // ────────────────────────────────────────────────────────────────────────────
  // Phase 4: Context Injection (Agent 2)
  // Pass retrieved chunks along with profile data to extract eligibility insights
  // ────────────────────────────────────────────────────────────────────────────

  const { runner } = await AgentBuilder.create("scheme_discovery_and_eligibility")
    .withModel(process.env.LLM_MODEL ?? "gemini-2.5-flash")
    .withInstruction(`You are an expert on Indian government schemes. Your job is to:

PHASE 4 - CONTEXT INJECTION & EXTRACTION:
1. Analyze the user profile against the government scheme documents provided
2. Use the retrieved text chunks to cross-reference eligibility criteria
3. Determine if the user is GENUINELY eligible for each relevant scheme
4. Extract the exact eligibility criteria and benefits from official documents
5. Score schemes by relevance and potential benefit (1-10 scale)

RULES FOR ELIGIBILITY:
- Income limits MUST be checked against exact thresholds in documents
- Age eligibility is strict (check min/max age)
- Gender-specific schemes can only apply to matching gender
- State-specific schemes only if user is in that state
- Occupation must align with scheme category
- BPL/card status is critical for poverty-alleviation schemes
- Quote the exact eligibility text when available

PRIORITY:
1. Match user profile against retrieved government documents first
2. Then cross-check with scheme metadata
3. Be conservative: only include schemes with clear eligibility match

OUTPUT: Return realistic, verified schemes with extracted evidence from documents.`)
    .withTools(searchSchemesTool, getSchemeDetailsTool)
    .withOutputSchema(DiscoveryResultSchema)
    .withQuickSession({ state: {} })
    .build();

  // ─ Phase 4: Pass context + profile to Agent 2
  console.log("🤖 Phase 4: Agent 2 analyzing eligibility with context injection...");
  const result = (await runner.ask(
    `GOVERNMENT SCHEME DOCUMENTS (Retrieved via Semantic Search):
${retrievedContext || "[No documents retrieved from corpus]"}

${profileContext}

Based on:
1. The user's profile data
2. The retrieved government scheme documents above
3. Your knowledge of Indian government schemes

Find and verify eligibility for schemes. Extract structured data with confidence.`
  )) as unknown as DiscoveryResult;

  // Attach retrieval metadata
  result.retrievalPhaseMetadata = {
    expandedKeywords,
    retrievedChunks: retrievedChunks.length,
  };

  return result;
}
