import { useState } from "react";
import type { ExtraVFX, ExtraVFXType } from "../../data/types";
import { EXTRA_VFX_OPTIONS } from "../../data/transitionRegistry";
import { useStore } from "../../store/useStore";
import { WordPicker } from "./WordPicker";

interface Props {
  vfx: ExtraVFX;
}

export function ExtraVFXInspector({ vfx }: Props) {
  const updateExtraVFX = useStore(s => s.updateExtraVFX);
  const [pickingTrigger, setPickingTrigger] = useState(false);

  return (
    <div className="flex flex-col gap-3 p-3">
      <div>
        <div className="flex items-center gap-2 text-sm font-bold text-zinc-200">
          <span className="text-purple-400">⬥</span>
          EXTRA VFX
        </div>
      </div>

      <div>
        <label className="mb-0.5 block text-[10px] text-zinc-500">Type</label>
        <select
          value={vfx.type}
          onChange={e => updateExtraVFX(vfx.id, { type: e.target.value as ExtraVFXType })}
          className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[10px] text-zinc-300 outline-none"
        >
          {EXTRA_VFX_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-400">Trigger Word:</span>
          <button
            onClick={() => setPickingTrigger(true)}
            className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-700"
          >
            {vfx.triggerWord
              ? `"${vfx.triggerWord.word}" (~${vfx.timeS.toFixed(2)}s)`
              : "Set..."}
          </button>
        </div>
        {pickingTrigger && (
          <div className="mt-2">
            <WordPicker
              currentWord={vfx.triggerWord}
              onPick={word => updateExtraVFX(vfx.id, { triggerWord: word, timeS: word.start })}
              onClose={() => setPickingTrigger(false)}
            />
          </div>
        )}
      </div>

      {vfx.triggerWord && (
        <div className="text-[10px] text-zinc-500">
          Time: {vfx.timeS.toFixed(2)}s | Frame: {Math.round(vfx.timeS * 30)}
        </div>
      )}
    </div>
  );
}
