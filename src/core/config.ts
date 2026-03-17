import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parse, stringify } from 'yaml';

// Project root (arc-v2/)
const ROOT = resolve(import.meta.dirname, '..', '..');

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  tools: string[];
  constraints: string[];
  system_prompt: string;
}

export interface MemberExperience {
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
  rules: string[];
}

export interface TeamDefinition {
  id: string;
  name: string;
  description: string;
  workspace: string;
  camp: string;
  leader: TeamLeader;
  members: TeamMember[];
}

export interface CampDefinition {
  id: string;
  name: string;
  machine: string;
  always_on: boolean;
  description: string;
}

function loadYamlDir<T>(dir: string): T[] {
  const dirPath = join(ROOT, dir);
  if (!existsSync(dirPath)) return [];
  return readdirSync(dirPath)
    .filter(f => f.endsWith('.yaml') && !f.startsWith('_'))
    .map(f => parse(readFileSync(join(dirPath, f), 'utf-8')) as T);
}

function loadYamlFile<T>(path: string): T | null {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return null;
  return parse(readFileSync(fullPath, 'utf-8')) as T;
}

export function loadRoles(): RoleDefinition[] {
  return loadYamlDir<RoleDefinition>('agents');
}

export function loadRole(roleId: string): RoleDefinition | null {
  return loadYamlFile<RoleDefinition>(`agents/${roleId}.yaml`);
}

export function loadTeams(): TeamDefinition[] {
  return loadYamlDir<TeamDefinition>('teams');
}

export function loadTeam(teamId: string): TeamDefinition | null {
  return loadYamlFile<TeamDefinition>(`teams/${teamId}.yaml`);
}

export function loadMembers(): MemberExperience[] {
  return loadYamlDir<MemberExperience>('members');
}

export function loadMember(name: string): MemberExperience | null {
  return loadYamlFile<MemberExperience>(`members/${name}.yaml`);
}

export function loadCamps(): CampDefinition[] {
  return loadYamlDir<CampDefinition>('camps');
}

export function loadCamp(campId: string): CampDefinition | null {
  return loadYamlFile<CampDefinition>(`camps/${campId}.yaml`);
}

function saveYamlFile(path: string, data: unknown): void {
  const fullPath = join(ROOT, path);
  const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(fullPath, stringify(data, { lineWidth: 0 }), 'utf-8');
}

export function saveTeam(teamId: string, data: TeamDefinition): void {
  saveYamlFile(`teams/${teamId}.yaml`, data);
}

export function saveMember(name: string, data: MemberExperience): void {
  saveYamlFile(`members/${name}.yaml`, data);
}

export { ROOT };
