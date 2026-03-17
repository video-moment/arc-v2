import { Router } from 'express';
import { loadRoles, loadTeams, loadMembers, loadCamps, loadRole, loadTeam, loadMember, loadCamp, saveTeam, saveMember } from '../core/config.js';
import { buildPrompt } from '../agents/prompt-builder.js';

export function createNextCampRoutes(): Router {
  const router = Router();

  // === 에이전트 풀 (역할) ===
  router.get('/pool', (_req, res) => {
    res.json(loadRoles());
  });

  router.get('/pool/:id', (req, res) => {
    const role = loadRole(req.params.id);
    if (!role) return res.status(404).json({ error: '역할을 찾을 수 없습니다' });
    res.json(role);
  });

  // === 팀 ===
  router.get('/teams', (_req, res) => {
    res.json(loadTeams());
  });

  router.get('/teams/:id', (req, res) => {
    const team = loadTeam(req.params.id);
    if (!team) return res.status(404).json({ error: '팀을 찾을 수 없습니다' });
    res.json(team);
  });

  // === 멤버 ===
  router.get('/members', (_req, res) => {
    res.json(loadMembers());
  });

  router.get('/members/:name', (req, res) => {
    const member = loadMember(req.params.name);
    if (!member) return res.status(404).json({ error: '멤버를 찾을 수 없습니다' });
    res.json(member);
  });

  // === 캠프 ===
  router.get('/camps', (_req, res) => {
    res.json(loadCamps());
  });

  router.get('/camps/:id', (req, res) => {
    const camp = loadCamp(req.params.id);
    if (!camp) return res.status(404).json({ error: '캠프를 찾을 수 없습니다' });
    res.json(camp);
  });

  // === 팀 생성 ===
  router.post('/teams', (req, res) => {
    try {
      const { id, name, description, workspace, camp, leader, members } = req.body;

      if (!id || !name || !leader?.name || !leader?.role) {
        return res.status(400).json({ error: '필수 필드: id, name, leader.name, leader.role' });
      }

      // 중복 체크
      if (loadTeam(id)) {
        return res.status(409).json({ error: `팀 ID '${id}'가 이미 존재합니다` });
      }

      const existingMembers = loadMembers();
      const allNames = [leader.name, ...(members ?? []).map((m: any) => m.name)];
      const duplicate = allNames.find(n => existingMembers.some(em => em.name === n));
      if (duplicate) {
        return res.status(409).json({ error: `멤버 이름 '${duplicate}'가 이미 존재합니다` });
      }

      const today = new Date().toISOString().split('T')[0];

      // 팀 YAML 저장
      saveTeam(id, {
        id,
        name,
        description: description || '',
        workspace: workspace || '',
        camp: camp || 'hq',
        leader: {
          name: leader.name,
          role: leader.role,
          purpose: leader.purpose || '',
          knowledge: leader.knowledge || [],
          rules: leader.rules || [],
        },
        members: (members ?? []).map((m: any) => ({
          name: m.name,
          role: m.role,
          personality: m.personality || '',
        })),
      });

      // 리더 멤버 YAML 저장
      saveMember(leader.name, {
        name: leader.name,
        role: leader.role,
        team: name,
        camp: camp || 'hq',
        is_leader: true,
        created: today,
        total_tasks: 0,
        learned: [],
        strengths: [],
        weaknesses: [],
        growth_log: [],
        team_chemistry: [],
      });

      // 멤버 YAML 저장
      for (const m of members ?? []) {
        saveMember(m.name, {
          name: m.name,
          role: m.role,
          team: name,
          camp: camp || 'hq',
          is_leader: false,
          created: today,
          total_tasks: 0,
          learned: [],
          strengths: [],
          weaknesses: [],
          growth_log: [],
        });
      }

      res.status(201).json({ success: true, teamId: id, membersCreated: allNames.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // === 프롬프트 미리보기 ===
  router.get('/prompt/:teamId/:memberName', (req, res) => {
    try {
      const result = buildPrompt({
        memberName: req.params.memberName,
        teamId: req.params.teamId,
        task: req.query.task as string | undefined,
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // === 전체 현황 ===
  router.get('/overview', (_req, res) => {
    const teams = loadTeams();
    const members = loadMembers();
    const camps = loadCamps();
    const roles = loadRoles();

    // 캠프 중심 계층 구조: Camp > Team > Member
    const campHierarchy = camps.map(camp => {
      const campTeams = teams.filter(t => t.camp === camp.id);
      return {
        id: camp.id,
        name: camp.name,
        machine: camp.machine,
        always_on: camp.always_on,
        description: camp.description,
        teams: campTeams.map(t => {
          const teamMembers = members.filter(m => m.team === t.name);
          return {
            id: t.id,
            name: t.name,
            description: t.description,
            leader: t.leader.name,
            memberCount: (t.members?.length ?? 0) + 1,
            members: teamMembers.map(m => ({
              name: m.name,
              role: m.role,
              is_leader: m.is_leader,
              total_tasks: m.total_tasks ?? 0,
              learnedCount: m.learned?.length ?? 0,
            })),
          };
        }),
      };
    });

    // 캠프에 소속되지 않은 팀 (미배치)
    const assignedCampIds = camps.map(c => c.id);
    const unassignedTeams = teams.filter(t => !t.camp || !assignedCampIds.includes(t.camp));

    res.json({
      teams: teams.length,
      members: members.length,
      camps: camps.length,
      roles: roles.length,
      campHierarchy,
      unassignedTeams: unassignedTeams.map(t => ({
        id: t.id,
        name: t.name,
        leader: t.leader.name,
        memberCount: (t.members?.length ?? 0) + 1,
      })),
    });
  });

  return router;
}
