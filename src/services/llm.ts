// Shared LLM access: Groq primary, Gemini fallback. Both return the raw
// JSON string from a system+user prompt pair (response constrained to JSON).

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const GEMINI_MODEL = "gemini-2.5-flash";

export type ImageInput = { base64: string; mimeType: string };

async function callGroq(system: string, user: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing EXPO_PUBLIC_GROQ_API_KEY");

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      response_format: { type: "json_object" },
      temperature: 0.7,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Groq API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("Empty Groq response");
  return content;
}

async function callGroqVision(
  system: string,
  user: string,
  image: ImageInput
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing EXPO_PUBLIC_GROQ_API_KEY");

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
      response_format: { type: "json_object" },
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: user },
            {
              type: "image_url",
              image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Groq vision API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("Empty Groq vision response");
  return content;
}

async function callGemini(
  system: string,
  user: string,
  image?: ImageInput
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing EXPO_PUBLIC_GEMINI_API_KEY");

  const parts: Record<string, unknown>[] = [{ text: user }];
  if (image != null) {
    parts.push({ inline_data: { mime_type: image.mimeType, data: image.base64 } });
  }

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
  });

  // Standard Gemini API keys (AIza...) use generativelanguage.googleapis.com;
  // Vertex AI express-mode keys use aiplatform.googleapis.com. Try both.
  const endpoints = [
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    `https://aiplatform.googleapis.com/v1/publishers/google/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
  ];

  let lastError = "";
  for (const url of endpoints) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (!res.ok) {
      lastError = `Gemini API error ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`;
      if (res.status === 401 || res.status === 403 || res.status === 400) continue;
      throw new Error(lastError);
    }
    const data = await res.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof content !== "string") throw new Error("Empty Gemini response");
    return content;
  }
  throw new Error(lastError || "Gemini call failed");
}

/** Groq first, Gemini on any failure. Returns parsed JSON. */
export async function completeJSON(system: string, user: string): Promise<unknown> {
  let content: string;
  try {
    content = await callGroq(system, user);
  } catch (groqError) {
    console.warn("Groq failed, falling back to Gemini:", groqError);
    content = await callGemini(system, user);
  }
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("AI returned invalid JSON");
  }
}

/** Vision variant: Groq llama-4-scout first, Gemini on any failure. */
export async function completeJSONWithImage(
  system: string,
  user: string,
  image: ImageInput
): Promise<unknown> {
  let content: string;
  try {
    content = await callGroqVision(system, user, image);
  } catch (groqError) {
    console.warn("Groq vision failed, falling back to Gemini:", groqError);
    content = await callGemini(system, user, image);
  }
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("AI returned invalid JSON");
  }
}
