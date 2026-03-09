import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT, KNOWLEDGE_BASE } from "@/lib/chatbot-constants";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
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
      { headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API Error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
