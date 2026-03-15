import { useState, type ReactNode } from "react";
import { LayoutGrid, Headphones } from "lucide-react";

interface Props {
  topBar: ReactNode;
  moldLibrary: ReactNode;
  audioLibrary: ReactNode;
  nleTimeline: ReactNode;
  scriptBreakdown: ReactNode;
  inspector: ReactNode;
  statusBar: ReactNode;
}

type LeftTab = "frames" | "audio";

export function AppLayout({
  topBar, moldLibrary, audioLibrary, nleTimeline, scriptBreakdown, inspector, statusBar,
}: Props) {
  const [leftTab, setLeftTab] = useState<LeftTab>("frames");

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      {topBar}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <aside className="flex w-[220px] shrink-0 flex-col border-r border-zinc-800 bg-zinc-900">
          {/* Tab bar */}
          <div className="flex shrink-0 border-b border-zinc-800">
            <TabButton
              active={leftTab === "frames"}
              onClick={() => setLeftTab("frames")}
              icon={<LayoutGrid size={11} />}
              label="Frames"
            />
            <TabButton
              active={leftTab === "audio"}
              onClick={() => setLeftTab("audio")}
              icon={<Headphones size={11} />}
              label="Audio"
            />
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            <div className={leftTab === "frames" ? "h-full" : "hidden h-full"}>
              {moldLibrary}
            </div>
            <div className={leftTab === "audio" ? "h-full" : "hidden h-full"}>
              {audioLibrary}
            </div>
          </div>
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

function TabButton({
  active, onClick, icon, label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1 py-2 text-[9px] font-bold uppercase tracking-wider transition ${
        active
          ? "border-b-2 border-blue-500 text-blue-400"
          : "border-b-2 border-transparent text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
