import { MOLD_REGISTRY, MOLD_GROUPS } from "../../data/moldRegistry";
import { MoldGroupSection } from "./MoldGroupSection";

export function MoldLibraryPanel() {
  return (
    <div className="py-3">
      <div className="mb-3 px-3 text-xs font-bold text-zinc-300">Mold Library</div>
      {MOLD_GROUPS.map(g => (
        <MoldGroupSection
          key={g.key}
          label={g.label}
          molds={Object.values(MOLD_REGISTRY).filter(m => m.group === g.key)}
        />
      ))}
    </div>
  );
}
