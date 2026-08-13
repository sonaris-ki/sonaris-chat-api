import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT, KNOWLEDGE_BASE } from "@/lib/chatbot-constants";
import { isOriginAllowed } from "@/lib/allowed-origins";
import { checkRateLimit } from "@/lib/rate-limit";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
  "Access-Control-Allow-Headers": "Content-Type",
};

function getOrigin(req: NextRequest): string | null {
  return req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || null;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);
  if (!isOriginAllowed(origin)) {
    return NextResponse.json(
      { error: "Origin not allowed" },
      { status: 403, headers: CORS_HEADERS }
    );
  }

  const ip = getClientIp(req);
  const { allowed, remaining } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute." },
      {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          "Retry-After": "60",
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  try {
    const { history } = await req.json();

    if (!history || !Array.isArray(history)) {
      return NextResponse.json(
        { error: "Missing or invalid field: history (array)" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const model = "gpt-4o-mini";
    const fullHistory = [
      { role: "system", content: `${SYSTEM_PROMPT}\n\n=== WISSENSDATENBANK ===\n${KNOWLEDGE_BASE}` },
      ...history,
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model, messages: fullHistory }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const responseText = data.choices[0].message.content;

    return NextResponse.json(
      { success: true, response: responseText },
      { headers: { ...CORS_HEADERS, "X-RateLimit-Remaining": String(remaining) } }
    );
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    // Details bleiben im Container-Log. Nach aussen geht nur eine
    // allgemeine Meldung: die OpenAI-Fehler enthalten sonst den
    // teilmaskierten Schluessel und interne Hinweise.
    console.error("API Error:", err);
    return NextResponse.json(
      { error: "Der Assistent ist gerade nicht erreichbar." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
