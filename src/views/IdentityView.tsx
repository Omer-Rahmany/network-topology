import React, { useState } from 'react';
import { Key, ChevronLeft, ChevronRight, Terminal, ListChecks, ShieldAlert, Info, ArrowRight, ArrowLeft, RotateCw } from 'lucide-react';
import { ACTORS, ID_STEPS, IDENTITY_PITFALLS } from '../data/identity';
import type { Actor, IdMessage } from '../types';
import { CodeTabs, Paragraphs, RiskList, Section } from '../components/ui';

// Horizontal centre of each actor's lifeline, as a percentage of the width.
const LANE: Record<Actor, number> = { browser: 100 / 6, app: 50, okta: (5 * 100) / 6 };

function MessageRow({ m }: { m: IdMessage }) {
  if (m.from === m.to) {
    return (
      <div className="relative h-14">
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 max-w-[60%] bg-amber-500/10 border border-amber-500/40 text-amber-200 rounded-lg px-3 py-1.5 text-[11px] font-mono text-center flex items-center gap-2"
          style={{ left: `${LANE[m.from]}%` }}
        >
          <RotateCw className="w-3.5 h-3.5 shrink-0" /> <span>{m.label}</span>
        </div>
      </div>
    );
  }
  const a = LANE[m.from];
  const b = LANE[m.to];
  const left = Math.min(a, b);
  const width = Math.abs(a - b);
  const rightward = b > a;
  return (
    <div className="relative h-14">
      <div className="absolute top-[60%]" style={{ left: `${left}%`, width: `${width}%` }}>
        <div className="h-[2px] bg-amber-400/70 relative">
          {rightward ? (
            <ArrowRight className="w-4 h-4 text-amber-400 absolute -right-1.5 -top-[7px]" />
          ) : (
            <ArrowLeft className="w-4 h-4 text-amber-400 absolute -left-1.5 -top-[7px]" />
          )}
        </div>
        <div className="absolute bottom-2 left-0 right-0 text-center text-[11px] font-mono text-slate-300 px-3 truncate" title={m.label}>
          {m.label}
        </div>
      </div>
    </div>
  );
}

export function IdentityView() {
  const [activeStep, setActiveStep] = useState(1);
  const step = ID_STEPS[activeStep - 1];
  const prev = ID_STEPS[activeStep - 2];
  const next = ID_STEPS[activeStep];

  return (
    <div className="flex-1 animate-in fade-in duration-300 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-[#070b12] to-[#070b12] p-5 sm:p-8 lg:p-10 min-w-0">
      <div className="max-w-5xl mx-auto w-full space-y-7 pb-16">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-3">
            <Key className="text-amber-400 w-7 h-7 shrink-0" /> Identity Federation & SSO (Okta / OIDC)
          </h2>
          <p className="text-slate-400 text-[14px] mt-2 leading-relaxed">
            How you sign in once with Okta and get access to Your Application Server: the OpenID Connect Authorization Code flow with PKCE, step by step, with the real HTTP messages.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {ID_STEPS.map((s) => (
            <button
              key={s.step}
              onClick={() => setActiveStep(s.step)}
              className={`p-3 rounded-xl border text-left transition-all ${
                activeStep === s.step
                  ? 'bg-[#1e293b] border-amber-500 text-white shadow-lg ring-1 ring-amber-500/50'
                  : 'bg-[#0c121e] border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="text-[10px] font-mono text-amber-400 font-bold">STEP {s.step}</div>
              <div className="font-bold text-[12px] mt-1 leading-snug">{s.title}</div>
            </button>
          ))}
        </div>

        <div key={step.step} className="space-y-7 animate-in fade-in duration-300">
          <section className="bg-[#0c121e] border border-slate-700/80 rounded-2xl p-5 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <h3 className="text-xl sm:text-2xl font-bold text-white">{step.step}. {step.title}</h3>
              <span className="text-[11px] bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full border border-amber-500/20 font-bold whitespace-nowrap">
                OIDC phase
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[16px]">{step.summary}</p>

            <div className="bg-[#070b12] border border-slate-800 rounded-xl p-4 overflow-x-auto custom-scrollbar">
              <div className="min-w-[560px]">
                <div className="grid grid-cols-3 text-center text-[11px] font-bold uppercase tracking-widest">
                  {ACTORS.map((a) => (
                    <div key={a.id} className="text-slate-300">
                      <span className="inline-block bg-slate-800/70 border border-slate-700 rounded-md px-3 py-1.5">{a.label}</span>
                    </div>
                  ))}
                </div>
                <div className="relative mt-2">
                  {ACTORS.map((a) => (
                    <div key={a.id} className="absolute top-0 bottom-0 border-l border-dashed border-slate-700" style={{ left: `${LANE[a.id]}%` }} />
                  ))}
                  {step.messages.map((m, i) => (
                    <MessageRow key={i} m={m} />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <Section title="What happens and why" icon={Info} iconClass="text-sky-400" tone="amber">
            <Paragraphs items={step.details} />
          </Section>

          <Section title="On the wire" icon={Terminal} iconClass="text-amber-400">
            <CodeTabs key={step.step} examples={step.examples} tone="amber" />
          </Section>

          <Section title="Security checks at this step" icon={ListChecks} iconClass="text-emerald-400">
            <ul className="space-y-2.5">
              {step.checks.map((c) => (
                <li key={c} className="flex gap-3 text-[14px] text-slate-300 leading-relaxed">
                  <span className="text-emerald-400 font-bold">✓</span> <span>{c}</span>
                </li>
              ))}
            </ul>
          </Section>

          <nav className="flex justify-between gap-4">
            {prev ? (
              <button onClick={() => setActiveStep(prev.step)} className="flex items-center gap-2 text-[13px] font-bold text-slate-400 hover:text-white">
                <ChevronLeft className="w-4 h-4" /> Step {prev.step}: {prev.title}
              </button>
            ) : <span />}
            {next && (
              <button onClick={() => setActiveStep(next.step)} className="flex items-center gap-2 text-[13px] font-bold text-slate-400 hover:text-white">
                Step {next.step}: {next.title} <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </nav>
        </div>

        <Section title="Common identity pitfalls" icon={ShieldAlert} iconClass="text-rose-400">
          <RiskList risks={IDENTITY_PITFALLS} />
        </Section>
      </div>
    </div>
  );
}
