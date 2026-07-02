# SecOps AI Workbench

AI-assisted web app for common IT security department work, including
suspicious email analysis, regulatory audits, policy review and creation,
procedure drafting, business impact analysis, third-party risk, access review,
cloud review, vulnerability prioritization, and incident response.
The Vulnerability and Hardening section includes penetration test report
drafting, executive summary creation, and report language review workflows.

## Run Locally

```bash
npm ci
npm run dev
```

Open `http://localhost:3000/`.

## Run With Docker Compose

```bash
export APP_SECRET="replace-with-a-long-random-secret"
docker compose build --no-cache
docker compose up -d
```

Or in one command:

```bash
export APP_SECRET="replace-with-a-long-random-secret"
docker compose build --no-cache && docker compose up -d
```

The app is exposed at `http://localhost:3000/` by default. To use a different
host port, set `APP_PORT`, for example:

```bash
APP_PORT=8080 docker compose up -d
```

## AI Provider Modes

- `Draft Mode`: local structured draft generation without an external AI call.
- `ChatGPT / OpenAI`: calls the OpenAI Responses API through `/api/analyze`.
- `Claude`: calls the Anthropic Messages API through `/api/analyze`.
- `Gemini`: calls the Google Gemini generateContent API through `/api/analyze`.

The administrator can set `ChatGPT / OpenAI`, the OpenAI model, and the API key
globally in `/settings`. Enable token storage there to save the OpenAI key
encrypted in SQLite for all signed-in users. Set `APP_SECRET` before deployment
so stored keys are encrypted with AES-GCM.

For HTTPS deployments behind a reverse proxy, set `AUTH_COOKIE_SECURE=1`.
Leave it unset or `0` for plain local HTTP testing.

## Accounts

The app uses self-hosted accounts stored in SQLite. On a fresh database, the
first account created from the browser becomes the administrator. After that,
only an administrator can create additional accounts from `/auth/register`.
The app supports up to 3 registered users.

## Settings

Use `/settings` to set organization context, regulation/framework defaults,
default scope, output mode, response language, AI provider, model, and AI
token. These settings are global. Only the administrator can change them.

## File Evidence

The workbench can import text-based evidence files directly in the browser and
place their contents into the evidence field for analysis. Supported formats
include `.eml`, `.txt`, `.log`, `.csv`, `.json`, `.md`, `.xml`, `.html`, `.yaml`,
and `.yml` up to 2 MB. PDFs up to 10 MB are parsed in the browser and imported
as extracted page text. Uploaded content is not stored server-side.

## Storage

Docker Compose uses SQLite at `/data/secops-ai-workbench.sqlite`, mounted by
the named volume `secops-ai-data`. The app keeps up to 3 signed-in users and
the 25 most recent analysis runs per user. Uploaded file bytes are not stored;
only the generated result, scenario metadata, global settings, and optional
encrypted API token are persisted.

Important environment variables:

- `SQLITE_DB_PATH`: defaults to `/data/secops-ai-workbench.sqlite` in Docker.
- `APP_SECRET`: required to encrypt saved AI tokens. Use a long random value
  and keep it stable across container rebuilds.
- `AUTH_COOKIE_SECURE`: set to `1` when serving the app over HTTPS.
- `APP_PORT`: host port exposed by Compose, default `3000`.

## Useful Commands

```bash
npm run lint
npm run build
```
