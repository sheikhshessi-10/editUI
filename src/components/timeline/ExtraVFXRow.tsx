import { Sparkles, X } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "../../store/useStore";
import { EXTRA_VFX_OPTIONS } from "../../data/transitionRegistry";

export function ExtraVFXRow() {
  const { extraVfx, addExtraVFX, removeExtraVFX, select, selectedId } = useStore(useShallow(s => ({
    extraVfx: s.extraVfx,
    addExtraVFX: s.addExtraVFX,
    removeExtraVFX: s.removeExtraVFX,
    select: s.select,
    selectedId: s.selectedId,
  })));

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 p-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          <Sparkles size={12} /> Extra VFX
        </div>
        <div className="flex gap-1">
          {EXTRA_VFX_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => addExtraVFX(opt.id)}
              className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-400 transition hover:bg-zinc-700 hover:text-zinc-200"
            >
              + {opt.label}
            </button>
          ))}
        </div>
      </div>
      {extraVfx.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {extraVfx.map(vfx => (
            <div
              key={vfx.id}
              onClick={() => select("extravfx", vfx.id)}
              className={`flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] transition ${
                selectedId === vfx.id
                  ? "border-purple-500 bg-purple-500/20 text-purple-300"
                  : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              {vfx.type}
              {vfx.triggerWord && <span className="text-zinc-600">@{vfx.timeS.toFixed(1)}s</span>}
              <button
                onClick={e => { e.stopPropagation(); removeExtraVFX(vfx.id); }}
                className="ml-0.5 text-zinc-600 hover:text-zinc-300"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
