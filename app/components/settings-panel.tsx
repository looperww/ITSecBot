"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AppUser } from "../app-auth";
import {
  defaultWorkbenchSettings,
  getProviderConfig,
  getWorkbenchSettings,
  outputModes,
  providers,
  resetWorkbenchSettings,
  responseLanguages,
  saveWorkbenchSettings,
  type Provider,
  type WorkbenchSettings,
} from "../workbench-settings";

type SettingsPanelProps = {
  user: AppUser | null;
  signInPath: string;
  signOutPath: string;
};

type SettingsResponse = {
  error?: string;
  settings?: WorkbenchSettings;
};

export default function SettingsPanel({
  user,
  signInPath,
  signOutPath,
}: SettingsPanelProps) {
  const [settings, setSettings] = useState<WorkbenchSettings>(() =>
    getWorkbenchSettings(),
  );
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const selectedProvider = getProviderConfig(settings.provider);
  const canManageSettings = user?.role === "admin";

  useEffect(() => {
    if (!user) return;

    let isCurrent = true;

    async function loadStoredSettings() {
      setStatus("Loading saved settings");
      try {
        const response = await fetch("/api/settings", { cache: "no-store" });
        const payload = (await response.json()) as SettingsResponse;
        if (!response.ok || !payload.settings) {
          throw new Error(payload.error ?? "Saved settings could not be loaded.");
        }
        if (!isCurrent) return;

        setSettings(payload.settings);
        saveWorkbenchSettings(payload.settings);
        setStatus("Loaded from SQLite");
      } catch (error) {
        if (!isCurrent) return;
        setStatus(
          error instanceof Error
            ? error.message
            : "Saved settings could not be loaded.",
        );
      }
    }

    void loadStoredSettings();

    return () => {
      isCurrent = false;
    };
  }, [user]);

  function updateSettings(nextSettings: Partial<WorkbenchSettings>) {
    setSettings((current) => ({ ...current, ...nextSettings }));
    setStatus("");
  }

  function changeProvider(provider: Provider) {
    const nextProvider = getProviderConfig(provider);
    updateSettings({
      provider: nextProvider.id,
      model: nextProvider.defaultModel,
      apiKey: "",
      rememberApiKey: false,
    });
  }

  async function saveSettings() {
    saveWorkbenchSettings(settings);
    if (!user) {
      setStatus("Saved in this browser");
      return;
    }
    if (!canManageSettings) {
      setStatus("Only an administrator can change global settings.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/settings", {
        body: JSON.stringify({ settings }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      const payload = (await response.json()) as SettingsResponse;
      if (!response.ok || !payload.settings) {
        throw new Error(payload.error ?? "Settings could not be saved.");
      }
      setSettings(payload.settings);
      saveWorkbenchSettings(payload.settings);
      setStatus("Saved to SQLite");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Saved in this browser. SQLite save failed: ${error.message}`
          : "Saved in this browser. SQLite save failed.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function resetSettings() {
    resetWorkbenchSettings();
    setSettings(defaultWorkbenchSettings);
    if (!user) {
      setStatus("Reset in this browser");
      return;
    }
    if (!canManageSettings) {
      setStatus("Only an administrator can reset global settings.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/settings", {
        body: JSON.stringify({ settings: defaultWorkbenchSettings }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      const payload = (await response.json()) as SettingsResponse;
      if (!response.ok || !payload.settings) {
        throw new Error(payload.error ?? "Settings could not be reset.");
      }
      setSettings(payload.settings);
      saveWorkbenchSettings(payload.settings);
      setStatus("Reset in SQLite");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Reset in this browser. SQLite reset failed: ${error.message}`
          : "Reset in this browser. SQLite reset failed.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7f3] text-stone-950">
      <header className="border-b border-stone-300 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-sm font-semibold text-teal-700">SecOps AI Workbench</p>
            <h1 className="text-2xl font-semibold tracking-normal text-stone-950 sm:text-3xl">
              Settings
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:border-stone-700"
              href="/"
            >
              Workbench
            </Link>
            <span className="rounded-md border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-700">
              {user ? user.displayName : "Local browser session"}
              {user?.role === "admin" ? " - Admin" : ""}
            </span>
            <a
              className="rounded-md border border-stone-900 bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700"
              href={user ? signOutPath : signInPath}
            >
              {user ? "Sign out" : "Sign in"}
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
        <div className="rounded-lg border border-stone-300 bg-white p-4">
          <section className="grid gap-4 lg:grid-cols-2">
            <Field label="Organization context">
              <textarea
                className="min-h-36 w-full resize-y rounded-md border border-stone-300 px-3 py-2 text-sm leading-6 outline-none focus:border-teal-700"
                disabled={!canManageSettings}
                onChange={(event) =>
                  updateSettings({ organizationContext: event.target.value })
                }
                value={settings.organizationContext}
              />
            </Field>
            <Field label="Regulation or framework">
              <textarea
                className="min-h-36 w-full resize-y rounded-md border border-stone-300 px-3 py-2 text-sm leading-6 outline-none focus:border-teal-700"
                disabled={!canManageSettings}
                onChange={(event) =>
                  updateSettings({ regulation: event.target.value })
                }
                value={settings.regulation}
              />
            </Field>
          </section>

          <section className="mt-5 grid gap-4 border-t border-stone-200 pt-5 lg:grid-cols-3">
            <Field label="Default scope or request">
              <textarea
                className="h-28 w-full resize-none rounded-md border border-stone-300 px-3 py-2 text-sm leading-6 outline-none focus:border-teal-700"
                disabled={!canManageSettings}
                onChange={(event) =>
                  updateSettings({ defaultScope: event.target.value })
                }
                value={settings.defaultScope}
              />
            </Field>
            <Field label="Default output mode">
              <select
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700"
                disabled={!canManageSettings}
                onChange={(event) =>
                  updateSettings({ outputMode: event.target.value })
                }
                value={settings.outputMode}
              >
                {outputModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Response language">
              <select
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700"
                disabled={!canManageSettings}
                onChange={(event) =>
                  updateSettings({ responseLanguage: event.target.value })
                }
                value={settings.responseLanguage}
              >
                {responseLanguages.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
            </Field>
          </section>

          <section className="mt-5 grid gap-4 border-t border-stone-200 pt-5 lg:grid-cols-3">
            <Field label="AI provider">
              <select
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700"
                disabled={!canManageSettings}
                onChange={(event) =>
                  changeProvider(event.target.value as Provider)
                }
                value={settings.provider}
              >
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="AI model">
              <input
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-teal-700 disabled:bg-stone-100"
                disabled={!canManageSettings || settings.provider === "demo"}
                onChange={(event) =>
                  updateSettings({ model: event.target.value })
                }
                value={settings.model}
              />
            </Field>
            <Field label={selectedProvider.keyLabel}>
              <input
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-teal-700 disabled:bg-stone-100"
                disabled={!canManageSettings || settings.provider === "demo"}
                onChange={(event) =>
                  updateSettings({ apiKey: event.target.value })
                }
                type="password"
                value={settings.apiKey}
              />
            </Field>
          </section>

          {settings.provider !== "demo" ? (
            <section className="mt-4 border-t border-stone-200 pt-4">
              <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
                <input
                  checked={settings.rememberApiKey}
                  className="h-4 w-4"
                  disabled={!canManageSettings}
                  onChange={(event) =>
                    updateSettings({ rememberApiKey: event.target.checked })
                  }
                  type="checkbox"
                />
                {user
                  ? "Store AI token encrypted in SQLite for all users"
                  : "Store API token in this browser"}
              </label>
            </section>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4">
            <div className="text-sm font-medium text-stone-600">
              {status ||
                (canManageSettings
                  ? "Unsaved changes stay on this page"
                  : "Global settings are managed by the administrator")}
            </div>
            <div className="flex flex-wrap gap-2">
              {canManageSettings ? (
                <Link
                  className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:border-stone-700"
                  href="/auth/register"
                >
                  Create user
                </Link>
              ) : null}
              <button
                className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:border-stone-700"
                disabled={isSaving || !canManageSettings}
                onClick={() => {
                  void resetSettings();
                }}
                type="button"
              >
                Reset
              </button>
              <button
                className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                disabled={isSaving || !canManageSettings}
                onClick={() => {
                  void saveSettings();
                }}
                type="button"
              >
                {isSaving ? "Saving" : "Save settings"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-stone-700">
      <span>{label}</span>
      {children}
    </label>
  );
}
