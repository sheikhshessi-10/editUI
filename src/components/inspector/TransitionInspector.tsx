import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import type { Transition } from "../../data/types";
import { useStore } from "../../store/useStore";
import { MOLD_REGISTRY } from "../../data/moldRegistry";
import { FIXED_MORPHS, LIGHT_LEAK_OPTIONS, LEAK_RATIO_OPTIONS } from "../../data/transitionRegistry";
import { WordPicker } from "./WordPicker";

interface Props {
  transition: Transition;
  index: number;
}

export function TransitionInspector({ transition, index }: Props) {
  const { segments, updateTransition } = useStore(useShallow(s => ({
    segments: s.segments,
    updateTransition: s.updateTransition,
  })));
  const [pickingTrigger, setPickingTrigger] = useState(false);

  const srcMold = segments[index]?.moldId ?? "?";
  const dstMold = segments[index + 1]?.moldId ?? "?";
  const srcLabel = MOLD_REGISTRY[srcMold]?.label ?? srcMold;
  const dstLabel = MOLD_REGISTRY[dstMold]?.label ?? dstMold;
  const fixedMorph = FIXED_MORPHS.find(m => m.sourceMold === srcMold && m.destMold === dstMold);
  const destDef = MOLD_REGISTRY[dstMold];
  const triggerFrame = transition.triggerWord ? Math.round(transition.triggerWord.start * 30) : null;

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm font-bold text-zinc-200">
          <span className="text-amber-400">⚡</span>
          CUT {index + 1}
        </div>
        <div className="mt-0.5 text-[10px] text-zinc-500">
          SEG{index + 1} → SEG{index + 2}
        </div>
        <div className="text-[10px] text-zinc-500">
          {srcLabel} → {dstLabel}
        </div>
      </div>

      {/* Trigger */}
      <Section title="TRIGGER">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-400">Trigger Word:</span>
          <button
            onClick={() => setPickingTrigger(true)}
            className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-700"
          >
            {transition.triggerWord
              ? `"${transition.triggerWord.word}" (~${transition.triggerWord.start.toFixed(2)}s)`
              : "Set..."}
          </button>
        </div>
        {triggerFrame != null && (
          <div className="mt-0.5 text-[9px] text-zinc-600">Frame: {triggerFrame}</div>
        )}
        {pickingTrigger && (
          <div className="mt-2">
            <WordPicker
              currentWord={transition.triggerWord}
              onPick={word => updateTransition(transition.id, { triggerWord: word })}
              onClose={() => setPickingTrigger(false)}
            />
          </div>
        )}
      </Section>

      {/* Fixed Morph */}
      <Section title="FIXED MORPH">
        {fixedMorph ? (
          <div>
            <label className="flex items-center gap-2 text-[10px] text-zinc-300">
              <input
                type="checkbox"
                checked={transition.morph}
                onChange={e => updateTransition(transition.id, { morph: e.target.checked })}
              />
              Enable {fixedMorph.fn}
            </label>
            <div className="mt-0.5 text-[9px] text-emerald-500">
              ✓ Valid pair ({srcLabel} → {dstLabel})
            </div>
            <div className="text-[9px] text-zinc-600">
              Fires at local frame {fixedMorph.localTriggerFrame} in {dstLabel}
            </div>
          </div>
        ) : (
          <div className="text-[10px] italic text-zinc-600">
            No fixed morph defined for this source→destination pair.
          </div>
        )}
      </Section>

      {/* Light Leak */}
      <Section title="LIGHT LEAK">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-400">Type:</span>
            <select
              value={transition.lightLeak}
              onChange={e => updateTransition(transition.id, { lightLeak: e.target.value as Transition["lightLeak"] })}
              className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[10px] text-zinc-300 outline-none"
            >
              {LIGHT_LEAK_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          {transition.lightLeak !== "none" && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-400">Ratio:</span>
              <select
                value={transition.leakRatio}
                onChange={e => updateTransition(transition.id, { leakRatio: e.target.value as Transition["leakRatio"] })}
                className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[10px] text-zinc-300 outline-none"
              >
                {LEAK_RATIO_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}
          {transition.lightLeak !== "none" && triggerFrame != null && (
            <div className="text-[9px] text-zinc-600">
              Leak starts: frame{" "}
              {triggerFrame - Math.round(
                LIGHT_LEAK_OPTIONS.find(o => o.id === transition.lightLeak)!.frames *
                (parseFloat(transition.leakRatio.split("/")[0]) / 100)
              )}
            </div>
          )}
        </div>
      </Section>

      {/* Effects */}
      <Section title="EFFECTS">
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-[10px] text-zinc-300">
            <input
              type="checkbox"
              checked={transition.redEnergy}
              onChange={e => updateTransition(transition.id, { redEnergy: e.target.checked })}
            />
            Red Energy Overlay
          </label>
          {transition.redEnergy && triggerFrame != null && (
            <div className="ml-5 text-[9px] text-zinc-600">Fires at frame {triggerFrame - 8}</div>
          )}
          <label className="flex items-center gap-2 text-[10px] text-zinc-300">
            <input
              type="checkbox"
              checked={transition.woosh}
              onChange={e => updateTransition(transition.id, { woosh: e.target.checked })}
            />
            Woosh SFX
          </label>
          {transition.woosh && triggerFrame != null && (
            <div className="ml-5 text-[9px] text-zinc-600">Fires at frame {triggerFrame}</div>
          )}
          {destDef?.hasInternalAudio && transition.woosh && (
            <div className="rounded bg-amber-500/10 p-1.5 text-[10px] text-amber-400">
              ⚠ {dstLabel} has internal woosh audio. External Woosh SFX may duplicate — consider unchecking.
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 border-b border-zinc-800 pb-0.5 text-[9px] font-bold uppercase tracking-widest text-zinc-600">
        {title}
      </div>
      {children}
    </div>
  );
}
