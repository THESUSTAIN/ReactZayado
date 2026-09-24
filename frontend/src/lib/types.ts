// Mirror of every persisted slice of the Cockpit — hand-written, nothing infers anywhere.
export type Channel = "Email" | "LinkedIn" | "Appel" | "WhatsApp";
export type EnergyLevel = "Faible" | "Moyen" | "Haut";
export type ActionBucket = "today" | "week" | "delegue";
export type IdeaCategory = "Offre" | "Marketing / Contenu" | "Optimisation interne" | "À creuser plus tard";
export type DocTypeId = "brief" | "plan30" | "swot" | "offre";
export type InvoiceStatus = "Payée" | "En attente" | "Relance";
export type ChatRole = "prospect" | "agent" | "system";

export interface RadarOpportunity {
  id: string;
  action: string;
  channel: Channel;
  score: number;
  objective: string;
  message: string;
}

export interface EnergyEntry {
  date: string; // YYYY-MM-DD
  level: number; // 1..10
  mode: string;
}

export interface VisionObjective {
  id: string;
  label: string;
  detail: string;
  progress: number; // 0..100
}

export interface VisionState {
  mission: string;
  cap: string;
  objectives: VisionObjective[];
  antiGoals: string[];
}

export interface RadarState {
  day: string;
  scansUsed: number; // max 5 / day
  opportunities: RadarOpportunity[];
  handledIds: string[];
}

export interface StrictRule {
  id: string;
  label: string;
  active: boolean;
}

export interface AgentConfig {
  name: string;
  tone: string;
  welcome: string;
  offers: string;
  faq: string;
  hours: string;
  rules: StrictRule[];
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
}

export interface ActionItem {
  id: string;
  title: string;
  project: string;
  minutes: number;
  energy: EnergyLevel;
  bucket: ActionBucket;
  done: boolean;
}

export interface Idea {
  id: string;
  text: string;
  category: IdeaCategory;
  refined: string | null;
  createdAt: string;
}

export interface GeneratedDoc {
  id: string;
  type: DocTypeId;
  target: string;
  goal: string;
  constraints: string;
  content: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  client: string;
  amount: number;
  due: string; // YYYY-MM-DD
  status: InvoiceStatus;
}

export interface RevenuePoint {
  month: string;
  value: number;
  prevision: number | null;
}

export interface FinanceState {
  objective: number;
  treasury: number;
  monthlyCharges: number;
  revenue: RevenuePoint[];
  invoices: Invoice[];
}

export interface ReviewState {
  wins: string[];
  blockers: string;
  learnings: string;
  nextPriority: string;
  summary: string | null;
}

export interface CockpitState {
  energy: EnergyEntry[];
  vision: VisionState;
  radar: RadarState;
  agentConfig: AgentConfig;
  agentChat: ChatMessage[];
  actions: ActionItem[];
  ideas: Idea[];
  docs: GeneratedDoc[];
  finance: FinanceState;
  review: ReviewState;
}
