"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { AppUser } from "../app-auth";
import {
  defaultScenarioId,
  scenarioCategories,
  scenarios,
  type SecurityScenario,
} from "../security-scenarios";
import {
  getDefaultWorkbenchSettingsSnapshot,
  getProviderConfig,
  getWorkbenchSettingsSnapshot,
  outputModes,
  parseWorkbenchSettingsSnapshot,
  saveWorkbenchSettings,
  subscribeWorkbenchSettings,
} from "../workbench-settings";

type WorkbenchProps = {
  user: AppUser | null;
  signInPath: string;
  signOutPath: string;
};

type RunHistoryItem = {
  id: string;
  provider: string;
  scenarioTitle: string;
  timestamp: string;
  result: string;
};

type SettingsResponse = {
  settings?: ReturnType<typeof parseWorkbenchSettingsSnapshot>;
};

type RunsResponse = {
  runs?: Array<{
    createdAt: string;
    id: number;
    provider: string;
    result: string;
    scenarioTitle: string;
  }>;
};

const sampleEvidence =
  "Subject: Urgent invoice payment required today\nFrom: finance-approval@example-payments.com\nTo: accounts.payable@company.example\n\nHello,\n\nPlease review the attached invoice and approve payment before close of business. Use the Microsoft 365 sign-in page below to confirm approval.\n\nhttps://login.company-example.review/approve\n\nRegards,\nFinance Approval";

const maxTextUploadBytes = 2 * 1024 * 1024;
const maxPdfUploadBytes = 10 * 1024 * 1024;
const maxImportedCharacters = 55000;
const maxPdfPages = 80;
const textFileExtensions = new Set([
  "csv",
  "eml",
  "htm",
  "html",
  "ics",
  "ini",
  "json",
  "log",
  "md",
  "text",
  "txt",
  "xml",
  "yaml",
  "yml",
]);
const textMimeTypes = new Set([
  "application/csv",
  "application/json",
  "application/xml",
  "message/rfc822",
  "text/calendar",
  "text/csv",
  "text/html",
  "text/markdown",
  "text/plain",
  "text/xml",
  "text/yaml",
]);

export default function SecurityWorkbench({
  user,
  signInPath,
  signOutPath,
}: WorkbenchProps) {
  const settingsSnapshot = useSyncExternalStore(
    subscribeWorkbenchSettings,
    getWorkbenchSettingsSnapshot,
    getDefaultWorkbenchSettingsSnapshot,
  );
  const settings = useMemo(
    () => parseWorkbenchSettingsSnapshot(settingsSnapshot),
    [settingsSnapshot],
  );
  const selectedProvider = getProviderConfig(settings.provider);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedScenarioId, setSelectedScenarioId] = useState(defaultScenarioId);
  const [query, setQuery] = useState("");
  const [targetScope, setTargetScope] = useState(settings.defaultScope);
  const [outputMode, setOutputMode] = useState(settings.outputMode);
  const [evidence, setEvidence] = useState(sampleEvidence);
  const [result, setResult] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState("");
  const [fileStatus, setFileStatus] = useState("");
  const [history, setHistory] = useState<RunHistoryItem[]>([]);

  useEffect(() => {
    if (!user) return;

    let isCurrent = true;

    async function loadStoredSettings() {
      try {
        const response = await fetch("/api/settings", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as SettingsResponse;
        if (!payload.settings || !isCurrent) return;

        saveWorkbenchSettings(payload.settings);
        setTargetScope(payload.settings.defaultScope);
        setOutputMode(payload.settings.outputMode);
      } catch {
        return;
      }
    }

    void loadStoredSettings();

    return () => {
      isCurrent = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let isCurrent = true;

    async function loadRecentRuns() {
      try {
        const response = await fetch("/api/runs", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as RunsResponse;
        if (!payload.runs || !isCurrent) return;

        setHistory(
          payload.runs.map((run) => ({
            id: `${run.id}`,
            provider: run.provider,
            result: run.result,
            scenarioTitle: run.scenarioTitle,
            timestamp: formatRunTimestamp(run.createdAt),
          })),
        );
      } catch {
        return;
      }
    }

    void loadRecentRuns();

    return () => {
      isCurrent = false;
    };
  }, [user]);

  const selectedScenario =
    scenarios.find((scenario) => scenario.id === selectedScenarioId) ??
    scenarios[0];

  const filteredScenarios = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return scenarios.filter((scenario) => {
      const matchesCategory =
        selectedCategory === "all" || scenario.categoryId === selectedCategory;
      const matchesQuery =
        !normalizedQuery ||
        `${scenario.title} ${scenario.objective} ${scenario.inputs.join(" ")} ${scenario.outputs.join(" ")}`
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [query, selectedCategory]);

  const categoryCounts = useMemo(() => {
    return scenarioCategories.map((category) => ({
      ...category,
      count: scenarios.filter((scenario) => scenario.categoryId === category.id)
        .length,
    }));
  }, []);

  function selectScenario(scenario: SecurityScenario) {
    setSelectedScenarioId(scenario.id);
    setTargetScope(scenario.objective);
    setResult("");
    setError("");
  }

  async function importEvidenceFile(file: File | null) {
    setError("");
    setFileStatus("");
    if (!file) return;

    if (isPdfFile(file)) {
      if (file.size > maxPdfUploadBytes) {
        setError(`PDF is too large. Maximum size is ${formatBytes(maxPdfUploadBytes)}.`);
        return;
      }
      try {
        setFileStatus(`Reading ${file.name}`);
        const rawText = await extractPdfText(file);
        if (!rawText.trim()) {
          setError("No selectable text was found in this PDF.");
          setFileStatus("");
          return;
        }
        setEvidence(buildImportedFileBlock(file, rawText, "PDF"));
        setFileStatus(`${file.name} imported`);
      } catch {
        setFileStatus("");
        setError("The PDF could not be read by the browser.");
      }
      return;
    }

    if (file.size > maxTextUploadBytes) {
      setError(`File is too large. Maximum size is ${formatBytes(maxTextUploadBytes)}.`);
      return;
    }

    if (!isSupportedTextFile(file)) {
      setError("Unsupported file type. Use a text-based evidence file.");
      return;
    }

    try {
      const rawText = await file.text();
      setEvidence(buildImportedFileBlock(file, rawText, file.type || "text"));
      setFileStatus(`${file.name} imported`);
    } catch {
      setError("The file could not be read by the browser.");
    }
  }

  async function runAnalysis() {
    setError("");
    setResult("");

    if (settings.provider !== "demo" && !settings.apiKey.trim() && !user) {
      setError("Add an API token in Settings before running this provider.");
      return;
    }

    setIsRunning(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: selectedScenario.id,
          provider: settings.provider,
          model: settings.model,
          apiKey: settings.apiKey,
          organizationContext: settings.organizationContext,
          targetScope,
          regulation: settings.regulation,
          evidence,
          outputMode,
          responseLanguage: settings.responseLanguage,
        }),
      });
      const payload = (await response.json()) as {
        result?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Analysis failed");
      }
      const nextResult = payload.result ?? "";
      setResult(nextResult);
      if (nextResult) {
        setHistory((items) =>
          [
            {
              id: `${Date.now()}`,
              provider: selectedProvider.name,
              result: nextResult,
              scenarioTitle: selectedScenario.title,
              timestamp: new Date().toLocaleString(),
            },
            ...items,
          ].slice(0, 5),
        );
      }
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "Analysis failed",
      );
    } finally {
      setIsRunning(false);
    }
  }

  async function copyResult() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
  }

  function exportResult() {
    if (!result) return;
    const blob = new Blob([result], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedScenario.id}-${Date.now()}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#f6f7f3] text-stone-950">
      <header className="border-b border-stone-300 bg-white">
        <div className="mx-auto flex max-w-[1520px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-sm font-semibold text-teal-700">SecOps AI Workbench</p>
            <h1 className="text-2xl font-semibold tracking-normal text-stone-950 sm:text-3xl">
              IT security department task console
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:border-stone-700"
              href="/settings"
            >
              Settings
            </Link>
            <span className="rounded-md border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-700">
              {user ? user.displayName : "Local browser session"}
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

      <section className="border-b border-stone-300 bg-stone-100">
        <div className="mx-auto grid max-w-[1520px] gap-3 px-4 py-3 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 xl:grid-cols-8">
          {categoryCounts.map((category) => (
            <button
              className={`min-h-24 rounded-lg border px-3 py-3 text-left transition ${
                selectedCategory === category.id
                  ? "border-stone-900 bg-white shadow-sm"
                  : "border-stone-300 bg-[#f8f8f4] hover:border-stone-500"
              }`}
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              type="button"
            >
              <span className={`mb-3 block h-2 w-12 rounded-sm ${category.color}`} />
              <span className="block text-sm font-semibold text-stone-950">
                {category.name}
              </span>
              <span className="mt-1 block text-xs text-stone-600">
                {category.count} workflows
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="mx-auto grid max-w-[1520px] gap-4 px-4 py-4 sm:px-6 xl:grid-cols-[330px_minmax(0,1fr)_420px]">
        <aside className="rounded-lg border border-stone-300 bg-white">
          <div className="border-b border-stone-200 p-3">
            <div className="flex gap-2">
              <button
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  selectedCategory === "all"
                    ? "border-teal-700 bg-teal-700 text-white"
                    : "border-stone-300 bg-white text-stone-700"
                }`}
                onClick={() => setSelectedCategory("all")}
                type="button"
              >
                All
              </button>
              <input
                className="min-w-0 flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-teal-700"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search workflows"
                value={query}
              />
            </div>
          </div>
          <div className="max-h-[740px] overflow-y-auto p-2">
            {filteredScenarios.map((scenario) => {
              const category = scenarioCategories.find(
                (item) => item.id === scenario.categoryId,
              );
              return (
                <button
                  className={`mb-2 w-full rounded-lg border p-3 text-left transition ${
                    selectedScenario.id === scenario.id
                      ? "border-teal-700 bg-teal-50"
                      : "border-stone-200 bg-white hover:border-stone-400"
                  }`}
                  key={scenario.id}
                  onClick={() => selectScenario(scenario)}
                  type="button"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-sm ${
                        category?.color ?? "bg-stone-500"
                      }`}
                    />
                    <span className="text-sm font-semibold text-stone-950">
                      {scenario.title}
                    </span>
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-stone-600">
                    {scenario.objective}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="grid content-start gap-4">
          <div className="rounded-lg border border-stone-300 bg-white p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-teal-700">
                  {scenarioCategories.find(
                    (category) => category.id === selectedScenario.categoryId,
                  )?.name ?? "Workflow"}
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-normal">
                  {selectedScenario.title}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-700">
                  {selectedScenario.objective}
                </p>
              </div>
              <div className="grid min-w-60 grid-cols-2 gap-4 border-l border-stone-200 pl-4 text-sm">
                <div>
                  <span className="block text-xs text-stone-500">Inputs</span>
                  <span className="font-semibold">{selectedScenario.inputs.length}</span>
                </div>
                <div>
                  <span className="block text-xs text-stone-500">Outputs</span>
                  <span className="font-semibold">{selectedScenario.outputs.length}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 border-t border-stone-200 pt-4 md:grid-cols-3">
              <SummaryItem
                label="AI"
                value={
                  settings.provider === "demo"
                    ? selectedProvider.name
                    : `${selectedProvider.name} / ${settings.model}`
                }
              />
              <SummaryItem
                label="Framework"
                value={settings.regulation || "Not set"}
              />
              <SummaryItem label="Language" value={settings.responseLanguage} />
            </div>
          </div>

          <div className="rounded-lg border border-stone-300 bg-white p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="grid gap-3">
                <Field label="Scope or request">
                  <textarea
                    className="h-24 w-full resize-none rounded-md border border-stone-300 px-3 py-2 text-sm leading-6 outline-none focus:border-teal-700"
                    onChange={(event) => setTargetScope(event.target.value)}
                    value={targetScope}
                  />
                </Field>
                <Field label="Evidence and working notes">
                  <div className="grid gap-2">
                    <div className="flex flex-wrap items-center gap-2 rounded-md border border-stone-300 bg-stone-50 p-2">
                      <input
                        accept=".csv,.eml,.htm,.html,.ics,.ini,.json,.log,.md,.pdf,.txt,.xml,.yaml,.yml,application/json,application/pdf,message/rfc822,text/*"
                        className="block min-w-0 flex-1 text-sm text-stone-700 file:mr-3 file:rounded-md file:border-0 file:bg-stone-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-stone-700"
                        onChange={(event) => {
                          void importEvidenceFile(event.target.files?.[0] ?? null);
                          event.currentTarget.value = "";
                        }}
                        type="file"
                      />
                      {fileStatus ? (
                        <span className="text-xs font-semibold text-teal-700">
                          {fileStatus}
                        </span>
                      ) : null}
                    </div>
                    <textarea
                      className="min-h-96 w-full resize-y rounded-md border border-stone-300 px-3 py-3 text-sm leading-6 outline-none focus:border-teal-700"
                      onChange={(event) => {
                        setEvidence(event.target.value);
                        setFileStatus("");
                      }}
                      value={evidence}
                    />
                  </div>
                </Field>
              </div>
              <div className="grid content-start gap-4">
                <Field label="Output mode">
                  <div className="grid grid-cols-2 gap-2">
                    {outputModes.map((mode) => (
                      <button
                        className={`rounded-md border px-3 py-2 text-sm font-medium ${
                          outputMode === mode
                            ? "border-teal-700 bg-teal-700 text-white"
                            : "border-stone-300 bg-white text-stone-700"
                        }`}
                        key={mode}
                        onClick={() => setOutputMode(mode)}
                        type="button"
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </Field>
                <button
                  className="rounded-md bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                  disabled={isRunning}
                  onClick={runAnalysis}
                  type="button"
                >
                  {isRunning ? "Running" : "Run AI workbench"}
                </button>
                {error ? (
                  <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
                    {error}
                  </p>
                ) : null}
                <div className="border-t border-stone-200 pt-3">
                  <p className="text-sm font-semibold">Expected deliverables</p>
                  <ul className="mt-2 grid gap-2 text-sm text-stone-700">
                    {selectedScenario.outputs.map((output) => (
                      <li className="flex gap-2" key={output}>
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-sm bg-teal-700" />
                        <span>{output}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-stone-200 pt-3">
                  <p className="text-sm font-semibold">Risk signals</p>
                  <ul className="mt-2 grid gap-2 text-sm text-stone-700">
                    {selectedScenario.riskSignals.map((signal) => (
                      <li className="flex gap-2" key={signal}>
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-sm bg-amber-500" />
                        <span>{signal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="grid content-start gap-4">
          <div className="rounded-lg border border-stone-300 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-normal">Work product</h2>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="rounded-md border border-stone-300 bg-stone-50 px-2 py-1 text-xs text-stone-600">
                  {outputMode}
                </span>
                <button
                  className="rounded-md border border-stone-300 px-2 py-1 text-xs font-medium text-stone-700 disabled:cursor-not-allowed disabled:text-stone-400"
                  disabled={!result}
                  onClick={copyResult}
                  type="button"
                >
                  Copy
                </button>
                <button
                  className="rounded-md border border-stone-300 px-2 py-1 text-xs font-medium text-stone-700 disabled:cursor-not-allowed disabled:text-stone-400"
                  disabled={!result}
                  onClick={exportResult}
                  type="button"
                >
                  Export .md
                </button>
              </div>
            </div>
            <pre className="mt-3 min-h-96 whitespace-pre-wrap rounded-md border border-stone-200 bg-[#fbfbf8] p-3 text-sm leading-6 text-stone-800">
              {result || "No work product yet."}
            </pre>
          </div>
          {history.length ? (
            <div className="rounded-lg border border-stone-300 bg-white p-4">
              <h2 className="text-lg font-semibold tracking-normal">Recent runs</h2>
              <div className="mt-3 grid gap-2">
                {history.map((item) => (
                  <button
                    className="rounded-md border border-stone-200 bg-white p-3 text-left hover:border-stone-500"
                    key={item.id}
                    onClick={() => setResult(item.result)}
                    type="button"
                  >
                    <span className="block text-sm font-semibold text-stone-950">
                      {item.scenarioTitle}
                    </span>
                    <span className="mt-1 block text-xs text-stone-600">
                      {item.provider} - {item.timestamp}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
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

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="block text-xs font-medium text-stone-500">{label}</span>
      <span className="mt-1 block break-words text-sm font-semibold text-stone-900">
        {value}
      </span>
    </div>
  );
}

function isSupportedTextFile(file: File) {
  if (file.type.startsWith("text/") || textMimeTypes.has(file.type)) {
    return true;
  }
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension ? textFileExtensions.has(extension) : false;
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function buildImportedFileBlock(file: File, rawText: string, type: string) {
  const importedText =
    rawText.length > maxImportedCharacters
      ? `${rawText.slice(0, maxImportedCharacters)}\n\n[Imported file truncated at ${maxImportedCharacters.toLocaleString()} characters.]`
      : rawText;

  return [
    `Uploaded file: ${file.name}`,
    `Size: ${formatBytes(file.size)}`,
    `Type: ${type}`,
    "",
    importedText,
  ].join("\n");
}

async function extractPdfText(file: File) {
  const pdfjs = await import("pdfjs-dist");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    disableWorker: true,
    isEvalSupported: false,
  });
  const pdf = await loadingTask.promise;
  const pageCount = Math.min(pdf.numPages, maxPdfPages);
  const pages: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => {
          if (!("str" in item)) return "";
          const value = item.str;
          return typeof value === "string" ? value : "";
        })
        .filter(Boolean)
        .join(" ");

      pages.push(`--- Page ${pageNumber} ---\n${pageText}`);

      if (pages.join("\n\n").length > maxImportedCharacters) break;
      page.cleanup();
    }
  } finally {
    await pdf.destroy();
  }

  const limitedNotice =
    pdf.numPages > maxPdfPages
      ? `\n\n[Only the first ${maxPdfPages} pages were imported from this PDF.]`
      : "";

  return `${pages.join("\n\n")}${limitedNotice}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${kilobytes.toFixed(1)} KB`;
  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

function formatRunTimestamp(createdAt: string) {
  const normalizedTimestamp = /^\d{4}-\d{2}-\d{2} /.test(createdAt)
    ? `${createdAt.replace(" ", "T")}Z`
    : createdAt;
  const date = new Date(normalizedTimestamp);
  return Number.isNaN(date.valueOf()) ? createdAt : date.toLocaleString();
}
