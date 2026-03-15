import type { ReactNode } from "react";

interface Props {
  topBar: ReactNode;
  moldLibrary: ReactNode;
  nleTimeline: ReactNode;
  scriptBreakdown: ReactNode;
  inspector: ReactNode;
  statusBar: ReactNode;
}

export function AppLayout({ topBar, moldLibrary, nleTimeline, scriptBreakdown, inspector, statusBar }: Props) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      {topBar}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Mold Library */}
        <aside className="w-[220px] shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-900">
          {moldLibrary}
        </aside>

        {/* Center: Timeline + Script Breakdown */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* NLE Timeline (60%) */}
          <div className="flex-[3] overflow-hidden border-b border-zinc-700">
            {nleTimeline}
          </div>
          {/* Script Breakdown (40%) */}
          <div className="flex-[2] overflow-hidden">
            {scriptBreakdown}
          </div>
        </main>

        {/* Right: Inspector */}
        <aside className="w-[300px] shrink-0 overflow-y-auto border-l border-zinc-800 bg-zinc-900">
          {inspector}
        </aside>
      </div>
      {statusBar}
    </div>
  );
}
