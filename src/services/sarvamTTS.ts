import axios from "axios";

async function translateChunk(text: string): Promise<string> {
  const res = await axios.post(
    "https://api.sarvam.ai/translate",
    {
      input: text,
      source_language_code: "en-IN",
      target_language_code: "hi-IN",
      speaker_gender: "Female",
      mode: "formal",
      enable_preprocessing: true,
    },
    { headers: { "api-subscription-key": process.env.SARVAM_API_KEY } }
  );
  return res.data.translated_text as string;
}

async function translateToHindi(text: string): Promise<string> {
  const MAX = 900;
  if (text.length <= MAX) {
    try {
      return await translateChunk(text);
    } catch (err: any) {
      console.error("Translate error:", JSON.stringify(err.response?.data));
      throw err;
    }
  }
  const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if ((current + s).length > MAX && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  const translated: string[] = [];
  for (const chunk of chunks) {
    try {
      const result = await translateChunk(chunk);
      translated.push(result);
    } catch (err: any) {
      console.error("Translate chunk error:", JSON.stringify(err.response?.data));
      throw err;
    }
  }
  return translated.join(" ");
}

function splitIntoChunks(text: string, max = 500): string[] {
  if (text.length <= max) return [text];
  const chunks: string[] = [];
  const sentences = text.match(/[^।.!?]+[।.!?]+/g) ?? [text];
  let current = "";
  for (const s of sentences) {
    if ((current + s).length > max && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function mergeWavBuffers(buffers: Buffer[]): Buffer {
  if (buffers.length === 1) return buffers[0];
  const header = Buffer.from(buffers[0].slice(0, 44));
  const data = buffers.map(b => b.slice(44));
  const merged = Buffer.concat(data);
  header.writeUInt32LE(merged.length + 36, 4);
  header.writeUInt32LE(merged.length, 40);
  return Buffer.concat([header, merged]);
}

async function textToSpeech(text: string): Promise<Buffer> {
  const chunks = splitIntoChunks(text);
  const buffers: Buffer[] = [];
  for (const chunk of chunks) {
    try {
      const res = await axios.post(
        "https://api.sarvam.ai/text-to-speech",
        {
          inputs: [chunk],
          target_language_code: "hi-IN",
          speaker: "anushka",
          pitch: 0,
          pace: 1.0,
          loudness: 1.5,
          speech_sample_rate: 22050,
          enable_preprocessing: true,
          model: "bulbul:v2",
        },
        { headers: { "api-subscription-key": process.env.SARVAM_API_KEY } }
      );
      buffers.push(Buffer.from(res.data.audios[0] as string, "base64"));
    } catch (err: any) {
      console.error("TTS error:", JSON.stringify(err.response?.data));
      throw err;
    }
  }
  return mergeWavBuffers(buffers);
}

function buildSpeakableSummary(guide: {
  topPriorityMessage: string;
  rankedSchemes: Array<{
    rank: number;
    name: string;
    benefitAmount?: string;
    impactSummary: string;
    quickTip: string;
    estimatedTime: string;
    difficultyLevel: string;
  }>;
}): string {
  let text = `${guide.topPriorityMessage} `;
  text += `Here are your top eligible schemes. `;
  guide.rankedSchemes.slice(0, 3).forEach((s) => {
    text += `Scheme number ${s.rank}: ${s.name}. `;
    if (s.benefitAmount) text += `Benefit: ${s.benefitAmount}. `;
    text += `${s.impactSummary} `;
    text += `Quick tip: ${s.quickTip}. `;
    text += `Time to apply: ${s.estimatedTime}. `;
  });
  if (guide.rankedSchemes.length > 3) {
    text += `${guide.rankedSchemes.length - 3} more schemes are shown on screen.`;
  }
  return text;
}

export async function convertGuideToHindi(
  guide: Parameters<typeof buildSpeakableSummary>[0]
): Promise<Buffer> {
  const english = buildSpeakableSummary(guide);
  const hindi = await translateToHindi(english);
  return textToSpeech(hindi);
}