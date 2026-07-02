export type Provider = "demo" | "openai" | "anthropic" | "google";

export type ProviderConfig = {
  id: Provider;
  name: string;
  defaultModel: string;
  keyLabel: string;
};

export type WorkbenchSettings = {
  organizationContext: string;
  regulation: string;
  defaultScope: string;
  outputMode: string;
  responseLanguage: string;
  provider: Provider;
  model: string;
  apiKey: string;
  rememberApiKey: boolean;
};

const SETTINGS_STORAGE_KEY = "secops-ai-workbench-settings";
const SESSION_API_KEY_STORAGE_KEY = "secops-ai-workbench-session-api-key";
const LOCAL_API_KEY_STORAGE_KEY = "secops-ai-workbench-api-key";
const SETTINGS_CHANGED_EVENT = "secops-ai-workbench-settings-change";

export const providers: ProviderConfig[] = [
  {
    id: "demo",
    name: "Draft Mode",
    defaultModel: "local-template",
    keyLabel: "No key required",
  },
  {
    id: "openai",
    name: "ChatGPT / OpenAI",
    defaultModel: "gpt-5.4-mini",
    keyLabel: "OpenAI API key",
  },
  {
    id: "anthropic",
    name: "Claude",
    defaultModel: "claude-sonnet-4-6",
    keyLabel: "Anthropic API key",
  },
  {
    id: "google",
    name: "Gemini",
    defaultModel: "gemini-3.1-flash",
    keyLabel: "Google AI Studio key",
  },
];

export const outputModes = [
  "Analysis",
  "Checklist",
  "Policy Draft",
  "Audit Workpaper",
  "Pen Test Report",
  "Executive Summary",
  "Language Review",
];

export const responseLanguages = [
  "English",
  "French",
  "German",
  "Luxembourgish",
  "Chinese",
];

export const defaultWorkbenchSettings: WorkbenchSettings = {
  organizationContext:
    "Mid-sized financial services company with Microsoft 365, cloud-hosted customer systems, and EU personal data.",
  regulation: "ISO 27001, NIS2, GDPR",
  defaultScope: "Email security and user reporting workflow",
  outputMode: outputModes[0],
  responseLanguage: responseLanguages[0],
  provider: "demo",
  model: providers[0].defaultModel,
  apiKey: "",
  rememberApiKey: false,
};

export function getProviderConfig(provider: Provider): ProviderConfig {
  return providers.find((item) => item.id === provider) ?? providers[0];
}

export function getWorkbenchSettings(): WorkbenchSettings {
  if (typeof window === "undefined") return defaultWorkbenchSettings;

  const rawSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  const parsedSettings = parseSettings(rawSettings);
  const normalized = normalizeSettings(parsedSettings);
  const localApiKey = normalized.rememberApiKey
    ? window.localStorage.getItem(LOCAL_API_KEY_STORAGE_KEY)
    : null;
  const sessionApiKey = !normalized.rememberApiKey
    ? window.sessionStorage.getItem(SESSION_API_KEY_STORAGE_KEY)
    : null;
  const legacyApiKey =
    window.localStorage.getItem(`secops-ai-key-${normalized.provider}`) ?? "";

  return {
    ...normalized,
    apiKey: localApiKey ?? sessionApiKey ?? legacyApiKey,
  };
}

export function saveWorkbenchSettings(settings: WorkbenchSettings) {
  if (typeof window === "undefined") return;

  const normalized = normalizeSettings(settings);
  const persistedSettings: WorkbenchSettings = {
    ...normalized,
    apiKey: normalized.rememberApiKey ? normalized.apiKey : "",
  };

  window.localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify(persistedSettings),
  );

  if (normalized.rememberApiKey && normalized.apiKey) {
    window.localStorage.setItem(LOCAL_API_KEY_STORAGE_KEY, normalized.apiKey);
    window.sessionStorage.removeItem(SESSION_API_KEY_STORAGE_KEY);
  } else {
    window.localStorage.removeItem(LOCAL_API_KEY_STORAGE_KEY);
    if (normalized.apiKey) {
      window.sessionStorage.setItem(
        SESSION_API_KEY_STORAGE_KEY,
        normalized.apiKey,
      );
    } else {
      window.sessionStorage.removeItem(SESSION_API_KEY_STORAGE_KEY);
    }
  }

  window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT));
}

export function resetWorkbenchSettings() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
  window.localStorage.removeItem(LOCAL_API_KEY_STORAGE_KEY);
  window.sessionStorage.removeItem(SESSION_API_KEY_STORAGE_KEY);
  providers.forEach((provider) => {
    window.localStorage.removeItem(`secops-ai-key-${provider.id}`);
  });
  window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT));
}

export function subscribeWorkbenchSettings(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", listener);
  window.addEventListener(SETTINGS_CHANGED_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(SETTINGS_CHANGED_EVENT, listener);
  };
}

export function getWorkbenchSettingsSnapshot(): string {
  return JSON.stringify(getWorkbenchSettings());
}

export function getDefaultWorkbenchSettingsSnapshot(): string {
  return JSON.stringify(defaultWorkbenchSettings);
}

export function parseWorkbenchSettingsSnapshot(
  snapshot: string,
): WorkbenchSettings {
  return normalizeSettings(parseSettings(snapshot));
}

function parseSettings(rawSettings: string | null): Partial<WorkbenchSettings> {
  if (!rawSettings) return {};
  try {
    const parsed = JSON.parse(rawSettings) as Partial<WorkbenchSettings>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeSettings(
  settings: Partial<WorkbenchSettings>,
): WorkbenchSettings {
  const provider = isProvider(settings.provider)
    ? settings.provider
    : defaultWorkbenchSettings.provider;
  const providerConfig = getProviderConfig(provider);
  const outputMode =
    typeof settings.outputMode === "string" &&
    outputModes.includes(settings.outputMode)
      ? settings.outputMode
      : defaultWorkbenchSettings.outputMode;
  const responseLanguage =
    typeof settings.responseLanguage === "string" &&
    responseLanguages.includes(settings.responseLanguage)
      ? settings.responseLanguage
      : defaultWorkbenchSettings.responseLanguage;

  return {
    organizationContext:
      typeof settings.organizationContext === "string"
        ? settings.organizationContext
        : defaultWorkbenchSettings.organizationContext,
    regulation:
      typeof settings.regulation === "string"
        ? settings.regulation
        : defaultWorkbenchSettings.regulation,
    defaultScope:
      typeof settings.defaultScope === "string"
        ? settings.defaultScope
        : defaultWorkbenchSettings.defaultScope,
    outputMode,
    responseLanguage,
    provider,
    model:
      typeof settings.model === "string" && settings.model.trim()
        ? settings.model
        : providerConfig.defaultModel,
    apiKey: typeof settings.apiKey === "string" ? settings.apiKey : "",
    rememberApiKey: Boolean(settings.rememberApiKey),
  };
}

function isProvider(value: unknown): value is Provider {
  return (
    value === "demo" ||
    value === "openai" ||
    value === "anthropic" ||
    value === "google"
  );
}
