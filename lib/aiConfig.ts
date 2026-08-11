import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

export type AiConfig = {
  openaiApiKey?: string;
  openaiModel?: string;
  freeProvider?: string;
  freeApiKey?: string;
  freeModel?: string;
  freeBaseUrl?: string;
  freeFallbacks?: string;
};

export type AiProvider = { apiKey: string; model: string; baseUrl: string };

const FREE_PROVIDER_DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-3.6-flash',
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'google/gemma-4-31b-it:free',
  },
};

function configPath(): string {
  return path.join(process.cwd(), '.agent-audit.json');
}

export function readAiConfig(): AiConfig {
  try {
    const p = configPath();
    if (!existsSync(p)) return {};
    return JSON.parse(readFileSync(p, 'utf8')) as AiConfig;
  } catch {
    return {};
  }
}

export function writeAiConfig(cfg: AiConfig) {
  const p = configPath();
  try {
    mkdirSync(path.dirname(p), { recursive: true });
  } catch {
    // directory already exists or cannot be created — fall through
  }
  writeFileSync(p, JSON.stringify(cfg, null, 2), 'utf8');
}

export function getOpenAIKey(): string {
  return process.env.OPENAI_API_KEY || readAiConfig().openaiApiKey || '';
}

export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL || readAiConfig().openaiModel || 'gpt-4o-mini';
}

export function getPaidAiProvider(): AiProvider | null {
  const apiKey = getOpenAIKey();
  if (!apiKey) return null;
  return { apiKey, model: getOpenAIModel(), baseUrl: 'https://api.openai.com/v1' };
}

export function getFreeAiProvider(): AiProvider | null {
  const cfg = readAiConfig();
  const provider = process.env.FREE_AI_PROVIDER || cfg.freeProvider || 'gemini';
  const apiKey = process.env.FREE_AI_KEY || cfg.freeApiKey || '';
  if (!apiKey) return null;
  const defaults = FREE_PROVIDER_DEFAULTS[provider] ?? FREE_PROVIDER_DEFAULTS.gemini;
  return {
    apiKey,
    model: process.env.FREE_AI_MODEL || cfg.freeModel || defaults.model,
    baseUrl: process.env.FREE_AI_BASE_URL || cfg.freeBaseUrl || defaults.baseUrl,
  };
}

export function isAiConfigured(): boolean {
  return Boolean(getOpenAIKey() || getFreeAiProvider() || getFreeAiProviders().length);
}

export function getFreeAiProviders(): AiProvider[] {
  const list: AiProvider[] = [];
  const primary = getFreeAiProvider();
  if (primary) list.push(primary);
  const cfg = readAiConfig();
  const fallbacks = (process.env.FREE_AI_FALLBACKS || cfg.freeFallbacks || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const name of fallbacks) {
    const key = process.env[`FREE_AI_${name.toUpperCase()}_KEY`] || '';
    if (!key) continue;
    const defaults = FREE_PROVIDER_DEFAULTS[name] ?? FREE_PROVIDER_DEFAULTS.gemini;
    list.push({ apiKey: key, model: defaults.model, baseUrl: defaults.baseUrl });
  }
  return list;
}
