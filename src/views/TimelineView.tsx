import React, { useState } from 'react';
import { Timer, Info, Gauge, Lightbulb, Table2 } from 'lucide-react';
import { LATENCY_REFERENCE, SCENARIOS, TAKEAWAYS } from '../data/timeline';
import { TONES } from '../theme';
import type { TimelinePhase } from '../types';
import { FieldTableView, Section } from '../components/ui';

const WHERE_TONE: Record<TimelinePhase['where'], keyof typeof TONES> = {
  Client: 'lime',
  Network: 'orange',
  Edge: 'rose',
  Origin: 'emerald',
};

export function TimelineView() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const scenario = SCENARIOS.find((s) => s.id === scenarioId)!;
  const phases = scenario.phases;
  const phase = phases[Math.min(phaseIdx, phases.length - 1)];
  const total = Math.max(...phases.map((p) => p.start + p.duration));
  const tick = total > 100 ? 20 : total > 40 ? 10 : 2;
  const ticks = Array.from({ length: Math.floor(total / tick) + 1 }, (_, i) => i * tick);

  const byWhere = (Object.keys(WHERE_TONE) as TimelinePhase['where'][])
    .map((w) => ({ where: w, ms: phases.filter((p) => p.where === w).reduce((s, p) => s + p.duration, 0) }))
    .filter((x) => x.ms > 0);

  const fmt = (ms: number) => (ms < 1 ? ms.toFixed(1) : Number.isInteger(ms) ? `${ms}` : ms.toFixed(1));

  return (
    <div className="flex-1 animate-in fade-in duration-300 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-[#070b12] to-[#070b12] p-5 sm:p-8 lg:p-10 min-w-0">
      <div className="max-w-5xl mx-auto space-y-7 pb-16">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-3">
            <Timer className="text-sky-400 w-7 h-7 shrink-0" /> Request Timeline
          </h2>
          <p className="text-slate-400 text-[14px] mt-2 leading-relaxed">
            Where every millisecond goes for one API call from Your Computer (near Frankfurt) to Your Application Server (in Virginia, us-east-1). Click a bar for details.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setScenarioId(s.id);
                setPhaseIdx(0);
              }}
              className={`px-4 py-2 rounded-lg text-[12px] font-bold border transition-all ${
                s.id === scenarioId ? 'bg-[#1e293b] text-white border-sky-500' : 'bg-[#0c121e] text-slate-400 border-slate-800 hover:border-slate-600'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <section key={scenario.id} className="bg-[#0c121e]/80 border border-slate-700/50 rounded-2xl p-5 sm:p-7 shadow-lg space-y-5 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-800 pb-4">
            <p className="text-[14px] text-slate-300 leading-relaxed max-w-2xl">{scenario.description}</p>
            <div className="text-right shrink-0">
              <div className="font-mono text-3xl font-extrabold text-white">{fmt(total)} ms</div>
              <div className="text-[11px] text-slate-500 uppercase tracking-widest">total</div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="hidden sm:grid grid-cols-[200px_1fr] gap-4">
              <div />
              <div className="relative h-5">
                {ticks.map((v) => (
                  <span key={v} className="absolute -translate-x-1/2 text-[10px] font-mono text-slate-600" style={{ left: `${(v / total) * 100}%` }}>
                    {v}
                  </span>
                ))}
              </div>
            </div>
            {phases.map((p, i) => {
              const t = TONES[p.tone];
              const active = i === phaseIdx;
              return (
                <button
                  key={p.label}
                  onClick={() => setPhaseIdx(i)}
                  className={`w-full grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-1 sm:gap-4 items-center text-left rounded-md px-1 py-1 transition-colors ${active ? 'bg-slate-800/50' : 'hover:bg-slate-800/25'}`}
                >
                  <div className="flex items-center justify-between gap-2 text-[12px]">
                    <span className={`font-bold truncate ${active ? 'text-white' : 'text-slate-400'}`}>{p.label}</span>
                    <span className="font-mono text-slate-500 shrink-0">{fmt(p.duration)} ms</span>
                  </div>
                  <div className="relative h-5 bg-[#070b12] rounded">
                    {ticks.map((v) => (
                      <div key={v} className="absolute top-0 bottom-0 border-l border-slate-800/80" style={{ left: `${(v / total) * 100}%` }} />
                    ))}
                    <div
                      className={`absolute top-0.5 bottom-0.5 rounded-sm ${t.solid} ${active ? 'opacity-100 ring-2 ring-white/40' : 'opacity-70'}`}
                      style={{ left: `${(p.start / total) * 100}%`, width: `max(3px, ${(p.duration / total) * 100}%)` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          <div className={`rounded-xl border ${TONES[phase.tone].soft} ${TONES[phase.tone].bg} p-4 space-y-2`}>
            <div className="flex flex-wrap items-center gap-2 text-[12px]">
              <Info className={`w-4 h-4 ${TONES[phase.tone].text}`} />
              <span className="font-bold text-white">{phase.label}</span>
              <span className="font-mono text-slate-400">{fmt(phase.start)} → {fmt(phase.start + phase.duration)} ms</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-700 text-slate-300">{phase.where}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-700 text-slate-300">{phase.layer}</span>
            </div>
            <p className="text-[14px] text-slate-300 leading-relaxed">{phase.detail}</p>
          </div>
        </section>

        <Section title="Where the time goes" icon={Gauge} iconClass="text-orange-400">
          <div className="space-y-3">
            {byWhere.map((w) => {
              const t = TONES[WHERE_TONE[w.where]];
              return (
                <div key={w.where} className="grid grid-cols-[90px_1fr_80px] items-center gap-3 text-[13px]">
                  <span className={`font-bold ${t.text}`}>{w.where}</span>
                  <div className="h-3 bg-[#070b12] rounded overflow-hidden">
                    <div className={`h-full ${t.solid}`} style={{ width: `${(w.ms / total) * 100}%` }} />
                  </div>
                  <span className="font-mono text-slate-400 text-right">{fmt(w.ms)} ms</span>
                </div>
              );
            })}
          </div>
          <p className="text-[12px] text-slate-500 mt-4">"Network" is time in flight; "Client" is DNS resolution.</p>
        </Section>

        <Section title="Takeaways" icon={Lightbulb} iconClass="text-yellow-400" tone="sky">
          <ul className="space-y-3">
            {TAKEAWAYS.map((t) => (
              <li key={t} className="flex gap-3 text-[14px] text-slate-300 leading-relaxed">
                <span className="text-sky-400 font-bold">→</span> <span>{t}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={LATENCY_REFERENCE.title} icon={Table2} iconClass="text-sky-400">
          <FieldTableView table={LATENCY_REFERENCE} tone="sky" />
        </Section>
      </div>
    </div>
  );
}
