import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import {
  defaultWorkbenchSettings,
  type WorkbenchSettings,
} from "../workbench-settings";

type DatabaseSync = {
  exec(sql: string): void;
  prepare(sql: string): {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  };
};

export type UserRole = "admin" | "member";

export type AppUser = {
  displayName: string;
  email: string;
  fullName: string | null;
  id: number;
  role: UserRole;
};

type UserRow = {
  display_name: string;
  email: string;
  id: number;
  password_hash: string | null;
  role: string | null;
};

type SettingsRow = {
  api_key_encrypted: string | null;
  default_scope: string | null;
  model: string | null;
  organization_context: string | null;
  output_mode: string | null;
  provider: string | null;
  regulation: string | null;
  remember_api_key: number | null;
  response_language: string | null;
};

export type StoredAnalysisRun = {
  createdAt: string;
  id: number;
  outputMode: string;
  provider: string;
  result: string;
  scenarioId: string;
  scenarioTitle: string;
  targetScope: string;
};

const maxUsers = 3;
const maxRunsPerUser = 25;
const sessionDays = 7;
let cachedDb: DatabaseSync | null = null;

export class AuthorizationError extends Error {
  constructor() {
    super("Administrator access is required.");
  }
}

export class DuplicateUserError extends Error {
  constructor() {
    super("A user with this email already exists.");
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Email or password is incorrect.");
  }
}

export class MaxUsersError extends Error {
  constructor() {
    super("The maximum number of users has been reached.");
  }
}

export async function getSqliteDb(): Promise<DatabaseSync> {
  if (cachedDb) return cachedDb;
  const databasePath = resolve(
    process.env.SQLITE_DB_PATH ?? ".data/secops-ai-workbench.sqlite",
  );
  mkdirSync(dirname(databasePath), { recursive: true });

  const sqlite = (await import("node:sqlite")) as unknown as {
    DatabaseSync: new (path: string) => DatabaseSync;
  };
  const db = new sqlite.DatabaseSync(databasePath);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  initializeSchema(db);
  cachedDb = db;
  return db;
}

export async function getRegisteredUserCount(): Promise<number> {
  const db = await getSqliteDb();
  const row = db
    .prepare("SELECT COUNT(*) AS count FROM users WHERE password_hash IS NOT NULL")
    .get() as { count: number };
  return row.count;
}

export async function registerUser({
  displayName,
  email,
  password,
}: {
  displayName: string;
  email: string;
  password: string;
}): Promise<AppUser> {
  const db = await getSqliteDb();
  const normalizedEmail = normalizeEmail(email);
  const name = displayName.trim() || normalizedEmail;
  const existing = getUserRowByEmail(db, normalizedEmail);

  if (existing?.password_hash) {
    throw new DuplicateUserError();
  }

  const registeredCount = await getRegisteredUserCount();
  if (registeredCount >= maxUsers) {
    throw new MaxUsersError();
  }

  const role: UserRole = registeredCount === 0 ? "admin" : "member";
  const passwordHash = hashPassword(password);

  if (existing) {
    db.prepare(
      `UPDATE users
        SET display_name = ?,
          password_hash = ?,
          role = ?,
          source = 'self-hosted',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
    ).run(name, passwordHash, role, existing.id);
    return toAppUser({
      ...existing,
      display_name: name,
      password_hash: passwordHash,
      role,
    });
  }

  const result = db
    .prepare(
      `INSERT INTO users (email, display_name, source, role, password_hash)
        VALUES (?, ?, 'self-hosted', ?, ?)`,
    )
    .run(normalizedEmail, name, role, passwordHash);

  return {
    displayName: name,
    email: normalizedEmail,
    fullName: name,
    id: Number(result.lastInsertRowid),
    role,
  };
}

export async function authenticateUser({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<AppUser> {
  const db = await getSqliteDb();
  const row = getUserRowByEmail(db, normalizeEmail(email));
  if (!row?.password_hash || !verifyPassword(password, row.password_hash)) {
    throw new InvalidCredentialsError();
  }
  return toAppUser(row);
}

export async function createUserSession(userId: number): Promise<{
  expiresAt: Date;
  token: string;
}> {
  const db = await getSqliteDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);

  db.prepare(
    `INSERT INTO user_sessions (user_id, token_hash, expires_at)
      VALUES (?, ?, ?)`,
  ).run(userId, hashSessionToken(token), expiresAt.toISOString());

  return { expiresAt, token };
}

export async function deleteUserSession(token: string): Promise<void> {
  const db = await getSqliteDb();
  db.prepare("DELETE FROM user_sessions WHERE token_hash = ?").run(
    hashSessionToken(token),
  );
}

export async function getUserBySessionToken(
  token: string | undefined,
): Promise<AppUser | null> {
  if (!token) return null;
  const db = await getSqliteDb();
  const row = db
    .prepare(
      `SELECT
        u.id,
        u.email,
        u.display_name,
        u.role,
        u.password_hash
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?
        AND s.expires_at > ?
        AND u.password_hash IS NOT NULL`,
    )
    .get(hashSessionToken(token), new Date().toISOString()) as
    | UserRow
    | undefined;

  return row ? toAppUser(row) : null;
}

export async function getStoredSettings({
  includeApiKey = false,
}: {
  includeApiKey?: boolean;
} = {}): Promise<WorkbenchSettings> {
  const db = await getSqliteDb();
  const row = db.prepare("SELECT * FROM app_settings WHERE id = 1").get() as
    | SettingsRow
    | undefined;
  if (!row) return defaultWorkbenchSettings;

  const rememberApiKey = Boolean(row.remember_api_key);
  return {
    organizationContext:
      row.organization_context ?? defaultWorkbenchSettings.organizationContext,
    regulation: row.regulation ?? defaultWorkbenchSettings.regulation,
    defaultScope: row.default_scope ?? defaultWorkbenchSettings.defaultScope,
    outputMode: row.output_mode ?? defaultWorkbenchSettings.outputMode,
    responseLanguage:
      row.response_language ?? defaultWorkbenchSettings.responseLanguage,
    provider:
      isProvider(row.provider) ? row.provider : defaultWorkbenchSettings.provider,
    model: row.model ?? defaultWorkbenchSettings.model,
    rememberApiKey,
    apiKey:
      includeApiKey && rememberApiKey && row.api_key_encrypted
        ? decryptSecret(row.api_key_encrypted) ?? ""
        : "",
  };
}

export async function saveStoredSettings(
  user: AppUser,
  settings: WorkbenchSettings,
): Promise<WorkbenchSettings> {
  if (user.role !== "admin") {
    throw new AuthorizationError();
  }

  const db = await getSqliteDb();
  const existing = db
    .prepare("SELECT api_key_encrypted FROM app_settings WHERE id = 1")
    .get() as { api_key_encrypted: string | null } | undefined;
  const encryptedApiKey =
    !settings.rememberApiKey
      ? null
      : settings.apiKey.trim()
        ? encryptSecret(settings.apiKey.trim())
        : existing?.api_key_encrypted ?? null;

  db.prepare(
    `INSERT INTO app_settings (
      id,
      organization_context,
      regulation,
      default_scope,
      output_mode,
      response_language,
      provider,
      model,
      remember_api_key,
      api_key_encrypted,
      updated_by_user_id,
      updated_at
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      organization_context = excluded.organization_context,
      regulation = excluded.regulation,
      default_scope = excluded.default_scope,
      output_mode = excluded.output_mode,
      response_language = excluded.response_language,
      provider = excluded.provider,
      model = excluded.model,
      remember_api_key = excluded.remember_api_key,
      api_key_encrypted = excluded.api_key_encrypted,
      updated_by_user_id = excluded.updated_by_user_id,
      updated_at = CURRENT_TIMESTAMP`,
  ).run(
    settings.organizationContext,
    settings.regulation,
    settings.defaultScope,
    settings.outputMode,
    settings.responseLanguage,
    settings.provider,
    settings.model,
    settings.rememberApiKey ? 1 : 0,
    encryptedApiKey,
    user.id,
  );

  return getStoredSettings();
}

export async function saveAnalysisRun({
  outputMode,
  provider,
  result,
  scenarioId,
  scenarioTitle,
  targetScope,
  user,
}: {
  outputMode: string;
  provider: string;
  result: string;
  scenarioId: string;
  scenarioTitle: string;
  targetScope: string;
  user: AppUser;
}) {
  const db = await getSqliteDb();
  db.prepare(
    `INSERT INTO analysis_runs (
      user_id,
      scenario_id,
      scenario_title,
      provider,
      output_mode,
      target_scope,
      result
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    user.id,
    scenarioId,
    scenarioTitle,
    provider,
    outputMode,
    targetScope,
    result,
  );
  db.prepare(
    `DELETE FROM analysis_runs
      WHERE user_id = ?
        AND id NOT IN (
          SELECT id FROM analysis_runs
          WHERE user_id = ?
          ORDER BY created_at DESC, id DESC
          LIMIT ?
        )`,
  ).run(user.id, user.id, maxRunsPerUser);
}

export async function getAnalysisRuns(
  user: AppUser,
): Promise<StoredAnalysisRun[]> {
  const db = await getSqliteDb();
  const rows = db
    .prepare(
      `SELECT
        id,
        scenario_id,
        scenario_title,
        provider,
        output_mode,
        target_scope,
        result,
        created_at
      FROM analysis_runs
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?`,
    )
    .all(user.id, maxRunsPerUser) as Array<{
    created_at: string;
    id: number;
    output_mode: string;
    provider: string;
    result: string;
    scenario_id: string;
    scenario_title: string;
    target_scope: string;
  }>;

  return rows.map((row) => ({
    createdAt: row.created_at,
    id: row.id,
    outputMode: row.output_mode,
    provider: row.provider,
    result: row.result,
    scenarioId: row.scenario_id,
    scenarioTitle: row.scenario_title,
    targetScope: row.target_scope,
  }));
}

function initializeSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'self-hosted',
      role TEXT NOT NULL DEFAULT 'member',
      password_hash TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY,
      organization_context TEXT NOT NULL,
      regulation TEXT NOT NULL,
      default_scope TEXT NOT NULL,
      output_mode TEXT NOT NULL,
      response_language TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      remember_api_key INTEGER NOT NULL DEFAULT 0,
      api_key_encrypted TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      organization_context TEXT NOT NULL,
      regulation TEXT NOT NULL,
      default_scope TEXT NOT NULL,
      output_mode TEXT NOT NULL,
      response_language TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      remember_api_key INTEGER NOT NULL DEFAULT 0,
      api_key_encrypted TEXT,
      updated_by_user_id INTEGER,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS analysis_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      scenario_id TEXT NOT NULL,
      scenario_title TEXT NOT NULL,
      provider TEXT NOT NULL,
      output_mode TEXT NOT NULL,
      target_scope TEXT NOT NULL,
      result TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS analysis_runs_user_created_idx
      ON analysis_runs(user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS user_sessions_token_hash_idx
      ON user_sessions(token_hash);
  `);

  ensureColumn(db, "users", "role", "TEXT NOT NULL DEFAULT 'member'");
  ensureColumn(db, "users", "password_hash", "TEXT");
  migrateLegacySettings(db);
  db.prepare("DELETE FROM user_sessions WHERE expires_at <= ?").run(
    new Date().toISOString(),
  );
}

function ensureColumn(
  db: DatabaseSync,
  tableName: "users",
  columnName: string,
  definition: string,
) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
    name: string;
  }>;
  if (columns.some((column) => column.name === columnName)) return;
  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

function migrateLegacySettings(db: DatabaseSync) {
  const appSettingsCount = db
    .prepare("SELECT COUNT(*) AS count FROM app_settings")
    .get() as { count: number };
  if (appSettingsCount.count > 0) return;

  const legacy = db
    .prepare("SELECT * FROM user_settings ORDER BY updated_at DESC LIMIT 1")
    .get() as (SettingsRow & { user_id: number }) | undefined;
  if (!legacy) return;

  db.prepare(
    `INSERT INTO app_settings (
      id,
      organization_context,
      regulation,
      default_scope,
      output_mode,
      response_language,
      provider,
      model,
      remember_api_key,
      api_key_encrypted,
      updated_by_user_id,
      updated_at
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
  ).run(
    legacy.organization_context ?? defaultWorkbenchSettings.organizationContext,
    legacy.regulation ?? defaultWorkbenchSettings.regulation,
    legacy.default_scope ?? defaultWorkbenchSettings.defaultScope,
    legacy.output_mode ?? defaultWorkbenchSettings.outputMode,
    legacy.response_language ?? defaultWorkbenchSettings.responseLanguage,
    isProvider(legacy.provider)
      ? legacy.provider
      : defaultWorkbenchSettings.provider,
    legacy.model ?? defaultWorkbenchSettings.model,
    legacy.remember_api_key ? 1 : 0,
    legacy.api_key_encrypted,
    legacy.user_id,
  );
}

function getUserRowByEmail(
  db: DatabaseSync,
  email: string,
): UserRow | undefined {
  return db
    .prepare(
      `SELECT id, email, display_name, role, password_hash
        FROM users
        WHERE email = ?`,
    )
    .get(email) as UserRow | undefined;
}

function toAppUser(row: UserRow): AppUser {
  const displayName = row.display_name || row.email;
  return {
    displayName,
    email: row.email,
    fullName: displayName,
    id: row.id,
    role: row.role === "admin" ? "admin" : "member",
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [algorithm, salt, hash] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) return false;

  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(password, salt, expected.length);
  return (
    expected.length === actual.length && timingSafeEqual(expected, actual)
  );
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function encryptSecret(value: string): string | null {
  const secret = process.env.APP_SECRET;
  if (!secret) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(secret), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${ciphertext.toString("base64")}`;
}

function decryptSecret(value: string): string | null {
  const secret = process.env.APP_SECRET;
  if (!secret) return null;
  const [ivText, tagText, ciphertextText] = value.split(".");
  if (!ivText || !tagText || !ciphertextText) return null;

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      secretKey(secret),
      Buffer.from(ivText, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagText, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextText, "base64")),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  } catch {
    return null;
  }
}

function secretKey(secret: string) {
  return createHash("sha256").update(secret).digest();
}

function isProvider(value: unknown): value is WorkbenchSettings["provider"] {
  return (
    value === "demo" ||
    value === "openai" ||
    value === "anthropic" ||
    value === "google"
  );
}
