# Chat-API ausrollen — Übergabe an Lorenz

**Stand:** 2026-08-13
**Was fehlt heute:** Auf sonaris.de antwortet `POST /api/chat` mit **404**. Das
Frontend ruft die Route auf (`js/chat.js`), fängt den Ausfall aber ab und
antwortet mit vorformulierten Sätzen. Besucher sehen also keinen Fehler, der
Chat denkt nur nicht mit.

**Warum:** Der Website-Container ist reines nginx. Ein API-Dienst wurde nie
ausgerollt — es gibt weder einen Container noch eine Traefik-Route für `/api`.

**Was hier vorbereitet ist:** Dockerfile, `docker-compose.yml` mit den nötigen
Traefik-Labels und die Konfiguration für den standalone-Bau. Lokal gebaut und
gegen die laufende Route geprüft (siehe „Was verifiziert ist").

---

## 1. Was auf dem Server passieren muss

Der Dienst gehört auf denselben Host wie die Website (46.225.63.251), ins
gleiche externe Docker-Netz `proxy`, in dem auch Traefik und
`sonaris-web` hängen.

```bash
# Repo dorthin holen, wo auch sonaris-web liegt
cd /srv/docker
git clone <repo-url> sonaris-chat-api
cd sonaris-chat-api

# Schlüssel hinterlegen — NICHT ins Repo
cat > .env <<'EOF'
OPENAI_API_KEY=sk-...
CORS_ORIGIN=https://sonaris.de
EOF
chmod 600 .env

docker compose build
docker compose up -d
docker compose logs -f sonaris-chat-api
```

Der OpenAI-Schlüssel liegt bei Oliver. Er gehört ausschließlich in diese
`.env` auf dem Server, nicht ins Repo und nicht ins Abbild.

## 2. Die Traefik-Route, auf die es ankommt

Der Website-Container beansprucht `Host(sonaris.de)` für **alles**. Ein
zweiter Router für `/api` ist spezifischer und braucht deshalb eine höhere
Priorität, sonst greift weiter die statische Seite und `/api/chat` bleibt
bei 404. Das steht so in der `docker-compose.yml`:

```yaml
- traefik.http.routers.sonaris-chat-api.rule=(Host(`sonaris.de`) || Host(`www.sonaris.de`)) && PathPrefix(`/api`)
- traefik.http.routers.sonaris-chat-api.priority=100
```

**Bitte gegenprüfen:** Ich kenne die Traefik-Konfiguration auf dem Host nicht
und komme dort auch nicht rein (`Permission denied (publickey)` als root wie
als oliver). Falls `sonaris-web` bereits eine eigene Priorität gesetzt hat,
muss die 100 entsprechend höher liegen. Falls Traefik dort anders
konfiguriert ist als über Docker-Labels, passt die Datei nicht und ich baue
sie um — sag einfach Bescheid.

## 3. Abnahme nach dem Ausrollen

```bash
# Muss 403 liefern (Origin-Prüfung greift)
curl -i -X POST https://sonaris.de/api/chat \
  -H 'Content-Type: application/json' -d '{"history":[]}'

# Muss eine echte Antwort liefern
curl -i -X POST https://sonaris.de/api/chat \
  -H 'Content-Type: application/json' -H 'Origin: https://sonaris.de' \
  -d '{"history":[{"role":"user","content":"Was macht Sonaris?"}]}'
```

Danach auf sonaris.de eine freie Frage in den Chat tippen. Kommt eine
inhaltliche Antwort statt „Lass uns das gemeinsam durchdenken", läuft es.

## 4. Was verifiziert ist — und was nicht

**Verifiziert** (lokal gebaut und gegen den laufenden Dienst geprüft,
2026-08-13, auf Next 16.2.6):

| Prüfung | Ergebnis |
|---|---|
| `npm ci` + `npm run build` (Next 16.2.6) | läuft durch, `.next/standalone/server.js` entsteht |
| `GET /` (Ziel des Health-Checks) | 200 |
| `POST /api/chat` ohne Origin | 403 |
| `POST /api/chat` mit fremdem Origin | 403 |
| `POST /api/chat`, Origin sonaris.de, kaputter Body | 400 |
| `POST /api/chat`, Origin sonaris.de, gültiger Body | erreicht OpenAI |
| Fehlerantwort nach außen | allgemein gehalten, Details nur im Log |

**Angenommen, von dir zu prüfen:**

- Dass Traefik auf dem Host über Docker-Labels konfiguriert ist (aus der
  `docker-compose.yml` von `sonaris-web` geschlossen, nicht am Host gesehen).
- Dass das externe Netz `proxy` heißt (ebenda).
- Dass `docker compose` und ein Let's-Encrypt-Resolver namens `letsencrypt`
  vorhanden sind (ebenda).
- Der Docker-Bau selbst — hier ist keine Docker-Laufzeit verfügbar, geprüft
  ist der Next-Bau, nicht das Abbild.


## 6. Woher dieser Stand kommt

Das Repo lag doppelt vor: eine Kopie in Olivers iCloud-Vault und eine
unter `~/Repos/sonaris-chat-api`, migriert am 2026-05-26. Beide waren
auseinandergelaufen:

- `~/Repos` hatte zwei Commits mehr — eine CI-Pipeline und den Sprung
  von Next 16.1.6 auf 16.2.6, der fünf Sicherheitshinweise auflöst.
- Die iCloud-Kopie trug die nie committete Arbeit vom März und April:
  Origin-Prüfung, Ratenbegrenzung und das Einbetten der Wissensbasis.

Dieser Branch führt beides zusammen: neuere Basis mit Sicherheitsstand,
darauf die Feature-Arbeit und das Deploy-Paket. Der `build`-Schritt
wurde um `node scripts/embed-content.cjs` ergänzt — ohne ihn startet die
API mit leerem System-Prompt.

## 7. Betriebshinweise

- **Ratenbegrenzung** liegt im Arbeitsspeicher des Prozesses: 15 Anfragen pro
  Minute und IP. Bei einem einzelnen Container passt das. Sobald mehrere
  Instanzen laufen, zählt jede für sich.
- **Modell:** `gpt-4o-mini`, fest in `app/api/chat/route.ts`.
- **Wissensbasis:** `content/system-prompt.md` und `content/knowledge-base.md`
  werden beim Bau per `scripts/embed-content.cjs` in den Code eingebettet.
  Eine Änderung am Wissen erfordert einen neuen Bau, kein Neustart genügt.
- **Erlaubte Herkunft:** `lib/allowed-origins.ts`. Dort stehen noch
  `*.vercel.app`-Muster aus der Vercel-Zeit. Sie stören nicht, können aber
  raus, sobald klar ist, dass keine Vercel-Vorschau mehr gebraucht wird.
