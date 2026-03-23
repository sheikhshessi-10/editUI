import { useState, useRef, useEffect } from "react";
import type { WhisperWord } from "../../data/types";

interface Props {
  word: WhisperWord;
  isEditing: boolean;
  onStartEdit: () => void;
  onCommit: (text: string) => void;
  onCancel: () => void;
  className?: string;
}

/** Mounts fresh each time isEditing becomes true — no setState-in-effect needed. */
function EditingInput({ initialValue, onCommit, onCancel }: {
  initialValue: string;
  onCommit: (text: string) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(initialValue);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onKeyDown={e => {
        if (e.key === "Enter") { e.preventDefault(); onCommit(draft); }
        if (e.key === "Escape") { e.preventDefault(); onCancel(); }
      }}
      onBlur={() => onCommit(draft)}
      onClick={e => e.stopPropagation()}
      className="inline rounded border border-emerald-500 bg-zinc-800 px-[3px] py-0 text-emerald-300 outline-none"
      style={{ fontSize: "inherit", width: `${Math.max(draft.length, 3)}ch` }}
    />
  );
}

export function EditableWord({ word, isEditing, onStartEdit, onCommit, onCancel, className }: Props) {
  if (isEditing) {
    return (
      <EditingInput
        initialValue={word.word}
        onCommit={onCommit}
        onCancel={onCancel}
      />
    );
  }

  return (
    <span
      onDoubleClick={e => { e.stopPropagation(); onStartEdit(); }}
      className={`cursor-text rounded px-[1px] hover:bg-zinc-700/60 hover:text-zinc-200 ${className ?? ""}`}
      title="Double-click to fix spelling"
    >
      {word.word}
    </span>
  );
}
