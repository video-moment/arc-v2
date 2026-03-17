'use client';

import { useState } from 'react';
import { Plus, Trash2, Crown, Users, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createTeam, type Camp, type Role } from '@/lib/nextcamp-api';

interface MemberInput {
  name: string;
  role: string;
  personality: string;
}

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camps: Camp[];
  roles: Role[];
  onCreated: () => void;
}

export default function CreateTeamDialog({ open, onOpenChange, camps, roles, onCreated }: CreateTeamDialogProps) {
  const [step, setStep] = useState<'info' | 'leader' | 'members' | 'confirm'>(  'info');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Team info
  const [teamName, setTeamName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [description, setDescription] = useState('');
  const [workspace, setWorkspace] = useState('');
  const [campId, setCampId] = useState(camps[0]?.id ?? 'hq');

  // Step 2: Leader
  const [leaderName, setLeaderName] = useState('');
  const [leaderRole, setLeaderRole] = useState(roles[0]?.id ?? 'planner');
  const [leaderPurpose, setLeaderPurpose] = useState('');

  // Step 3: Members
  const [members, setMembers] = useState<MemberInput[]>([]);

  const reset = () => {
    setStep('info');
    setTeamName(''); setTeamId(''); setDescription(''); setWorkspace('');
    setCampId(camps[0]?.id ?? 'hq');
    setLeaderName(''); setLeaderRole(roles[0]?.id ?? 'planner'); setLeaderPurpose('');
    setMembers([]);
    setError('');
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const autoId = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const addMember = () => {
    setMembers([...members, { name: '', role: roles.find(r => r.id !== leaderRole)?.id ?? roles[0]?.id ?? 'coder', personality: '' }]);
  };

  const updateMember = (i: number, field: keyof MemberInput, value: string) => {
    const updated = [...members];
    updated[i] = { ...updated[i], [field]: value };
    setMembers(updated);
  };

  const removeMember = (i: number) => {
    setMembers(members.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      await createTeam({
        id: teamId,
        name: teamName,
        description,
        workspace,
        camp: campId,
        leader: {
          name: leaderName,
          role: leaderRole,
          purpose: leaderPurpose,
          knowledge: [],
          rules: [],
        },
        members: members.filter(m => m.name.trim()),
      });
      handleOpenChange(false);
      onCreated();
    } catch (e: any) {
      setError(e.message || '팀 생성에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  const canNextFromInfo = teamName.trim() && teamId.trim();
  const canNextFromLeader = leaderName.trim() && leaderRole;
  const canSubmit = canNextFromInfo && canNextFromLeader;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg font-bold">팀 만들기</DialogTitle>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-3">
            {(['info', 'leader', 'members', 'confirm'] as const).map((s, i) => {
              const labels = ['팀 정보', '리더 설정', '팀원 추가', '확인'];
              const isActive = s === step;
              const idx = ['info', 'leader', 'members', 'confirm'].indexOf(step);
              const isPast = i < idx;
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 text-[11px] font-medium ${isActive ? 'text-primary' : isPast ? 'text-emerald-500' : 'text-muted-foreground/40'}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${isActive ? 'border-primary bg-primary/10' : isPast ? 'border-emerald-500 bg-emerald-500/10' : 'border-muted-foreground/20'}`}>
                      {isPast ? '✓' : i + 1}
                    </span>
                    {labels[i]}
                  </div>
                  {i < 3 && <div className={`w-4 h-px ${isPast ? 'bg-emerald-500' : 'bg-border'}`} />}
                </div>
              );
            })}
          </div>
        </DialogHeader>

        <div className="px-6 py-5 min-h-[280px]">
          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-[13px]">
              {error}
            </div>
          )}

          {/* Step 1: Team Info */}
          {step === 'info' && (
            <div className="space-y-4">
              <Field label="팀 이름" required>
                <input
                  value={teamName}
                  onChange={e => { setTeamName(e.target.value); if (!teamId || teamId === autoId(teamName)) setTeamId(autoId(e.target.value)); }}
                  placeholder="예: 콘텐츠팀"
                  className="input-field"
                />
              </Field>
              <Field label="팀 ID" hint="영문/숫자/하이픈, URL에 사용" required>
                <input
                  value={teamId}
                  onChange={e => setTeamId(e.target.value.replace(/[^a-z0-9-]/g, ''))}
                  placeholder="예: content-team"
                  className="input-field font-mono text-[13px]"
                />
              </Field>
              <Field label="설명">
                <input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="이 팀이 하는 일"
                  className="input-field"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="캠프">
                  <select value={campId} onChange={e => setCampId(e.target.value)} className="input-field">
                    {camps.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.machine})</option>
                    ))}
                  </select>
                </Field>
                <Field label="워크스페이스">
                  <input
                    value={workspace}
                    onChange={e => setWorkspace(e.target.value)}
                    placeholder="~/projects/..."
                    className="input-field font-mono text-[13px]"
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Step 2: Leader */}
          {step === 'leader' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Crown size={14} className="text-amber-500" />
                <p className="text-sm font-medium">팀 리더를 설정하세요</p>
              </div>
              <p className="text-xs text-muted-foreground -mt-2 mb-3">리더는 팀의 목표와 규칙을 관리합니다</p>
              <Field label="이름" required hint="팀원의 이름을 정해주세요">
                <input
                  value={leaderName}
                  onChange={e => setLeaderName(e.target.value)}
                  placeholder="예: 하준"
                  className="input-field"
                />
              </Field>
              <Field label="역할" required>
                <select value={leaderRole} onChange={e => setLeaderRole(e.target.value)} className="input-field">
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name} — {r.description}</option>
                  ))}
                </select>
              </Field>
              <Field label="목적" hint="이 리더가 팀에서 하는 역할">
                <input
                  value={leaderPurpose}
                  onChange={e => setLeaderPurpose(e.target.value)}
                  placeholder="예: 프로젝트 설계와 코드 품질을 총괄한다"
                  className="input-field"
                />
              </Field>
            </div>
          )}

          {/* Step 3: Members */}
          {step === 'members' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-primary" />
                  <p className="text-sm font-medium">팀원을 추가하세요</p>
                </div>
                <button
                  onClick={addMember}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <UserPlus size={13} /> 추가
                </button>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">팀원은 나중에도 추가할 수 있습니다</p>

              {members.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-border rounded-xl">
                  <UserPlus size={20} className="mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground/50">아직 팀원이 없습니다</p>
                  <button onClick={addMember} className="text-xs text-primary mt-1 hover:underline">
                    첫 번째 팀원 추가
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {members.map((m, i) => (
                    <div key={i} className="flex gap-2 items-start p-3 rounded-xl border border-border bg-accent/30">
                      <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={m.name}
                            onChange={e => updateMember(i, 'name', e.target.value)}
                            placeholder="이름"
                            className="input-field text-[13px]"
                          />
                          <select
                            value={m.role}
                            onChange={e => updateMember(i, 'role', e.target.value)}
                            className="input-field text-[13px]"
                          >
                            {roles.map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        </div>
                        <input
                          value={m.personality}
                          onChange={e => updateMember(i, 'personality', e.target.value)}
                          placeholder="성격/특성 (선택)"
                          className="input-field text-[13px]"
                        />
                      </div>
                      <button onClick={() => removeMember(i)} className="p-1.5 text-muted-foreground/40 hover:text-destructive transition-colors mt-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <p className="text-sm font-medium mb-4">아래 내용으로 팀을 생성합니다</p>
              <div className="rounded-xl border border-border p-4 space-y-3 text-[13px]">
                <Row label="팀 이름" value={teamName} />
                <Row label="팀 ID" value={teamId} mono />
                <Row label="캠프" value={camps.find(c => c.id === campId)?.name ?? campId} />
                {description && <Row label="설명" value={description} />}
                {workspace && <Row label="워크스페이스" value={workspace} mono />}
                <div className="border-t border-border pt-3 mt-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Crown size={11} className="text-amber-500" />
                    <span className="font-medium">리더: {leaderName}</span>
                    <span className="text-muted-foreground/50">({leaderRole})</span>
                  </div>
                  {members.filter(m => m.name.trim()).length > 0 && (
                    <div className="space-y-1 ml-4">
                      {members.filter(m => m.name.trim()).map((m, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                          <span>{m.name}</span>
                          <span className="text-muted-foreground/50">({m.role})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground/40 pt-2">
                  총 {1 + members.filter(m => m.name.trim()).length}명의 멤버가 생성됩니다
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-accent/30">
          <button
            onClick={() => {
              if (step === 'info') handleOpenChange(false);
              else if (step === 'leader') setStep('info');
              else if (step === 'members') setStep('leader');
              else setStep('members');
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {step === 'info' ? '취소' : '이전'}
          </button>
          <button
            onClick={() => {
              setError('');
              if (step === 'info' && canNextFromInfo) setStep('leader');
              else if (step === 'leader' && canNextFromLeader) setStep('members');
              else if (step === 'members') setStep('confirm');
              else if (step === 'confirm') handleSubmit();
            }}
            disabled={(step === 'info' && !canNextFromInfo) || (step === 'leader' && !canNextFromLeader) || submitting}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? '생성 중...' : step === 'confirm' ? '팀 생성' : '다음'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground/40 mt-1">{hint}</p>}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground/60">{label}</span>
      <span className={`font-medium ${mono ? 'font-mono text-[12px]' : ''}`}>{value}</span>
    </div>
  );
}
