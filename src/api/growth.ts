import { Router } from 'express';
import { extractFeedback } from '../growth/feedback-extractor.js';
import { applyFeedback, updateTeamChemistry } from '../growth/experience-updater.js';

export function createGrowthRoutes(): Router {
  const router = Router();

  /**
   * POST /api/growth/feedback
   * 피드백을 받아서 경험 파일을 자동 업데이트한다.
   *
   * Body:
   * {
   *   task_id: string,
   *   agent: string,        // 대상 에이전트 이름
   *   team_id: string,
   *   reviewer: string,     // 검수자 이름
   *   verdict: "success" | "partial_success" | "failure",
   *   positives: string[],
   *   negatives: [{ issue: string, detail?: string, severity?: string }],
   *   suggestions?: string[]
   * }
   */
  router.post('/feedback', (req, res) => {
    try {
      const feedback = extractFeedback(req.body);
      const result = applyFeedback(feedback);
      res.json({
        ok: true,
        member: result.memberName,
        changes: result.changes,
        feedback,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  /**
   * POST /api/growth/chemistry
   * 팀원 조합 성과를 팀장 경험 파일에 기록한다.
   *
   * Body:
   * {
   *   leader: string,       // 팀장 이름
   *   combo: string[],      // 투입된 팀원 이름들
   *   success: boolean
   * }
   */
  router.post('/chemistry', (req, res) => {
    try {
      const { leader, combo, success } = req.body;
      updateTeamChemistry(leader, combo, success);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}
