/**
 * Free Model Rotator for VeloAI
 * 
 * Fetches all FREE models from OpenRouter's /api/v1/models endpoint,
 * caches them in memory (and localStorage), and provides automatic
 * rotation when a model fails — so the user never has to manually
 * change models in the code.
 */

export interface FreeModel {
  id: string;
  name: string;
  contextLength: number;
  modality: string;
}

const CACHE_KEY = "finance_velo_free_models";
const CACHE_TTL = 6 * 60 * 60 * 1000;  // 6 hours
const FAILED_KEY = "finance_velo_failed_models";
const FAILED_TTL = 30 * 60 * 1000;     // 30 min cooldown for failed models

let memoryCache: FreeModel[] | null = null;
let memoryCacheTime = 0;

/**
 * Fetch free models from OpenRouter API, filtering for:
 * - prompt price === "0" AND completion price === "0"
 * - text input supported
 * - text output supported
 * - not a batch model
 * - has a reasonable context length (>= 4096)
 */
export async function fetchFreeModels(): Promise<FreeModel[]> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const models: FreeModel[] = [];

    for (const m of json.data || []) {
      const promptPrice = parseFloat(m.pricing?.prompt || "1");
      const completionPrice = parseFloat(m.pricing?.completion || "1");

      if (promptPrice !== 0 || completionPrice !== 0) continue;

      // Skip batch variants
      if (m.id.includes(":batch")) continue;

      // Must support text input and text output
      const inputMods: string[] = m.architecture?.input_modalities || [];
      const outputMods: string[] = m.architecture?.output_modalities || [];
      if (!inputMods.includes("text") || !outputMods.includes("text")) continue;

      // Must have reasonable context
      const ctx = m.top_provider?.context_length || m.context_length || 0;
      if (ctx < 4096) continue;

      models.push({
        id: m.id,
        name: m.name || m.id,
        contextLength: ctx,
        modality: m.architecture?.modality || "text->text",
      });
    }

    // Sort: prefer larger context, then alphabetical
    models.sort((a, b) => b.contextLength - a.contextLength || a.id.localeCompare(b.id));

    return models;
  } catch (err) {
    console.warn("[FreeModelRotator] Failed to fetch models:", err);
    return [];
  }
}

/**
 * Get cached free models (from memory → localStorage → fresh fetch).
 */
export async function getFreeModels(): Promise<FreeModel[]> {
  const now = Date.now();

  // 1. Memory cache
  if (memoryCache && (now - memoryCacheTime) < CACHE_TTL) {
    return memoryCache;
  }

  // 2. LocalStorage cache
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.time && (now - parsed.time) < CACHE_TTL && Array.isArray(parsed.models) && parsed.models.length > 0) {
        memoryCache = parsed.models;
        memoryCacheTime = parsed.time;
        return memoryCache!;
      }
    }
  } catch { /* ignore */ }

  // 3. Fresh fetch
  const fresh = await fetchFreeModels();
  if (fresh.length > 0) {
    memoryCache = fresh;
    memoryCacheTime = now;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ models: fresh, time: now }));
    } catch { /* ignore */ }
  }

  return fresh;
}

/**
 * Get the set of recently failed model IDs (with cooldown).
 */
function getFailedModels(): Set<string> {
  try {
    const stored = localStorage.getItem(FAILED_KEY);
    if (!stored) return new Set();
    const parsed = JSON.parse(stored);
    const now = Date.now();
    const active: Record<string, number> = {};
    for (const [id, ts] of Object.entries(parsed)) {
      if (now - (ts as number) < FAILED_TTL) {
        active[id] = ts as number;
      }
    }
    // Clean up expired entries
    localStorage.setItem(FAILED_KEY, JSON.stringify(active));
    return new Set(Object.keys(active));
  } catch {
    return new Set();
  }
}

/**
 * Mark a model as failed (enters 30-min cooldown).
 */
export function markModelFailed(modelId: string): void {
  try {
    const stored = localStorage.getItem(FAILED_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    parsed[modelId] = Date.now();
    localStorage.setItem(FAILED_KEY, JSON.stringify(parsed));
  } catch { /* ignore */ }
  console.warn(`[FreeModelRotator] Marked model as failed: ${modelId}`);
}

/**
 * Get an ordered list of free models to try, excluding recently failed ones.
 * Falls back to all models if everything is on cooldown.
 */
export async function getModelsToTry(): Promise<FreeModel[]> {
  const allModels = await getFreeModels();
  if (allModels.length === 0) return [];

  const failed = getFailedModels();
  const healthy = allModels.filter(m => !failed.has(m.id));

  // If all models are on cooldown, just try all of them again
  return healthy.length > 0 ? healthy : allModels;
}

/**
 * Clear the failed models cooldown (useful for manual reset).
 */
export function clearFailedModels(): void {
  try { localStorage.removeItem(FAILED_KEY); } catch { /* ignore */ }
}

/**
 * Clear the cached model list (forces a re-fetch next time).
 */
export function clearModelCache(): void {
  memoryCache = null;
  memoryCacheTime = 0;
  try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}
