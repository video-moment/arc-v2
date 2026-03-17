import { loadRole, loadTeam, loadMember } from '../core/config.js';
import type { RoleDefinition, TeamDefinition, MemberExperience, TeamMember } from '../core/config.js';

/**
 * 프롬프트 합성기
 * 역할(agents/) + 팀(teams/) + 경험(members/) → 최종 프롬프트
 *
 * 47번째 수호는 1번째 수호와 다른 프롬프트를 받는다.
 */

interface BuildOptions {
  memberName: string;
  teamId: string;
  task?: string;        // 팀장이 내리는 구체적 작업 지시
}

interface BuiltPrompt {
  agentName: string;
  role: string;
  team: string;
  prompt: string;
}

export function buildPrompt(options: BuildOptions): BuiltPrompt {
  const { memberName, teamId, task } = options;

  const team = loadTeam(teamId);
  if (!team) throw new Error(`팀을 찾을 수 없습니다: ${teamId}`);

  const member = loadMember(memberName);
  if (!member) throw new Error(`멤버를 찾을 수 없습니다: ${memberName}`);

  const role = loadRole(member.role);
  if (!role) throw new Error(`역할을 찾을 수 없습니다: ${member.role}`);

  // 팀장인지 팀원인지에 따라 다른 프롬프트
  if (member.is_leader) {
    return {
      agentName: memberName,
      role: member.role,
      team: team.name,
      prompt: buildLeaderPrompt(team, member, role),
    };
  }

  // 팀원 프롬프트
  const teamMember = findTeamMember(team, memberName);
  return {
    agentName: memberName,
    role: member.role,
    team: team.name,
    prompt: buildMemberPrompt(team, member, role, teamMember, task),
  };
}

function buildLeaderPrompt(
  team: TeamDefinition,
  member: MemberExperience,
  role: RoleDefinition,
): string {
  const sections: string[] = [];

  // 정체성
  sections.push(`너는 "${member.name}"이다. ${team.name}의 팀장.`);
  sections.push(`목적: ${team.leader.purpose}`);
  sections.push('');

  // 팀 컨텍스트
  sections.push('## 팀 정보');
  sections.push(`- 팀: ${team.name}`);
  sections.push(`- 설명: ${team.description}`);
  sections.push(`- 작업 디렉토리: ${team.workspace}`);
  sections.push('');

  // 팀장 지식
  if (team.leader.knowledge?.length > 0) {
    sections.push('## 도메인 지식');
    for (const k of team.leader.knowledge) {
      sections.push(`- ${k}`);
    }
    sections.push('');
  }

  // 팀장 규칙
  if (team.leader.rules?.length > 0) {
    sections.push('## 팀 규칙 (반드시 지킨다)');
    for (const r of team.leader.rules) {
      sections.push(`- ${r}`);
    }
    sections.push('');
  }

  // 팀원 목록
  if (team.members?.length > 0) {
    sections.push('## 팀원');
    for (const m of team.members) {
      sections.push(`- ${m.name} (${m.role}): ${m.personality}`);
    }
    sections.push('');
  }

  // 경험에서 배운 것
  const learnedSection = buildLearnedSection(member);
  if (learnedSection) sections.push(learnedSection);

  // 강약점
  const strengthsSection = buildStrengthsSection(member);
  if (strengthsSection) sections.push(strengthsSection);

  // 팀 조합 학습
  const chemistrySection = buildChemistrySection(member);
  if (chemistrySection) sections.push(chemistrySection);

  // 팀장 역할 지시
  sections.push('## 팀장으로서의 행동 원칙');
  sections.push('- 작업이 들어오면 어떤 팀원이 필요한지 판단한다.');
  sections.push('- 팀원에게 명확한 지시를 내리고, 결과를 검수한다.');
  sections.push('- 팀원이 부족하거나 안 맞으면 교체를 건의한다.');
  sections.push('- 최종 결과를 CEO에게 보고한다.');

  return sections.join('\n');
}

function buildMemberPrompt(
  team: TeamDefinition,
  member: MemberExperience,
  role: RoleDefinition,
  teamMember: TeamMember | null,
  task?: string,
): string {
  const sections: string[] = [];

  // 정체성
  sections.push(`너는 "${member.name}"이다. ${team.name} 소속 ${role.name}.`);
  if (teamMember?.personality) {
    sections.push(`성격: ${teamMember.personality}`);
  }
  sections.push('');

  // 역할 기본 프롬프트
  sections.push('## 역할');
  sections.push(role.system_prompt.trim());
  sections.push('');

  // 역할 제약조건
  if (role.constraints?.length > 0) {
    sections.push('## 기본 제약조건');
    for (const c of role.constraints) {
      sections.push(`- ${c}`);
    }
    sections.push('');
  }

  // 팀 컨텍스트
  sections.push('## 팀 컨텍스트');
  sections.push(`- 팀: ${team.name}`);
  sections.push(`- 작업 디렉토리: ${team.workspace}`);
  sections.push('');

  // 팀 규칙 (팀장 규칙은 팀원에게도 적용)
  if (team.leader.rules?.length > 0) {
    sections.push('## 팀 규칙 (반드시 지킨다)');
    for (const r of team.leader.rules) {
      sections.push(`- ${r}`);
    }
    sections.push('');
  }

  // 경험에서 배운 것 (핵심!)
  const learnedSection = buildLearnedSection(member);
  if (learnedSection) sections.push(learnedSection);

  // 강약점
  const strengthsSection = buildStrengthsSection(member);
  if (strengthsSection) sections.push(strengthsSection);

  // 작업 지시
  if (task) {
    sections.push('## 이번 작업');
    sections.push(task);
  }

  return sections.join('\n');
}

function buildLearnedSection(member: MemberExperience): string | null {
  if (!member.learned || member.learned.length === 0) return null;

  // 신뢰도 0.5 이상인 규칙만 프롬프트에 포함
  const activeRules = member.learned.filter(r => r.confidence >= 0.5);
  if (activeRules.length === 0) return null;

  const lines = ['## 경험에서 배운 것들 (반드시 지킨다)'];

  // 신뢰도 높은 순으로 정렬
  const sorted = activeRules.sort((a, b) => b.confidence - a.confidence);
  for (const rule of sorted) {
    const pct = Math.round(rule.confidence * 100);
    lines.push(`- ${rule.rule} (신뢰도: ${pct}%)`);
  }
  lines.push('');

  return lines.join('\n');
}

function buildStrengthsSection(member: MemberExperience): string | null {
  const hasStrengths = member.strengths && member.strengths.length > 0;
  const hasWeaknesses = member.weaknesses && member.weaknesses.length > 0;
  if (!hasStrengths && !hasWeaknesses) return null;

  const lines: string[] = [];

  if (hasStrengths) {
    lines.push('## 강점 (적극 활용한다)');
    for (const s of member.strengths) {
      lines.push(`- ${s}`);
    }
    lines.push('');
  }

  if (hasWeaknesses) {
    lines.push('## 약점 (특히 주의한다)');
    for (const w of member.weaknesses) {
      lines.push(`- ${w}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function buildChemistrySection(member: MemberExperience): string | null {
  if (!member.team_chemistry || member.team_chemistry.length === 0) return null;

  const lines = ['## 팀원 조합 경험'];
  for (const c of member.team_chemistry) {
    const pct = Math.round(c.success_rate * 100);
    lines.push(`- ${c.combo.join(' + ')}: 성공률 ${pct}% (${c.tasks}건) — ${c.note}`);
  }
  lines.push('');

  return lines.join('\n');
}

function findTeamMember(team: TeamDefinition, name: string): TeamMember | null {
  return team.members.find(m => m.name === name) ?? null;
}
