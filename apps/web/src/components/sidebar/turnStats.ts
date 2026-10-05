import type {
  OrchestrationV2ThreadProjection,
  ProviderTurnId,
} from "@t3tools/contracts";

export interface TurnStatsSnapshot {
  readonly headlineToksPerSec: string | null;
  readonly responseToksPerSec: string | null;
  readonly wholeTurnToksPerSec: string | null;
  readonly modelTime: string | null;
  readonly toolTime: string | null;
  readonly steps: number | null;
  readonly inputTokensFormatted: string | null;
  readonly outputTokensFormatted: string | null;
  readonly cachePercent: number | null;
  readonly costFormatted: string | null;
  readonly raw: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly cachedTokens: number;
    readonly modelTimeMs: number;
    readonly toolTimeMs: number;
    readonly totalTimeMs: number;
    readonly costUsd: number | null;
  };
}

/** Formats milliseconds into clean compact strings e.g. "45s", "1m16s", "27m19s", "1h05m". */
export function formatTurnDuration(ms: number | null | undefined): string | null {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) {
    return null;
  }
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const totalMinutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  if (totalMinutes < 60) {
    return `${totalMinutes}m${remainingSeconds.toString().padStart(2, "0")}s`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  return `${hours}h${remainingMinutes.toString().padStart(2, "0")}m`;
}

/** Formats token speeds into "~115 tok/s". */
export function formatTokenSpeed(tokensPerSec: number | null | undefined): string | null {
  if (tokensPerSec === null || tokensPerSec === undefined || !Number.isFinite(tokensPerSec) || tokensPerSec <= 0) {
    return null;
  }
  return `~${Math.round(tokensPerSec)} tok/s`;
}

/** Formats token counts e.g. "238.0K", "11.6K", "950". */
export function formatTokenCount(tokens: number | null | undefined): string | null {
  if (tokens === null || tokens === undefined || !Number.isFinite(tokens) || tokens < 0) {
    return null;
  }
  if (tokens < 1000) {
    return `${Math.round(tokens)}`;
  }
  if (tokens < 1_000_000) {
    const k = tokens / 1000;
    return `${k >= 100 ? k.toFixed(1) : k.toFixed(1)}K`;
  }
  const m = tokens / 1_000_000;
  return `${m.toFixed(1)}M`;
}

/** Formats cost in USD e.g. "$4.655" or "$0.024". */
export function formatTurnCost(costUsd: number | null | undefined): string | null {
  if (costUsd === null || costUsd === undefined || !Number.isFinite(costUsd) || costUsd < 0) {
    return null;
  }
  if (costUsd === 0) {
    return "$0.00";
  }
  if (costUsd < 0.01) {
    return `$${costUsd.toFixed(4)}`;
  }
  return `$${costUsd.toFixed(3)}`;
}

const TOOL_ITEM_TYPES = new Set([
  "command_execution",
  "file_search",
  "web_search",
  "file_change",
  "checkpoint",
  "approval_request",
  "user_input_request",
  "todo_list",
  "proposed_plan",
]);

/**
 * Derives turn statistics for the specified turn (or the latest completed/active turn)
 * from a thread projection.
 */
export function deriveTurnStats(
  projection: OrchestrationV2ThreadProjection | null | undefined,
  targetTurnId?: ProviderTurnId | null,
): TurnStatsSnapshot | null {
  if (!projection || !projection.providerTurns || projection.providerTurns.length === 0) {
    return null;
  }

  // Find target turn or latest turn that has started
  let activeTurn = null;
  if (targetTurnId) {
    activeTurn = projection.providerTurns.find((t) => t.id === targetTurnId) ?? null;
  }
  if (!activeTurn) {
    for (let i = projection.providerTurns.length - 1; i >= 0; i--) {
      const candidate = projection.providerTurns[i];
      if (candidate && (candidate.status === "completed" || candidate.status === "running")) {
        activeTurn = candidate;
        break;
      }
    }
  }

  if (!activeTurn) {
    return null;
  }

  // Derive tokens
  const tokenUsage = activeTurn.tokenUsage;
  const turnTokenUsage = activeTurn.turnTokenUsage;

  const inputTokens =
    (turnTokenUsage && "inputTokens" in turnTokenUsage && turnTokenUsage.inputTokens) ||
    tokenUsage?.inputTokens ||
    0;
  const outputTokens =
    (turnTokenUsage && "outputTokens" in turnTokenUsage && turnTokenUsage.outputTokens) ||
    tokenUsage?.outputTokens ||
    0;
  const cachedTokens =
    (turnTokenUsage && turnTokenUsage.cachedInputTokens) ||
    tokenUsage?.cachedInputTokens ||
    0;

  const totalInputTokens = inputTokens + cachedTokens;
  const cachePercent =
    totalInputTokens > 0 ? Math.round((cachedTokens / totalInputTokens) * 100) : null;

  // Derive turn timing
  const startedAt = activeTurn.startedAt ? Date.parse(activeTurn.startedAt) : null;
  const completedAt = activeTurn.completedAt
    ? Date.parse(activeTurn.completedAt)
    : startedAt
      ? Date.now()
      : null;

  const totalTurnMs =
    startedAt && completedAt && completedAt >= startedAt ? completedAt - startedAt : 0;

  // Filter turn items belonging to this turn
  const turnItems = (projection.turnItems ?? []).filter(
    (item) => item.providerTurnId === activeTurn.id,
  );

  let toolTimeMs = 0;
  let stepsCount = 0;

  for (const item of turnItems) {
    stepsCount += 1;
    if (TOOL_ITEM_TYPES.has(item.type)) {
      const itemStart = item.startedAt ? Date.parse(item.startedAt) : null;
      const itemEnd = item.completedAt
        ? Date.parse(item.completedAt)
        : itemStart
          ? Date.now()
          : null;
      if (itemStart && itemEnd && itemEnd >= itemStart) {
        toolTimeMs += itemEnd - itemStart;
      }
    }
  }

  // Bound tool time to total turn duration
  if (totalTurnMs > 0 && toolTimeMs > totalTurnMs) {
    toolTimeMs = totalTurnMs;
  }

  const modelTimeMs = totalTurnMs > toolTimeMs ? totalTurnMs - toolTimeMs : 0;

  // Speeds (tok/s)
  const modelSeconds = modelTimeMs / 1000;
  const totalSeconds = totalTurnMs / 1000;

  const responseToksPerSec =
    modelSeconds > 0.1 && outputTokens > 0 ? outputTokens / modelSeconds : null;
  const wholeTurnToksPerSec =
    totalSeconds > 0.1 && (inputTokens + outputTokens) > 0
      ? (inputTokens + outputTokens) / totalSeconds
      : null;

  const headlineToksPerSec = responseToksPerSec ?? wholeTurnToksPerSec;

  // Cost: approximate standard blended rate if not explicitly supplied
  // Standard pricing estimate: $3 / 1M prompt, $0.30 / 1M cache, $15 / 1M completion
  const estimatedCost =
    (inputTokens * 3) / 1_000_000 +
    (cachedTokens * 0.3) / 1_000_000 +
    (outputTokens * 15) / 1_000_000;

  return {
    headlineToksPerSec: formatTokenSpeed(headlineToksPerSec),
    responseToksPerSec: formatTokenSpeed(responseToksPerSec),
    wholeTurnToksPerSec: formatTokenSpeed(wholeTurnToksPerSec),
    modelTime: formatTurnDuration(modelTimeMs),
    toolTime: formatTurnDuration(toolTimeMs),
    steps: stepsCount > 0 ? stepsCount : null,
    inputTokensFormatted: formatTokenCount(totalInputTokens || inputTokens),
    outputTokensFormatted: formatTokenCount(outputTokens),
    cachePercent: cachePercent !== null && cachePercent > 0 ? cachePercent : null,
    costFormatted: formatTurnCost(estimatedCost),
    raw: {
      inputTokens,
      outputTokens,
      cachedTokens,
      modelTimeMs,
      toolTimeMs,
      totalTimeMs: totalTurnMs,
      costUsd: estimatedCost,
    },
  };
}
