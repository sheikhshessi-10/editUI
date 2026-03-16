import type { Transition, Segment } from "../../data/types";
import { MOLD_REGISTRY } from "../../data/moldRegistry";
import { CARD_TOP, CARD_H, TRANS_W, TRANS_H, GAP, STEP, CARD_W } from "./FrameCard";
import { Zap, Scissors, Volume2 } from "lucide-react";

interface TransitionCardProps {
  transition: Transition;
  fromSeg: Segment;
  toSeg: Segment;
  index: number; // transition index (between frame[index] and frame[index+1])
  onClick: (transId: string) => void;
}

export function TransitionCard({ transition, fromSeg, toSeg, index, onClick }: TransitionCardProps) {
  const fromMold = MOLD_REGISTRY[fromSeg.moldId];
  const toMold   = MOLD_REGISTRY[toSeg.moldId];
  const fromColor = fromMold?.color ?? "#52525b";
  const toColor   = toMold?.color   ?? "#52525b";

  const x = index * STEP + CARD_W + GAP;
  const y = CARD_TOP + (CARD_H - TRANS_H) / 2;

  // Connector line y-center
  const lineY = CARD_TOP + CARD_H / 2;

  return (
    <>
      {/* Left connector line: from frame right-edge to transition left-edge */}
      <div
        style={{
          position: "absolute",
          left: index * STEP + CARD_W,
          top: lineY - 1,
          width: GAP,
          height: 2,
          background: "#3f3f46",
        }}
      />
      {/* Right connector line: from transition right-edge to next frame left-edge */}
      <div
        style={{
          position: "absolute",
          left: x + TRANS_W,
          top: lineY - 1,
          width: GAP,
          height: 2,
          background: "#3f3f46",
        }}
      />

      {/* Transition card */}
      <div
        style={{ position: "absolute", left: x, top: y, width: TRANS_W, height: TRANS_H }}
        className="rounded-lg border border-zinc-700 bg-zinc-900 cursor-pointer overflow-hidden
                   transition hover:border-zinc-500 flex flex-col"
        onClick={() => onClick(transition.id)}
      >
        {/* Color stripe from both molds */}
        <div className="flex h-1.5">
          <div className="flex-1" style={{ background: fromColor }} />
          <div className="flex-1" style={{ background: toColor }} />
        </div>

        <div className="flex flex-col items-center justify-center flex-1 gap-1.5 px-1 py-2">
          {/* CUT label */}
          <span className="text-[8px] font-bold tracking-widest text-zinc-600 uppercase">
            CUT {index + 1}
          </span>

          <div className="w-px h-3 bg-zinc-700" />

          {/* Morph */}
          {transition.morph ? (
            <div className="flex items-center gap-0.5 text-emerald-400">
              <Zap size={9} />
              <span className="text-[8px] font-semibold">Morph</span>
            </div>
          ) : (
            <div className="flex items-center gap-0.5 text-zinc-600">
              <Scissors size={9} />
              <span className="text-[8px]">Cut</span>
            </div>
          )}

          {/* Light leak */}
          {transition.lightLeak !== "none" && (
            <span className="text-[7px] text-purple-400 font-medium bg-purple-400/10 px-1 py-0.5 rounded">
              {transition.lightLeak}
            </span>
          )}

          {/* Woosh */}
          {transition.woosh && (
            <div className="flex items-center gap-0.5 text-blue-400">
              <Volume2 size={8} />
              <span className="text-[7px]">Woosh</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
