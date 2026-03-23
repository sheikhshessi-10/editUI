import { useState, useEffect, useRef } from "react";
import type { WhisperWord } from "../../data/types";

// Sub-component that mounts fresh when editing starts — avoids setState-in-effect lint rule
function EditingInput({
  initialValue,
  onCommit,
  onCancel,
}: {
  initialValue: string;
  onCommit: (v: string) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(initialValue);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed) onCommit(trimmed);
    else onCancel();
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === "Enter") { e.preventDefault(); commit(); }
        if (e.key === "Escape") { e.preventDefault(); onCancel(); }
        e.stopPropagation();
      }}
      onClick={e => e.stopPropagation()}
      className="inline-block w-[6ch] min-w-[4ch] max-w-[14ch] rounded border border-emerald-500 bg-zinc-800 px-0.5 text-[10px] text-zinc-100 outline-none"
      style={{ width: `${Math.max(4, draft.length + 1)}ch` }}
    />
  );
}

interface EditableWordProps {
  word: WhisperWord;
  isEditing: boolean;
  onStartEdit: () => void;
  onCommit: (newText: string) => void;
  onCancel: () => void;
  className?: string;
}

export function EditableWord({
  word,
  isEditing,
  onStartEdit,
  onCommit,
  onCancel,
  className = "",
}: EditableWordProps) {
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
      className={`cursor-text hover:underline hover:decoration-dotted hover:text-zinc-200 ${className}`}
      title="Double-click to fix spelling"
    >
      {word.word}
    </span>
  );
}
