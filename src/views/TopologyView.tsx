import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, ShieldCheck, Gauge, Terminal, ShieldAlert } from 'lucide-react';
import type { TopologyNode } from '../types';
import { TONES } from '../theme';
import { Chips, CodeTabs, MetricGrid, Paragraphs, RiskList, Section } from '../components/ui';

export function TopologyView({ nodes, intro }: { nodes: TopologyNode[]; intro: string }) {
  const [activeId, setActiveId] = useState(nodes[0].id);
  const idx = Math.max(0, nodes.findIndex((n) => n.id === activeId));
  const node = nodes[idx];
  const t = TONES[node.tone];
  const prev = nodes[idx - 1];
  const next = nodes[idx + 1];

  return (
    <div className="flex-1 flex flex-col animate-in fade-in duration-300 min-w-0">
      <div className="w-full bg-[#0c121e] border-b border-slate-800 pt-6 pb-8 shrink-0">
        <p className="text-center text-[13px] text-slate-400 px-6 mb-6 max-w-3xl mx-auto leading-relaxed">{intro}</p>
        <div className="overflow-x-auto custom-scrollbar">
          <div className="flex items-center min-w-max px-8 sm:px-12 mx-auto justify-center pb-2">
            {nodes.map((n, i) => {
              const isActive = n.id === node.id;
              const nt = TONES[n.tone];
              const Icon = n.icon;
              return (
                <React.Fragment key={n.id}>
                  <button onClick={() => setActiveId(n.id)} className="group flex flex-col items-center relative outline-none w-24">
                    <div
                      className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 shadow-2xl relative z-10 ${
                        isActive
                          ? `bg-[#111827] ${nt.text} ${nt.border} scale-110 ring-4 ring-[#070b12]`
                          : 'bg-[#070b12] border-slate-700 text-slate-500 group-hover:border-slate-500 group-hover:text-slate-300 group-hover:scale-105'
                      }`}
                    >
                      <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 1.5} />
                      {isActive && <div className={`absolute -inset-2 rounded-2xl border ${nt.border} opacity-30 animate-pulse`}></div>}
                    </div>
                    <div className={`mt-4 text-[10px] font-extrabold uppercase tracking-[0.08em] text-center leading-tight transition-colors ${
                      isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                    }`}>
                      {n.label}
                    </div>
                  </button>
                  {i < nodes.length - 1 && (
                    <div className="w-10 sm:w-14 relative flex items-center -mt-8">
                      <div className={`h-[2px] w-full transition-colors ${idx > i ? 'bg-sky-500/60' : 'bg-slate-800'}`}></div>
                      <ChevronRight className={`absolute -right-2.5 w-5 h-5 ${idx > i ? 'text-sky-400' : 'text-slate-700'}`} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-[#070b12] to-[#070b12] p-5 sm:p-8 lg:p-10">
        <div key={node.id} className="max-w-5xl mx-auto space-y-7 pb-16 animate-in fade-in duration-300">
          <header className="flex flex-col sm:flex-row items-start gap-6">
            <div className={`p-5 rounded-3xl bg-[#0c121e] border-2 ${t.border} ${t.text} shadow-[0_0_30px_rgba(0,0,0,0.5)] shrink-0`}>
              <node.icon className="w-12 h-12" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div className="text-[11px] font-mono text-slate-500">Hop {idx + 1} of {nodes.length}</div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{node.label}</h2>
              <p className={`font-bold text-[11px] uppercase tracking-widest inline-block px-4 py-1.5 rounded-full border ${t.bg} ${t.text} ${t.soft}`}>
                {node.summary}
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">OSI layers touched</span>
                <Chips items={node.layers} />
              </div>
            </div>
          </header>

          <Section title="Key numbers" icon={Gauge} iconClass={t.text}>
            <MetricGrid metrics={node.metrics} tone={node.tone} />
          </Section>

          <Section title="Architecture & mechanics" icon={ShieldCheck} iconClass="text-emerald-400" tone={node.tone}>
            <Paragraphs items={node.details} />
          </Section>

          <Section title="Real-world examples" icon={Terminal} iconClass={t.text}>
            <CodeTabs key={node.id} examples={node.examples} tone={node.tone} />
          </Section>

          <Section title="What can go wrong" icon={ShieldAlert} iconClass="text-rose-400">
            <RiskList risks={node.risks} />
          </Section>

          <nav className="flex justify-between gap-4 pt-2">
            {prev ? (
              <button onClick={() => setActiveId(prev.id)} className="flex items-center gap-2 text-[13px] font-bold text-slate-400 hover:text-white">
                <ChevronLeft className="w-4 h-4" /> {prev.label}
              </button>
            ) : <span />}
            {next && (
              <button onClick={() => setActiveId(next.id)} className="flex items-center gap-2 text-[13px] font-bold text-slate-400 hover:text-white">
                {next.label} <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
