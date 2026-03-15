import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { MoldLibraryPanel } from "../mold-library/MoldLibraryPanel";
import { AudioLibraryPanel } from "../audio/AudioLibraryPanel";

type Tab = "frames" | "audio";

const TAB_LABELS: Record<Tab, string> = {
  frames: "Frames",
  audio: "Audio",
};

export function MediaLibraryPanel() {
  const [tab, setTab] = useState<Tab>("frames");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-full flex-col">
      {/* ── Tab switcher ── */}
      <div className="relative shrink-0 border-b border-zinc-800">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex w-full items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-800/60"
        >
          <span className="flex-1 text-left">{TAB_LABELS[tab]}</span>
          <ChevronDown
            size={12}
            className={`text-zinc-500 transition-transform ${menuOpen ? "rotate-180" : ""}`}
          />
        </button>

        {menuOpen && (
          <div className="absolute left-0 right-0 top-full z-50 border border-zinc-700 bg-zinc-900 shadow-xl">
            {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setMenuOpen(false); }}
                className={`flex w-full items-center px-3 py-2 text-[11px] hover:bg-zinc-800 ${
                  tab === t ? "text-zinc-100" : "text-zinc-400"
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Panel content ── */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "frames" ? <MoldLibraryPanel /> : <AudioLibraryPanel />}
      </div>
    </div>
  );
}
