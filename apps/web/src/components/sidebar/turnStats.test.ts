import { describe, expect, it } from "vitest";
import {
  deriveTurnStats,
  formatTokenCount,
  formatTokenSpeed,
  formatTurnCost,
  formatTurnDuration,
} from "./turnStats";

describe("turnStats formatting helpers", () => {
  it("formats durations accurately", () => {
    expect(formatTurnDuration(0)).toBe("0s");
    expect(formatTurnDuration(45_000)).toBe("45s");
    expect(formatTurnDuration(76_000)).toBe("1m16s");
    expect(formatTurnDuration(1_639_000)).toBe("27m19s");
    expect(formatTurnDuration(3_900_000)).toBe("1h05m");
    expect(formatTurnDuration(null)).toBeNull();
    expect(formatTurnDuration(-10)).toBeNull();
  });

  it("formats token speed", () => {
    expect(formatTokenSpeed(115)).toBe("~115 tok/s");
    expect(formatTokenSpeed(152.4)).toBe("~152 tok/s");
    expect(formatTokenSpeed(0)).toBeNull();
    expect(formatTokenSpeed(null)).toBeNull();
  });

  it("formats token counts", () => {
    expect(formatTokenCount(950)).toBe("950");
    expect(formatTokenCount(11_600)).toBe("11.6K");
    expect(formatTokenCount(238_000)).toBe("238.0K");
    expect(formatTokenCount(1_500_000)).toBe("1.5M");
    expect(formatTokenCount(null)).toBeNull();
  });

  it("formats cost", () => {
    expect(formatTurnCost(4.655)).toBe("$4.655");
    expect(formatTurnCost(0.0035)).toBe("$0.0035");
    expect(formatTurnCost(0)).toBe("$0.00");
    expect(formatTurnCost(null)).toBeNull();
  });
});

describe("deriveTurnStats", () => {
  it("returns null for empty projection or empty turns", () => {
    expect(deriveTurnStats(null)).toBeNull();
    expect(deriveTurnStats({ providerTurns: [] } as never)).toBeNull();
  });

  it("computes stats matching turn timeline and tool executions", () => {
    const projection = {
      providerTurns: [
        {
          id: "turn-1",
          status: "completed",
          startedAt: "2026-10-05T00:00:00.000Z",
          completedAt: "2026-10-05T00:02:00.000Z", // 120s total
          tokenUsage: {
            inputTokens: 10_000,
            cachedInputTokens: 90_000, // 90% cache
            outputTokens: 5_000,
          },
        },
      ],
      turnItems: [
        {
          id: "item-1",
          providerTurnId: "turn-1",
          type: "command_execution",
          startedAt: "2026-10-05T00:00:10.000Z",
          completedAt: "2026-10-05T00:01:10.000Z", // 60s tool time
        },
        {
          id: "item-2",
          providerTurnId: "turn-1",
          type: "file_search",
          startedAt: "2026-10-05T00:01:20.000Z",
          completedAt: "2026-10-05T00:01:40.000Z", // 20s tool time
        },
      ],
    } as never;

    const stats = deriveTurnStats(projection);
    expect(stats).not.toBeNull();
    expect(stats?.steps).toBe(2);
    expect(stats?.cachePercent).toBe(90);
    expect(stats?.toolTime).toBe("1m20s"); // 80s
    expect(stats?.modelTime).toBe("40s"); // 120s - 80s = 40s
    expect(stats?.outputTokensFormatted).toBe("5.0K");
    expect(stats?.inputTokensFormatted).toBe("100.0K");
    // Model tok/s: 5000 output / 40s = 125 tok/s
    expect(stats?.responseToksPerSec).toBe("~125 tok/s");
  });
});
