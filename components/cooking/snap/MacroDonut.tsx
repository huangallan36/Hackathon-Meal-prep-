import type { Nutrition } from "@/lib/types";
import { cn } from "@/lib/utils";

const SEGMENTS = [
  { key: "protein", label: "Protein", kcalPerGram: 4, stroke: "stroke-protein", dot: "bg-protein" },
  { key: "carbs", label: "Carbs", kcalPerGram: 4, stroke: "stroke-carbs", dot: "bg-carbs" },
  { key: "fat", label: "Fat", kcalPerGram: 9, stroke: "stroke-fat", dot: "bg-fat" },
] as const;

/** Energy split of protein / carbs / fat as a donut, with calories in the middle. Updates live. */
export function MacroDonut({ nutrition, size = 116, className }: { nutrition: Nutrition; size?: number; className?: string }) {
  const stroke = 13;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const energies = SEGMENTS.map((s) => Math.max(0, nutrition[s.key]) * s.kcalPerGram);
  const total = energies.reduce((a, b) => a + b, 0);
  const gap = total > 0 ? 3 : 0;

  const lengths = energies.map((e) => (total > 0 ? (e / total) * c : 0));
  const arcs = SEGMENTS.map((s, i) => ({
    ...s,
    len: Math.max(0, lengths[i] - gap),
    offset: lengths.slice(0, i).reduce((a, b) => a + b, 0),
  }));

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label="Macro split">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-cream-deep" />
        {arcs.map((a) => (
          <circle
            key={a.key}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeDasharray={`${a.len} ${c}`}
            strokeDashoffset={-a.offset - gap / 2}
            className={cn(a.stroke, "transition-[stroke-dasharray,stroke-dashoffset] duration-500 ease-out")}
            opacity={a.len > 0.5 ? 1 : 0}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[26px] font-semibold leading-none tabular-nums text-ink">{Math.round(nutrition.calories)}</span>
        <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">kcal</span>
      </div>
    </div>
  );
}

/** "Protein 24% · Carbs 51% · Fat 25%" legend for the donut */
export function MacroLegend({ nutrition, className }: { nutrition: Nutrition; className?: string }) {
  const energies = SEGMENTS.map((s) => Math.max(0, nutrition[s.key]) * s.kcalPerGram);
  const total = energies.reduce((a, b) => a + b, 0);
  return (
    <ul className={cn("flex flex-col gap-1.5", className)}>
      {SEGMENTS.map((s, i) => (
        <li key={s.key} className="flex items-center gap-2 text-sm">
          <span className={cn("size-2.5 rounded-full", s.dot)} />
          <span className="flex-1 text-ink-soft">{s.label}</span>
          <span className="font-semibold tabular-nums text-ink">{total > 0 ? Math.round((energies[i] / total) * 100) : 0}%</span>
        </li>
      ))}
    </ul>
  );
}
