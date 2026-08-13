/**
 * Erlaubte Origins für den Chat-API-Zugriff.
 * Nur Anfragen von diesen Domains werden akzeptiert.
 */
const ALLOWED_ORIGINS = [
  "https://sonaris.de",
  "https://www.sonaris.de",
  "http://localhost",
  "http://127.0.0.1",
];

const ALLOWED_PATTERNS = [
  /^https:\/\/.*\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

export function isOriginAllowed(originOrReferer: string | null): boolean {
  if (!originOrReferer) return false;

  let origin = originOrReferer;
  if (originOrReferer.startsWith("http")) {
    try {
      origin = new URL(originOrReferer).origin;
    } catch {
      return false;
    }
  }

  if (ALLOWED_ORIGINS.includes(origin)) return true;

  return ALLOWED_PATTERNS.some((re) => re.test(origin));
}
