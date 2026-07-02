import { getCurrentUser } from "../../app-auth";
import {
  buildScenarioPrompt,
  getScenarioById,
  type ScenarioPromptInput,
} from "../../security-scenarios";
import { getStoredSettings, saveAnalysisRun } from "../../server/sqlite-store";
import { getProviderConfig } from "../../workbench-settings";

type Provider = "demo" | "openai" | "anthropic" | "google";

type AnalyzeRequest = ScenarioPromptInput & {
  provider: Provider;
  model: string;
  apiKey: string;
};

const SECURITY_SYSTEM_PROMPT =
  "You are a senior IT security department assistant. Produce concise, practical work products for security operations, GRC, risk, privacy, resilience, identity, cloud, and application security teams. Be evidence-led, mark uncertainty, avoid inventing facts, and recommend qualified legal, HR, or regulatory review when decisions depend on those domains.";

const MAX_TEXT_LENGTH = 60000;

export async function POST(request: Request) {
  let payload: AnalyzeRequest;

  try {
    payload = (await request.json()) as AnalyzeRequest;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const validationError = validateRequest(payload);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  const promptInput: ScenarioPromptInput = {
    scenarioId: payload.scenarioId,
    organizationContext: trimToLimit(payload.organizationContext),
    targetScope: trimToLimit(payload.targetScope),
    regulation: trimToLimit(payload.regulation),
    evidence: trimToLimit(payload.evidence),
    outputMode: payload.outputMode,
    responseLanguage: trimToLimit(payload.responseLanguage),
  };
  const prompt = buildScenarioPrompt(promptInput);
  const model = payload.model.trim();
  let result: string;

  try {
    if (payload.provider === "demo") {
      result = buildDemoResult(promptInput);
    } else {
      const apiKey = await resolveApiKey(payload);
      if (!apiKey) {
        return Response.json(
          { error: "API key is required for the selected provider." },
          { status: 400 },
        );
      }

      if (payload.provider === "openai") {
        result = await callOpenAI({
          apiKey,
          model,
          prompt,
        });
      } else if (payload.provider === "anthropic") {
        result = await callAnthropic({
          apiKey,
          model,
          prompt,
        });
      } else if (payload.provider === "google") {
        result = await callGoogle({
          apiKey,
          model,
          prompt,
        });
      } else {
        return Response.json({ error: "Unsupported provider." }, { status: 400 });
      }
    }
  } catch (error) {
    return Response.json(
      { error: sanitizeError(error instanceof Error ? error.message : "AI request failed.") },
      { status: 502 },
    );
  }

  await persistAnalysisRun(payload, promptInput, result, model);
  return Response.json({ result });
}

function validateRequest(payload: Partial<AnalyzeRequest>): string | null {
  if (!payload || typeof payload !== "object") return "Missing request body.";
  if (!payload.scenarioId || typeof payload.scenarioId !== "string") {
    return "Scenario is required.";
  }
  if (!payload.provider || !["demo", "openai", "anthropic", "google"].includes(payload.provider)) {
    return "Provider is invalid.";
  }
  if (!payload.model || typeof payload.model !== "string") return "Model is required.";
  if (typeof payload.outputMode !== "string") return "Output mode is required.";
  if (typeof payload.responseLanguage !== "string") {
    return "Response language is required.";
  }
  if (typeof payload.organizationContext !== "string") {
    return "Organization context must be text.";
  }
  if (typeof payload.targetScope !== "string") return "Scope must be text.";
  if (typeof payload.regulation !== "string") return "Regulation must be text.";
  if (typeof payload.evidence !== "string") return "Evidence must be text.";
  if (typeof payload.apiKey !== "string") return "API key must be text.";
  return null;
}

function trimToLimit(value: string): string {
  return value.length > MAX_TEXT_LENGTH ? value.slice(0, MAX_TEXT_LENGTH) : value;
}

async function resolveApiKey(payload: AnalyzeRequest): Promise<string> {
  const requestApiKey = payload.apiKey.trim();
  if (requestApiKey) return requestApiKey;

  const storedSettings = await getStoredSettings({ includeApiKey: true });
  if (storedSettings.provider !== payload.provider) return "";
  return storedSettings.apiKey.trim();
}

async function persistAnalysisRun(
  payload: AnalyzeRequest,
  promptInput: ScenarioPromptInput,
  result: string,
  model: string,
) {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    const provider = getProviderConfig(payload.provider);
    await saveAnalysisRun({
      outputMode: promptInput.outputMode,
      provider:
        payload.provider === "demo" ? provider.name : `${provider.name} / ${model}`,
      result,
      scenarioId: promptInput.scenarioId,
      scenarioTitle: getScenarioById(promptInput.scenarioId).title,
      targetScope: promptInput.targetScope,
      user,
    });
  } catch (error) {
    console.error("Failed to save analysis run.", error);
  }
}

async function callOpenAI({
  apiKey,
  model,
  prompt,
}: {
  apiKey: string;
  model: string;
  prompt: string;
}) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: prompt,
      instructions: SECURITY_SYSTEM_PROMPT,
      max_output_tokens: 3000,
      model,
    }),
  });

  const data = (await response.json()) as {
    error?: { message?: string };
    output?: Array<{ content?: Array<{ text?: string; type?: string }> }>;
    output_text?: string;
  };

  if (!response.ok) {
    throw new Error(data.error?.message ?? "OpenAI request failed.");
  }

  const text =
    data.output_text ??
    data.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter(Boolean)
      .join("\n");

  if (!text) throw new Error("OpenAI returned no text output.");
  return text;
}

async function callAnthropic({
  apiKey,
  model,
  prompt,
}: {
  apiKey: string;
  model: string;
  prompt: string;
}) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
      model,
      system: SECURITY_SYSTEM_PROMPT,
    }),
  });

  const data = (await response.json()) as {
    content?: Array<{ text?: string; type?: string }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Anthropic request failed.");
  }

  const text = data.content
    ?.map((item) => item.text)
    .filter(Boolean)
    .join("\n");
  if (!text) throw new Error("Anthropic returned no text output.");
  return text;
}

async function callGoogle({
  apiKey,
  model,
  prompt,
}: {
  apiKey: string;
  model: string;
  prompt: string;
}) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }], role: "user" }],
      generationConfig: {
        maxOutputTokens: 3000,
      },
      systemInstruction: {
        parts: [{ text: SECURITY_SYSTEM_PROMPT }],
      },
    }),
  });

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Google Gemini request failed.");
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join("\n");
  if (!text) throw new Error("Google Gemini returned no text output.");
  return text;
}

function buildDemoResult(input: ScenarioPromptInput): string {
  const scenario = getScenarioById(input.scenarioId);
  const regulation = input.regulation.trim() || "the selected framework";
  const scope = input.targetScope.trim() || scenario.objective;

  return [
    "1. Executive summary",
    `${scenario.title} is ready for initial security review. The current scope is ${scope}. Treat this draft as a working product until real evidence is attached and validated by the responsible control owner.`,
    "",
    "2. Facts observed",
    `- Scenario objective: ${scenario.objective}`,
    `- Regulation or framework: ${regulation}`,
    `- Expected evidence types: ${scenario.inputs.join(", ")}`,
    "",
    "3. Assumptions and evidence gaps",
    "- Evidence is incomplete until source records, owners, timestamps, and system scope are confirmed.",
    "- Regulatory conclusions require review by the accountable compliance, privacy, or legal function.",
    "- Any high-risk technical finding should be validated against logs, tickets, and configuration exports.",
    "",
    "4. Risk and control analysis",
    ...scenario.riskSignals.map((signal) => `- Review for ${signal.toLowerCase()}.`),
    ...scenario.controls.map((control) => `- Map evidence to ${control}.`),
    "",
    "5. Recommended actions with priority and owner",
    "- High: Confirm scope, affected assets, business owner, and evidence source.",
    "- High: Record open questions and assign accountable owners before approval or closure.",
    "- Medium: Prepare a remediation or improvement plan with target dates and validation evidence.",
    "- Medium: Update the control library, procedure, or exception register if this work changes operating practice.",
    "",
    "6. Questions for the requester or control owner",
    "- What systems, business processes, users, and data types are in scope?",
    "- Which evidence source proves the control operated during the review period?",
    "- Are there exceptions, compensating controls, or known incidents connected to this request?",
    "",
    "7. Draft artifact or checklist",
    ...scenario.outputs.map((output) => `- ${output}: draft pending validated evidence.`),
  ].join("\n");
}

function sanitizeError(message: string): string {
  return message
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/AIza[0-9A-Za-z_-]+/g, "[redacted]")
    .replace(/ANTHROPIC_API_KEY[0-9A-Za-z_-]*/g, "[redacted]");
}
