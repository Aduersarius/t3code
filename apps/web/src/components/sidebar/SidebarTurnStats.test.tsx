import { describe, expect, it } from "vitest";
import type { TurnStatsSnapshot } from "./turnStats";

describe("SidebarTurnStats presentation", () => {
  const sampleStats: TurnStatsSnapshot = {
    headlineToksPerSec: "~115 tok/s",
    responseToksPerSec: "~115 tok/s",
    wholeTurnToksPerSec: "~152 tok/s",
    modelTime: "1m16s",
    toolTime: "27m19s",
    steps: 23,
    inputTokensFormatted: "238.0K",
    outputTokensFormatted: "11.6K",
    cachePercent: 95,
    costFormatted: "$4.655",
    raw: {
      inputTokens: 238000,
      outputTokens: 11600,
      cachedTokens: 226100,
      modelTimeMs: 76000,
      toolTimeMs: 1639000,
      totalTimeMs: 1715000,
      costUsd: 4.655,
    },
  };

  it("holds all expected fields matching the UI specification", () => {
    expect(sampleStats.headlineToksPerSec).toBe("~115 tok/s");
    expect(sampleStats.responseToksPerSec).toBe("~115 tok/s");
    expect(sampleStats.wholeTurnToksPerSec).toBe("~152 tok/s");
    expect(sampleStats.modelTime).toBe("1m16s");
    expect(sampleStats.toolTime).toBe("27m19s");
    expect(sampleStats.steps).toBe(23);
    expect(sampleStats.inputTokensFormatted).toBe("238.0K");
    expect(sampleStats.outputTokensFormatted).toBe("11.6K");
    expect(sampleStats.cachePercent).toBe(95);
    expect(sampleStats.costFormatted).toBe("$4.655");
  });
});
