import type { MoldDef } from "../../data/moldRegistry";
import { MoldCard } from "./MoldCard";

interface Props {
  label: string;
  molds: MoldDef[];
}

export function MoldGroupSection({ label, molds }: Props) {
  if (molds.length === 0) return null;
  return (
    <div className="mb-3">
      <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        {label}
      </div>
      <div className="flex flex-col gap-1.5 px-2">
        {molds.map(m => <MoldCard key={m.id} mold={m} />)}
      </div>
    </div>
  );
}
