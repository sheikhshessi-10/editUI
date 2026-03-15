import { useState } from "react";
import { AlertTriangle, ChevronUp, ChevronDown } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "../../store/useStore";
import { useValidation } from "../../hooks/useValidation";

export function StatusBar() {
  const { segCount, transCount, select } = useStore(useShallow(s => ({
    segCount: s.segments.length,
    transCount: s.transitions.length,
    select: s.select,
  })));
  const issues = useValidation();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-t border-zinc-800 bg-zinc-950">
      <div className="flex items-center gap-4 px-4 py-1.5 text-[11px] text-zinc-500">
        <span>{segCount} segment{segCount !== 1 ? "s" : ""}</span>
        <span>{transCount} transition{transCount !== 1 ? "s" : ""}</span>
        <div className="flex-1" />
        {issues.length === 0 ? (
          <span className="text-emerald-400">Ready to export</span>
        ) : (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition"
          >
            <AlertTriangle size={12} />
            <span>{issues.length} issue{issues.length !== 1 ? "s" : ""}</span>
            {expanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
        )}
      </div>

      {expanded && issues.length > 0 && (
        <div className="border-t border-zinc-800 bg-zinc-900/80 px-4 py-2 max-h-[120px] overflow-y-auto">
          {issues.map((issue, i) => (
            <div
              key={i}
              onClick={() => {
                if (issue.id && issue.type === "segment") select("segment", issue.id);
                if (issue.id && issue.type === "transition") select("transition", issue.id);
              }}
              className={`flex items-center gap-2 py-0.5 text-[10px] ${
                issue.id ? "cursor-pointer hover:text-zinc-200" : ""
              }`}
            >
              <span className={`shrink-0 rounded px-1 py-px text-[8px] font-bold uppercase ${
                issue.type === "global" ? "bg-red-500/20 text-red-400" :
                issue.type === "segment" ? "bg-amber-500/20 text-amber-400" :
                "bg-blue-500/20 text-blue-400"
              }`}>
                {issue.type}
              </span>
              <span className="text-zinc-400">{issue.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
