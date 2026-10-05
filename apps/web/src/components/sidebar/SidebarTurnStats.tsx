import { useParams } from "@tanstack/react-router";
import { ActivityIcon, ChevronDownIcon } from "lucide-react";
import { memo, useMemo, useState } from "react";

import { useComposerDraftStore } from "../../composerDraftStore";
import { cn } from "../../lib/utils";
import { useThreadProjection } from "../../state/entities";
import { resolveActiveThreadRouteRef, resolveThreadRouteTarget } from "../../threadRoutes";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "../ui/collapsible";
import { deriveTurnStats, type TurnStatsSnapshot } from "./turnStats";

export interface SidebarTurnStatsViewProps {
  stats: TurnStatsSnapshot;
  defaultExpanded?: boolean;
  className?: string;
}

export function SidebarTurnStatsView({
  stats,
  defaultExpanded = false,
  className,
}: SidebarTurnStatsViewProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div
      className={cn(
        "rounded-lg border border-sidebar-border/70 bg-sidebar-accent/35 p-2.5 transition-colors",
        className,
      )}
    >
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full cursor-pointer items-center justify-between text-left text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-expanded={expanded}
          >
            <div className="flex items-center gap-1.5 text-sidebar-foreground">
              <ActivityIcon className="size-3.5 text-muted-foreground/80" aria-hidden="true" />
              <span>Turn stats</span>
              <ChevronDownIcon
                className={cn(
                  "size-3 text-muted-foreground/70 transition-transform duration-200",
                  expanded && "rotate-180",
                )}
                aria-hidden="true"
              />
            </div>
            {stats.headlineToksPerSec ? (
              <span className="text-2xs tabular-nums text-muted-foreground">
                {stats.headlineToksPerSec}
              </span>
            ) : null}
          </button>
        </CollapsibleTrigger>

        <CollapsiblePanel className="space-y-1.5 pt-2.5 text-2xs">
          <div className="h-px w-full bg-sidebar-border/50 mb-2" />

          {stats.responseToksPerSec ? (
            <div className="flex items-center justify-between text-secondary-label">
              <span>Response</span>
              <span className="font-medium tabular-nums text-sidebar-foreground">
                {stats.responseToksPerSec}
              </span>
            </div>
          ) : null}

          {stats.wholeTurnToksPerSec ? (
            <div className="flex items-center justify-between text-secondary-label">
              <span>Whole turn</span>
              <span className="font-medium tabular-nums text-sidebar-foreground">
                {stats.wholeTurnToksPerSec}
              </span>
            </div>
          ) : null}

          {stats.modelTime ? (
            <div className="flex items-center justify-between text-secondary-label">
              <span>Model time</span>
              <span className="font-medium tabular-nums text-sidebar-foreground">
                {stats.modelTime}
              </span>
            </div>
          ) : null}

          {stats.toolTime ? (
            <div className="flex items-center justify-between text-secondary-label">
              <span>Tool time</span>
              <span className="font-medium tabular-nums text-sidebar-foreground">
                {stats.toolTime}
              </span>
            </div>
          ) : null}

          {stats.steps !== null ? (
            <div className="flex items-center justify-between text-secondary-label">
              <span>Steps</span>
              <span className="font-medium tabular-nums text-sidebar-foreground">
                {stats.steps}
              </span>
            </div>
          ) : null}

          {stats.inputTokensFormatted || stats.outputTokensFormatted ? (
            <div className="flex items-center justify-between text-secondary-label">
              <span>Tokens</span>
              <span className="font-medium tabular-nums text-sidebar-foreground">
                {stats.inputTokensFormatted ?? "0"} ↑ · {stats.outputTokensFormatted ?? "0"} ↓
              </span>
            </div>
          ) : null}

          {stats.cachePercent !== null ? (
            <div className="flex items-center justify-between text-secondary-label">
              <span>Cache</span>
              <span className="font-medium tabular-nums text-emerald-500 dark:text-emerald-400">
                {stats.cachePercent}%
              </span>
            </div>
          ) : null}

          {stats.costFormatted ? (
            <div className="flex items-center justify-between text-secondary-label">
              <span>Cost</span>
              <span className="font-medium tabular-nums text-sidebar-foreground">
                {stats.costFormatted}
              </span>
            </div>
          ) : null}
        </CollapsiblePanel>
      </Collapsible>
    </div>
  );
}

export const SidebarTurnStats = memo(function SidebarTurnStats() {
  const routeTarget = useParams({
    strict: false,
    select: (params) => resolveThreadRouteTarget(params),
  });
  const routeDraftThread = useComposerDraftStore((store) =>
    routeTarget?.kind === "draft" ? store.getDraftSession(routeTarget.draftId) : null,
  );
  const routeThreadRef = useMemo(
    () => resolveActiveThreadRouteRef(routeTarget, routeDraftThread),
    [routeDraftThread, routeTarget],
  );

  const thread = useThreadProjection(routeThreadRef);
  const projection = thread?.projection ?? null;

  const stats = useMemo(() => deriveTurnStats(projection), [projection]);

  if (!stats) {
    return null;
  }

  return (
    <div className="px-3 py-1">
      <SidebarTurnStatsView stats={stats} />
    </div>
  );
});
