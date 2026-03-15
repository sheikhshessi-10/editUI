import { useState } from "react";
import { X, Plus } from "lucide-react";

interface Props {
  words: string[];
  onChange: (words: string[]) => void;
}

export function EmphasisWordInput({ words, onChange }: Props) {
  const [input, setInput] = useState("");

  function addWord() {
    const w = input.trim();
    if (w && !words.includes(w)) {
      onChange([...words, w]);
    }
    setInput("");
  }

  return (
    <div>
      <div className="mb-1 flex flex-wrap gap-1">
        {words.map(w => (
          <span
            key={w}
            className="flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-300"
          >
            {w}
            <button onClick={() => onChange(words.filter(x => x !== w))} className="text-purple-400 hover:text-purple-200">
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addWord()}
          placeholder="Add emphasis word..."
          className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[10px] text-zinc-200 outline-none"
        />
        <button onClick={addWord} className="rounded bg-zinc-700 px-1.5 text-zinc-400 hover:bg-zinc-600 hover:text-zinc-200">
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}
