import React, { useState } from 'react';
import { Check, Copy, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TONES, type Tone } from '../theme';
import type { CodeExample, Command, FieldTable, Metric, Risk, Symptom } from '../types';

export function Section({
  title,
  icon: Icon,
  iconClass = 'text-sky-400',
  tone,
  children,
}: {
  title: string;
  icon: LucideIcon;
  iconClass?: string;
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-[#0c121e]/80 border border-slate-700/50 rounded-2xl p-5 sm:p-7 relative overflow-hidden shadow-lg">
      {tone && <div className={`absolute top-0 left-0 w-1 h-full ${TONES[tone].solid}`}></div>}
      <h3 className="text-[12px] font-bold text-white uppercase tracking-[0.15em] mb-5 flex items-center gap-3 border-b border-slate-800 pb-4">
        <Icon className={`w-5 h-5 ${iconClass}`} /> {title}
      </h3>
      {children}
    </section>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked (insecure context, permissions); nothing to do.
    }
  };
  return (
    <button
      onClick={copy}
      title="Copy"
      className="p-1.5 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors shrink-0"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

/** Tabbed code viewer. Give it a `key` that changes with the parent selection to reset the tab. */
export function CodeTabs({ examples, tone }: { examples: CodeExample[]; tone: Tone }) {
  const [idx, setIdx] = useState(0);
  const t = TONES[tone];
  const ex = examples[Math.min(idx, examples.length - 1)];
  if (!ex) return null;
  return (
    <div className="bg-[#070b12]/80 border border-slate-700/80 rounded-xl overflow-hidden">
      <div className="bg-[#111827] border-b border-slate-800 px-2 flex items-center justify-between gap-2">
        <div className="flex overflow-x-auto custom-scrollbar">
          {examples.map((e, i) => (
            <button
              key={e.label}
              onClick={() => setIdx(i)}
              className={`px-3 py-2.5 text-[11px] font-bold tracking-wide whitespace-nowrap border-b-2 transition-colors ${
                i === idx ? `${t.text} ${t.border}` : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
        <CopyButton text={ex.code} />
      </div>
      <pre className={`p-5 overflow-x-auto font-mono text-[12.5px] leading-relaxed custom-scrollbar ${t.text}`}>{ex.code}</pre>
      {ex.caption && (
        <p className="px-5 pb-4 -mt-1 text-[13px] text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">{ex.caption}</p>
      )}
    </div>
  );
}

export function FieldTableView({ table, tone }: { table: FieldTable; tone: Tone }) {
  const cols = table.columns ?? ['Field', 'Size', 'Example', 'Meaning'];
  return (
    <div className="overflow-x-auto custom-scrollbar -mx-1">
      <table className="w-full text-left text-[13px] border-collapse min-w-[640px]">
        <thead>
          <tr className="text-[10px] uppercase tracking-widest text-slate-500">
            {cols.map((c) => (
              <th key={c} className="px-3 py-2 font-bold border-b border-slate-800">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r) => (
            <tr key={r.name} className="border-b border-slate-800/60 align-top hover:bg-slate-800/20">
              <td className={`px-3 py-2.5 font-bold whitespace-nowrap ${TONES[tone].text}`}>{r.name}</td>
              <td className="px-3 py-2.5 font-mono text-slate-400 whitespace-nowrap">{r.size}</td>
              <td className="px-3 py-2.5 font-mono text-slate-300">{r.example}</td>
              <td className="px-3 py-2.5 text-slate-400 leading-relaxed">{r.meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CommandList({ commands }: { commands: Command[] }) {
  return (
    <div className="space-y-5">
      {commands.map((c) => (
        <div key={c.cmd} className="bg-[#070b12] border border-slate-800 rounded-xl overflow-hidden">
          <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-800 bg-[#0f1624]">
            <code className="font-mono text-[12.5px] text-emerald-300 break-all">
              <span className="text-slate-500 select-none">$ </span>{c.cmd}
            </code>
            <CopyButton text={c.cmd} />
          </div>
          <p className="px-4 pt-3 text-[13px] text-slate-400">{c.purpose}</p>
          <pre className="px-4 py-3 overflow-x-auto font-mono text-[12px] leading-relaxed text-slate-400 custom-scrollbar">{c.output}</pre>
        </div>
      ))}
    </div>
  );
}

export function RiskList({ risks }: { risks: Risk[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {risks.map((r) => (
        <div key={r.name} className="bg-[#070b12] border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-rose-300 font-bold text-[14px]">
            <ShieldAlert className="w-4 h-4 shrink-0" /> {r.name}
          </div>
          <p className="text-[13px] text-slate-400 leading-relaxed">{r.detail}</p>
          <p className="text-[13px] text-emerald-300/90 leading-relaxed flex gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{r.mitigation}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

export function SymptomTable({ rows }: { rows: Symptom[] }) {
  return (
    <div className="divide-y divide-slate-800/70">
      {rows.map((r) => (
        <div key={r.symptom} className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-1 md:gap-6 py-3">
          <div className="font-mono text-[12.5px] text-amber-300">{r.symptom}</div>
          <div className="text-[13px] text-slate-400 leading-relaxed">{r.cause}</div>
        </div>
      ))}
    </div>
  );
}

export function MetricGrid({ metrics, tone }: { metrics: Metric[]; tone: Tone }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {metrics.map((m) => (
        <div key={m.label} className="bg-[#070b12] border border-slate-800 rounded-xl px-4 py-3">
          <div className={`font-mono font-bold text-[15px] ${TONES[tone].text}`}>{m.value}</div>
          <div className="text-[11px] text-slate-500 mt-1 leading-snug">{m.label}</div>
        </div>
      ))}
    </div>
  );
}

export function Chips({ items, tone }: { items: string[]; tone?: Tone }) {
  const cls = tone ? `${TONES[tone].bg} ${TONES[tone].text} ${TONES[tone].soft}` : 'bg-slate-800/50 text-slate-300 border-slate-700';
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <span key={i} className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${cls}`}>{i}</span>
      ))}
    </div>
  );
}

export function Paragraphs({ items }: { items: string[] }) {
  return (
    <div className="space-y-4">
      {items.map((p, i) => (
        <p key={i} className="text-slate-300/90 leading-relaxed text-[15px]">{p}</p>
      ))}
    </div>
  );
}
