import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronRight, ChevronLeft, Terminal, RefreshCw, ArrowRight, Zap, Table2, ShieldAlert, Wrench, Stethoscope,
} from 'lucide-react';
import { OSI_LAYERS } from '../data/osi';
import { TONES } from '../theme';
import {
  Chips, CodeTabs, CommandList, FieldTableView, Paragraphs, RiskList, Section, SymptomTable,
} from '../components/ui';

export function OsiView() {
  const [activeId, setActiveId] = useState('L4');
  const idx = OSI_LAYERS.findIndex((l) => l.id === activeId);
  const layer = OSI_LAYERS[idx];
  const t = TONES[layer.tone];
  const prev = OSI_LAYERS[idx - 1];
  const next = OSI_LAYERS[idx + 1];
  const listRef = useRef<HTMLDivElement>(null);

  // On narrow screens the layer list scrolls sideways; keep the active one visible.
  useEffect(() => {
    const list = listRef.current;
    const btn = list?.querySelector<HTMLElement>(`[data-layer="${activeId}"]`);
    if (list && btn && list.scrollWidth > list.clientWidth) {
      list.scrollTo({ left: btn.offsetLeft - (list.clientWidth - btn.offsetWidth) / 2, behavior: 'smooth' });
    }
  }, [activeId]);

  return (
    <div className="flex-1 flex flex-col lg:flex-row animate-in fade-in duration-300 min-w-0">
      <aside className="w-full lg:w-[340px] bg-[#0c121e] border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col shrink-0">
        <div className="hidden lg:block p-5 border-b border-slate-800/50 bg-[#070b12]/50">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em]">OSI Stack Encapsulation</h2>
          <p className="text-[13px] text-slate-400 mt-2 leading-relaxed">
            Each layer wraps the one above it. Pick a layer to see real packets, commands and failure modes.
          </p>
        </div>
        <div ref={listRef} className="relative p-3 lg:p-4 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible custom-scrollbar lg:sticky lg:top-0">
          {OSI_LAYERS.map((l) => {
            const isActive = l.id === activeId;
            const lt = TONES[l.tone];
            const Icon = l.icon;
            return (
              <button
                key={l.id}
                data-layer={l.id}
                onClick={() => setActiveId(l.id)}
                className={`min-w-[210px] lg:min-w-0 lg:w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 group relative overflow-hidden ${
                  isActive ? `${lt.border} bg-[#161e2e]` : 'border-slate-800/50 bg-[#070b12] hover:border-slate-600'
                }`}
              >
                {isActive && <div className={`absolute top-0 left-0 w-1 h-full ${lt.solid} opacity-60`}></div>}
                <div className={`p-2 rounded-lg transition-colors ${
                  isActive ? `bg-[#0c121e] ${lt.text} ring-1 ring-inset ${lt.border}` : 'bg-slate-900 text-slate-500 group-hover:text-slate-400'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-bold text-[14px] ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                    {l.id}: {l.name}
                  </div>
                  <div className={`text-[10px] font-mono mt-0.5 uppercase tracking-wider truncate ${isActive ? lt.text : 'text-slate-600'}`}>
                    {l.pdu}
                  </div>
                </div>
                {isActive && <ChevronRight className={`w-5 h-5 shrink-0 ${lt.text}`} />}
              </button>
            );
          })}
        </div>
      </aside>

      <div className="flex-1 min-w-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-[#070b12] to-[#070b12] p-5 sm:p-8 lg:p-10">
        <div key={layer.id} className="max-w-5xl mx-auto space-y-7 pb-16 animate-in fade-in duration-300">
          <header className="space-y-4 border-b border-slate-800 pb-6">
            <div className="flex items-center gap-5">
              <div className={`p-4 rounded-2xl ${t.bg} ${t.text} ring-1 ring-inset ${t.border} shadow-xl shrink-0`}>
                <layer.icon className="w-8 h-8" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Layer {layer.id.replace('L', '')}: {layer.name}
                </h2>
                <p className={`font-mono text-sm mt-1.5 font-bold ${t.text}`}>{layer.proto}</p>
              </div>
            </div>
            <p className="text-slate-300 text-[16px] leading-relaxed">{layer.summary}</p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 text-[12px]">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Unit of data</div>
                <Chips items={[layer.pdu]} tone={layer.tone} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Handled by</div>
                <Chips items={layer.devices} />
              </div>
            </div>
          </header>

          <Section title="Packet inspector: real examples" icon={Terminal} iconClass={t.text}>
            <CodeTabs key={layer.id} examples={layer.examples} tone={layer.tone} />
          </Section>

          {layer.fields && (
            <Section title={layer.fields.title} icon={Table2} iconClass={t.text}>
              <FieldTableView table={layer.fields} tone={layer.tone} />
            </Section>
          )}

          {layer.natTable && (
            <Section title="Address translation along the path" icon={RefreshCw} iconClass="text-orange-400">
              <div className="space-y-6">
                {layer.natTable.map((row) => (
                  <div key={row.title}>
                    <div className="text-[12px] font-bold text-slate-300 mb-3">{row.title}</div>
                    <div className="flex flex-col md:flex-row items-center gap-4 text-[13px] font-mono">
                      <div className="flex-1 w-full bg-[#070b12] border border-slate-700 rounded-lg p-4 text-slate-400">
                        <div className="text-[9px] text-slate-500 uppercase font-sans font-bold mb-2 tracking-widest">Before</div>
                        <pre className="whitespace-pre-wrap">{row.original}</pre>
                      </div>
                      <ArrowRight className="w-6 h-6 text-orange-500 rotate-90 md:rotate-0 shrink-0" />
                      <div className="flex-1 w-full bg-orange-950/20 border border-orange-800/40 rounded-lg p-4 text-orange-300">
                        <div className="text-[9px] text-orange-500/80 uppercase font-sans font-bold mb-2 tracking-widest">After</div>
                        <pre className="whitespace-pre-wrap">{row.translated}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title="Engineering deep dive" icon={Zap} iconClass="text-yellow-400" tone={layer.tone}>
            <Paragraphs items={layer.explanation} />
          </Section>

          <Section title="Try it yourself" icon={Wrench} iconClass="text-emerald-400">
            <CommandList commands={layer.commands} />
          </Section>

          <Section title="Attacks & failure modes" icon={ShieldAlert} iconClass="text-rose-400">
            <RiskList risks={layer.risks} />
          </Section>

          <Section title="Troubleshooting: symptom to cause" icon={Stethoscope} iconClass="text-amber-400">
            <SymptomTable rows={layer.troubleshooting} />
          </Section>

          <nav className="flex justify-between gap-4 pt-2">
            {prev ? (
              <button onClick={() => setActiveId(prev.id)} className="flex items-center gap-2 text-[13px] font-bold text-slate-400 hover:text-white">
                <ChevronLeft className="w-4 h-4" /> {prev.id}: {prev.name}
              </button>
            ) : <span />}
            {next && (
              <button onClick={() => setActiveId(next.id)} className="flex items-center gap-2 text-[13px] font-bold text-slate-400 hover:text-white">
                {next.id}: {next.name} <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
