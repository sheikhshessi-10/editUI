interface Props {
  issueCount: number;
}

export function ValidationBadge({ issueCount }: Props) {
  if (issueCount === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
        ✓
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
      ⚠{issueCount}
    </span>
  );
}
