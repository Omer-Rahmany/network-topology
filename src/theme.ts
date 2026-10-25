// Tailwind only ships classes it can see as literal strings, so every
// colour variant used by the data files is spelled out here.
export const TONES = {
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500', soft: 'border-emerald-500/30', solid: 'bg-emerald-500' },
  sky: { text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500', soft: 'border-sky-500/30', solid: 'bg-sky-500' },
  fuchsia: { text: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500', soft: 'border-fuchsia-500/30', solid: 'bg-fuchsia-500' },
  violet: { text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500', soft: 'border-violet-500/30', solid: 'bg-violet-500' },
  orange: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500', soft: 'border-orange-500/30', solid: 'bg-orange-500' },
  amber: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500', soft: 'border-amber-500/30', solid: 'bg-amber-500' },
  rose: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500', soft: 'border-rose-500/30', solid: 'bg-rose-500' },
  cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500', soft: 'border-cyan-500/30', solid: 'bg-cyan-500' },
  green: { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500', soft: 'border-green-500/30', solid: 'bg-green-500' },
  indigo: { text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500', soft: 'border-indigo-500/30', solid: 'bg-indigo-500' },
  blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500', soft: 'border-blue-500/30', solid: 'bg-blue-500' },
  teal: { text: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500', soft: 'border-teal-500/30', solid: 'bg-teal-500' },
  lime: { text: 'text-lime-400', bg: 'bg-lime-500/10', border: 'border-lime-500', soft: 'border-lime-500/30', solid: 'bg-lime-500' },
  pink: { text: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500', soft: 'border-pink-500/30', solid: 'bg-pink-500' },
  yellow: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500', soft: 'border-yellow-500/30', solid: 'bg-yellow-500' },
  slate: { text: 'text-slate-300', bg: 'bg-slate-500/10', border: 'border-slate-500', soft: 'border-slate-500/30', solid: 'bg-slate-500' },
} as const;

export type Tone = keyof typeof TONES;
