import type { LucideIcon } from 'lucide-react';
import type { Tone } from './theme';

/** A code/terminal snippet shown in a tabbed inspector. */
export interface CodeExample {
  label: string;
  code: string;
  caption?: string;
}

/** One row of a protocol header (or comparison) table. */
export interface FieldRow {
  name: string;
  size: string;
  example: string;
  meaning: string;
}

export interface FieldTable {
  title: string;
  /** Column headings; defaults to Field / Size / Example / Meaning. */
  columns?: [string, string, string, string];
  rows: FieldRow[];
}

/** A CLI command you can run yourself, with sample output. */
export interface Command {
  cmd: string;
  purpose: string;
  output: string;
}

export interface Risk {
  name: string;
  detail: string;
  mitigation: string;
}

export interface Symptom {
  symptom: string;
  cause: string;
}

export interface Metric {
  label: string;
  value: string;
}

export interface NatTranslation {
  title: string;
  original: string;
  translated: string;
}

export interface OsiLayer {
  id: string;
  name: string;
  proto: string;
  icon: LucideIcon;
  tone: Tone;
  /** Protocol data unit name at this layer. */
  pdu: string;
  summary: string;
  /** Where along the path this layer is processed. */
  devices: string[];
  examples: CodeExample[];
  fields?: FieldTable;
  natTable?: NatTranslation[];
  explanation: string[];
  commands: Command[];
  risks: Risk[];
  troubleshooting: Symptom[];
}

export interface TopologyNode {
  id: string;
  label: string;
  icon: LucideIcon;
  tone: Tone;
  summary: string;
  /** OSI layers this hop actually inspects or rewrites. */
  layers: string[];
  details: string[];
  metrics: Metric[];
  examples: CodeExample[];
  risks: Risk[];
}

export type Actor = 'browser' | 'app' | 'okta';

export interface IdMessage {
  from: Actor;
  to: Actor;
  label: string;
}

export interface IdStep {
  step: number;
  title: string;
  summary: string;
  messages: IdMessage[];
  details: string[];
  examples: CodeExample[];
  checks: string[];
}

export interface EncapLayer {
  id: string;
  layer: string;
  name: string;
  tone: Tone;
  header: { label: string; bytes: number };
  trailer?: { label: string; bytes: number };
  detail: string;
}

export interface MtuScenario {
  scenario: string;
  mtu: string;
  mss: string;
  note: string;
}

export interface TimelinePhase {
  label: string;
  start: number;
  duration: number;
  tone: Tone;
  where: 'Client' | 'Network' | 'Edge' | 'Origin';
  layer: string;
  detail: string;
}

export interface Scenario {
  id: string;
  label: string;
  description: string;
  phases: TimelinePhase[];
}
