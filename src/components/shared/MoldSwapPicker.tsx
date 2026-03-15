import { useEffect, useRef } from "react";
import { MOLD_REGISTRY, MOLD_GROUPS } from "../../data/moldRegistry";

interface Props {
  currentMoldId: string;
  position: { x: number; y: number };
  onPick: (moldId: string) => void;
  onClose: () => void;
}

export function MoldSwapPicker({ currentMoldId, position, onPick, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const allMolds = Object.values(MOLD_REGISTRY);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      ref.current.style.left = `${window.innerWidth - rect.width - 8}px`;
    }
    if (rect.bottom > window.innerHeight) {
      ref.current.style.top = `${window.innerHeight - rect.height - 8}px`;
    }
  }, []);

  return (
    <div
      ref={ref}
      className="fixed z-50 w-[280px] rounded-lg border border-zinc-600 bg-zinc-900 p-2 shadow-2xl"
      style={{ left: position.x, top: position.y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="mb-1.5 text-[10px] font-bold text-zinc-400">
        Swap frame (keeps timing + words)
      </div>
      {MOLD_GROUPS.map(group => {
        const molds = allMolds.filter(m => m.group === group.key);
        if (molds.length === 0) return null;
        return (
          <div key={group.key} className="mb-1.5">
            <div className="px-0.5 text-[8px] uppercase tracking-wider text-zinc-600">
              {group.label}
            </div>
            <div className="mt-0.5 flex flex-wrap gap-[3px]">
              {molds.map(m => {
                const isCurrent = m.id === currentMoldId;
                return (
                  <button
                    key={m.id}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      if (!isCurrent) onPick(m.id);
                    }}
                    className={`flex items-center gap-1 rounded border px-1.5 py-[3px] text-[9px] font-medium transition ${
                      isCurrent
                        ? "opacity-40 cursor-default"
                        : "hover:brightness-150 cursor-pointer"
                    }`}
                    style={{
                      borderColor: `${m.color}${isCurrent ? "30" : "50"}`,
                      background: `${m.color}${isCurrent ? "08" : "15"}`,
                      color: m.color,
                    }}
                  >
                    <div
                      className="h-[6px] w-[6px] rounded-sm"
                      style={{ background: m.color }}
                    />
                    {m.label}
                    {isCurrent && (
                      <span className="ml-0.5 text-[7px] text-zinc-500">(current)</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
