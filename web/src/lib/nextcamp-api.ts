const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3300';

async function fetchAPI<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}/api/nextcamp${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// === Types ===

export interface Role {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  tools: string[];
  constraints: string[];
  system_prompt: string;
}

export interface TeamMember {
  name: string;
  role: string;
  personality: string;
}

export interface TeamLeader {
  name: string;
  role: string;
  purpose: string;
  knowledge: string[];
  rules?: string[];
}

export interface Team {
  id: string;
  name: string;
  description: string;
  workspace: string;
  camp: string;
  leader: TeamLeader;
  members: TeamMember[];
}

export interface LearnedRule {
  rule: string;
  source: string;
  added: string;
  confidence: number;
}

export interface GrowthEntry {
  date: string;
  event: string;
  trigger: string;
}

export interface TeamChemistry {
  combo: string[];
  tasks: number;
  success_rate: number;
  note: string;
}

export interface Member {
  name: string;
  role: string;
  team: string;
  camp: string;
  is_leader: boolean;
  created: string;
  total_tasks: number;
  learned: LearnedRule[];
  strengths: string[];
  weaknesses: string[];
  growth_log: GrowthEntry[];
  team_chemistry?: TeamChemistry[];
}

export interface Camp {
  id: string;
  name: string;
  machine: string;
  always_on: boolean;
  description: string;
}

export interface CampTeamMember {
  name: string;
  role: string;
  is_leader: boolean;
  total_tasks: number;
  learnedCount: number;
}

export interface CampTeam {
  id: string;
  name: string;
  description: string;
  leader: string;
  memberCount: number;
  members: CampTeamMember[];
}

export interface CampHierarchy {
  id: string;
  name: string;
  machine: string;
  always_on: boolean;
  description: string;
  teams: CampTeam[];
}

export interface Overview {
  teams: number;
  members: number;
  camps: number;
  roles: number;
  campHierarchy: CampHierarchy[];
  unassignedTeams: Array<{
    id: string;
    name: string;
    leader: string;
    memberCount: number;
  }>;
}

export interface BuiltPrompt {
  agentName: string;
  role: string;
  team: string;
  prompt: string;
}

// === API Calls ===

export const getOverview = () => fetchAPI<Overview>('/overview');
export const getTeams = () => fetchAPI<Team[]>('/teams');
export const getTeam = (id: string) => fetchAPI<Team>(`/teams/${id}`);
export const getMembers = () => fetchAPI<Member[]>('/members');
export const getMember = (name: string) => fetchAPI<Member>(`/members/${name}`);
export const getRoles = () => fetchAPI<Role[]>('/pool');
export const getRole = (id: string) => fetchAPI<Role>(`/pool/${id}`);
export const getCamps = () => fetchAPI<Camp[]>('/camps');
export const getCamp = (id: string) => fetchAPI<Camp>(`/camps/${id}`);
export const getPromptPreview = (teamId: string, memberName: string) =>
  fetchAPI<BuiltPrompt>(`/prompt/${teamId}/${memberName}`);

export interface CreateTeamRequest {
  id: string;
  name: string;
  description: string;
  workspace: string;
  camp: string;
  leader: {
    name: string;
    role: string;
    purpose: string;
    knowledge: string[];
    rules: string[];
  };
  members: Array<{
    name: string;
    role: string;
    personality: string;
  }>;
}

export async function createTeam(data: CreateTeamRequest): Promise<{ success: boolean; teamId: string; membersCreated: number }> {
  const res = await fetch(`${API_BASE}/api/nextcamp/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  return res.json();
}
