import type { ReactNode } from "react";

export default function DataStats({ items }: { items: { label: string; value: ReactNode; detail?: string }[] }) {
  return <dl className="data-stats">{items.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd>{item.detail && <p>{item.detail}</p>}</div>)}</dl>;
}
