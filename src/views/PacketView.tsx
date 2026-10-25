import React, { useState } from 'react';
import { Package, Ruler, Info } from 'lucide-react';
import { ENCAP_LAYERS, MTU_SCENARIOS, PAYLOAD_BYTES } from '../data/packet';
import { TONES } from '../theme';
import { FieldTableView, Section } from '../components/ui';

/** Total size of layer i including everything it wraps. */
function sizeOf(i: number): number {
  if (i >= ENCAP_LAYERS.length) return PAYLOAD_BYTES;
  const l = ENCAP_LAYERS[i];
  return l.header.bytes + sizeOf(i + 1) + (l.trailer?.bytes ?? 0);
}

const WIRE_BYTES = sizeOf(0);
const OVERHEAD = WIRE_BYTES - PAYLOAD_BYTES;

function Nest({ depth, selected, onSelect }: { depth: number; selected: string; onSelect: (id: string) => void }) {
  if (depth >= ENCAP_LAYERS.length) {
    return (
      <div className="rounded-lg border-2 border-dashed border-emerald-500/50 bg-emerald-500/5 px-4 py-6 text-center">
        <div className="text-emerald-300 font-bold text-[13px]">Application data</div>
        <div className="font-mono text-[12px] text-slate-400 mt-1">{PAYLOAD_BYTES} B of compressed JSON</div>
      </div>
    );
  }
  const l = ENCAP_LAYERS[depth];
  const t = TONES[l.tone];
  const active = selected === l.id;
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect(l.id);
      }}
      className={`rounded-xl border-2 p-2 sm:p-3 cursor-pointer transition-colors ${active ? `${t.border} ${t.bg}` : 'border-slate-700/70 hover:border-slate-500'}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2 px-1">
        <span className={`font-bold text-[12px] ${t.text}`}>{l.layer} · {l.name} <span className="text-slate-500 font-mono font-normal">({sizeOf(depth)} B)</span></span>
        <span className={`font-mono text-[11px] px-2 py-0.5 rounded border ${t.soft} ${t.text}`}>{l.header.label}: {l.header.bytes} B</span>
      </div>
      <Nest depth={depth + 1} selected={selected} onSelect={onSelect} />
      {l.trailer && (
        <div className="flex justify-end mt-2 px-1">
          <span className={`font-mono text-[11px] px-2 py-0.5 rounded border ${t.soft} ${t.text}`}>{l.trailer.label}: {l.trailer.bytes} B</span>
        </div>
      )}
    </div>
  );
}

export function PacketView() {
  const [selected, setSelected] = useState('l4');
  const sel = ENCAP_LAYERS.find((l) => l.id === selected)!;
  const st = TONES[sel.tone];

  // Wire order: headers outermost-first, payload, trailers innermost-first.
  const wire = [
    ...ENCAP_LAYERS.map((l) => ({ id: l.id, label: l.header.label, bytes: l.header.bytes, tone: l.tone })),
    { id: 'payload', label: 'Payload', bytes: PAYLOAD_BYTES, tone: 'emerald' as const },
    ...[...ENCAP_LAYERS].reverse().filter((l) => l.trailer).map((l) => ({ id: l.id, label: l.trailer!.label, bytes: l.trailer!.bytes, tone: l.tone })),
  ];

  return (
    <div className="flex-1 animate-in fade-in duration-300 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-[#070b12] to-[#070b12] p-5 sm:p-8 lg:p-10 min-w-0">
      <div className="max-w-5xl mx-auto space-y-7 pb-16">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-3">
            <Package className="text-emerald-400 w-7 h-7 shrink-0" /> Packet Anatomy
          </h2>
          <p className="text-slate-400 text-[14px] mt-2 leading-relaxed">
            One full-size packet of the HTTPS response, byte by byte. Each layer adds its own header (and sometimes a trailer) around the layer above it. Click a layer to see what it adds.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { v: `${WIRE_BYTES} B`, l: 'Bytes on the wire' },
            { v: '1500 B', l: 'IP packet (the MTU)' },
            { v: `${PAYLOAD_BYTES} B`, l: 'Your actual data' },
            { v: `${((PAYLOAD_BYTES / WIRE_BYTES) * 100).toFixed(1)}%`, l: `Efficiency (${OVERHEAD} B overhead)` },
          ].map((m) => (
            <div key={m.l} className="bg-[#0c121e] border border-slate-800 rounded-xl px-4 py-3">
              <div className="font-mono font-bold text-[18px] text-white">{m.v}</div>
              <div className="text-[11px] text-slate-500 mt-1">{m.l}</div>
            </div>
          ))}
        </div>

        <Section title="On the wire, in order" icon={Ruler} iconClass="text-sky-400">
          <div className="flex w-full h-12 rounded-lg overflow-hidden border border-slate-700">
            {wire.map((w, i) => {
              const t = TONES[w.tone];
              const active = w.id === selected;
              return (
                <button
                  key={`${w.id}-${i}`}
                  title={`${w.label}: ${w.bytes} B`}
                  onClick={() => w.id !== 'payload' && setSelected(w.id)}
                  style={{ flexGrow: w.bytes }}
                  className={`min-w-[14px] sm:min-w-[22px] border-r border-[#070b12] last:border-r-0 ${t.solid} ${active ? 'opacity-100' : 'opacity-50 hover:opacity-80'} transition-opacity flex items-center justify-center`}
                >
                  {w.id === 'payload' && <span className="text-[11px] font-bold text-emerald-950">payload {w.bytes} B</span>}
                </button>
              );
            })}
          </div>
          <p className="text-[12px] text-slate-500 mt-3">
            Proportional widths (headers are drawn with a minimum width so they stay clickable). Headers come first, then the data, then trailers in reverse order.
          </p>
        </Section>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6 items-start">
          <Section title="Encapsulation, outside in" icon={Package} iconClass="text-emerald-400">
            <Nest depth={0} selected={selected} onSelect={setSelected} />
          </Section>
          <div className="lg:sticky lg:top-6">
            <Section title={`${sel.layer}: ${sel.name}`} icon={Info} iconClass={st.text} tone={sel.tone}>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <span className={`font-mono text-[12px] px-2.5 py-1 rounded border ${st.soft} ${st.text}`}>{sel.header.label}: {sel.header.bytes} B</span>
                  {sel.trailer && (
                    <span className={`font-mono text-[12px] px-2.5 py-1 rounded border ${st.soft} ${st.text}`}>{sel.trailer.label}: {sel.trailer.bytes} B</span>
                  )}
                </div>
                <p className="text-slate-300/90 leading-relaxed text-[14px]">{sel.detail}</p>
              </div>
            </Section>
          </div>
        </div>

        <Section title="MTU and MSS in different setups" icon={Ruler} iconClass="text-orange-400">
          <p className="text-[14px] text-slate-400 mb-5 leading-relaxed">
            MTU is the biggest IP packet a link carries; MSS is the biggest chunk of TCP data that fits inside it. Every tunnel or extra header shrinks the MSS. If a hop silently drops packets that are too big, small requests work and large ones hang.
          </p>
          <FieldTableView
            tone="orange"
            table={{
              title: 'MTU scenarios',
              columns: ['Setup', 'MTU', 'TCP MSS', 'Why'],
              rows: MTU_SCENARIOS.map((s) => ({ name: s.scenario, size: s.mtu, example: s.mss, meaning: s.note })),
            }}
          />
        </Section>
      </div>
    </div>
  );
}
