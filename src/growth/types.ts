/**
 * 성장 시스템 타입 정의
 */

export interface TaskFeedback {
  task_id: string;
  agent: string;          // 피드백 대상 (수호, 채원 등)
  team_id: string;
  reviewer: string;       // 검수자 (팀장 or 리뷰어)
  verdict: 'success' | 'partial_success' | 'failure';
  positives: string[];
  negatives: FeedbackNegative[];
  suggestions: string[];
  timestamp: string;
}

export interface FeedbackNegative {
  issue: string;
  detail?: string;
  severity: 'error' | 'warning' | 'info';
  recurring: boolean;     // 이전에도 같은 실수를 했는지
}

export interface ExperienceUpdate {
  memberName: string;
  action: 'add_rule' | 'boost_confidence' | 'reduce_confidence' | 'remove_rule' | 'add_strength' | 'remove_weakness' | 'add_weakness';
  data: {
    rule?: string;
    source?: string;
    confidence_delta?: number;
    strength?: string;
    weakness?: string;
  };
}
