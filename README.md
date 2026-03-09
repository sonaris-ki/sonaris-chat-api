# Sonaris Chat API

Chat-Backend für die Sonaris-Website. Enthält System-Prompt, Wissensdatenbank und OpenAI-Anbindung.

## Setup

```bash
cp .env.example .env.local
# OPENAI_API_KEY in .env.local eintragen

npm install
npm run dev
```

API läuft auf http://localhost:3001

## Endpoint

**POST /api/chat**

Request:
```json
{
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

Response:
```json
{
  "success": true,
  "response": "..."
}
```

## CORS

Für Cross-Origin-Aufrufe (z.B. von website-sonaris) kann `CORS_ORIGIN` in `.env.local` gesetzt werden (z.B. `http://localhost:3000` oder `https://sonaris.de`). Standard: `*`

## Deployment

Z.B. Vercel. Umgebungsvariable `OPENAI_API_KEY` setzen.
