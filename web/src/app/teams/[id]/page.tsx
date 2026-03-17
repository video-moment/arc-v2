'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getTeam, getMembers, getCamp, type Team, type Member, type Camp } from '@/lib/nextcamp-api';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, Crown, Users, FolderOpen, BookOpen, ChevronRight,
  Shield, Clock, Calendar, Circle, AlertTriangle, Cpu,
} from 'lucide-react';

type MemberStatus = 'working' | 'idle' | 'new';

function getMemberStatus(member: Member): MemberStatus {
  if (member.total_tasks === 0) return 'new';
  const lastLog = member.growth_log?.[member.growth_log.length - 1];
  if (!lastLog) return 'idle';
  const daysSince = (Date.now() - new Date(lastLog.date).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince < 1 ? 'working' : 'idle';
}

const statusConfig: Record<MemberStatus, { label: string; color: string; dot: string }> = {
  working: { label: '작업 중', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  idle: { label: '대기', color: 'text-muted-foreground/50', dot: 'bg-muted-foreground/40' },
  new: { label: '신규', color: 'text-blue-400', dot: 'bg-blue-400' },
};

const roleColors: Record<string, string> = {
  planner: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  coder: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  reviewer: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  writer: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  researcher: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [memberDetails, setMemberDetails] = useState<Member[]>([]);
  const [camp, setCamp] = useState<Camp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getTeam(id)
      .then(async (t) => {
        setTeam(t);
        const [allMembers, campData] = await Promise.all([
          getMembers(),
          t.camp ? getCamp(t.camp).catch(() => null) : Promise.resolve(null),
        ]);
        const teamMemberNames = [t.leader.name, ...t.members.map(m => m.name)];
        setMemberDetails(allMembers.filter(m => teamMemberNames.includes(m.name)));
        setCamp(campData);
      })
      .catch((err) => setError(err.message || 'Failed to load team'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <DetailSkeleton />;

  if (error || !team) {
    return (
      <div className="max-w-4xl">
        <Link href="/teams" className="inline-flex items-center gap-2 text-sm mb-6 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> 팀 목록
        </Link>
        <div className="rounded-2xl p-6 text-sm bg-destructive/10 text-destructive border border-destructive/20">
          {error || 'Team not found'}
        </div>
      </div>
    );
  }

  const leaderDetail = memberDetails.find(m => m.name === team.leader.name);
  const membersDetail = memberDetails.filter(m => m.name !== team.leader.name);
  const totalTasks = memberDetails.reduce((sum, m) => sum + (m.total_tasks ?? 0), 0);
  const totalLearned = memberDetails.reduce((sum, m) => sum + (m.learned?.length ?? 0), 0);

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      {/* Back link */}
      <Link href="/teams" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} /> 팀 목록
      </Link>

      {/* Team header */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shrink-0">
              {team.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{team.name}</h1>
              {team.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{team.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {camp && (
            <Link href={`/camps/${camp.id}`} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent hover:bg-accent/80 transition-colors">
              <Cpu size={11} />
              <span>{camp.name}</span>
              {camp.always_on && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
            </Link>
          )}
          {team.workspace && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent">
              <FolderOpen size={11} />
              <code className="text-[11px]">{team.workspace}</code>
            </span>
          )}
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent">
            <Users size={11} />
            {memberDetails.length}명
          </span>
          {totalTasks > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent">
              <Clock size={11} />
              {totalTasks}건 완료
            </span>
          )}
          {totalLearned > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent">
              <BookOpen size={11} />
              {totalLearned}개 규칙
            </span>
          )}
        </div>
      </div>

      {/* Org Chart */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">조직도</h2>

        <OrgTree
          leader={<MemberCard member={leaderDetail} teamMember={{ name: team.leader.name, role: team.leader.role, personality: '' }} isLeader />}
          members={membersDetail.map(m => {
            const tm = team.members.find(t => t.name === m.name);
            return <MemberCard key={m.name} member={m} teamMember={tm ?? { name: m.name, role: m.role, personality: '' }} />;
          })}
        />
      </div>

      {/* Team Rules */}
      {team.leader.rules && team.leader.rules.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={15} className="text-amber-400" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">팀 규칙</h2>
          </div>
          <div className="space-y-2">
            {team.leader.rules.map((rule, i) => (
              <div key={i} className="flex items-start gap-2.5 text-[13px] text-muted-foreground leading-relaxed">
                <AlertTriangle size={12} className="text-amber-400 mt-0.5 shrink-0" />
                {rule}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Knowledge */}
      {team.leader.knowledge && team.leader.knowledge.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={15} className="text-primary" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">도메인 지식</h2>
          </div>
          <div className="space-y-2">
            {team.leader.knowledge.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 text-[13px] text-muted-foreground leading-relaxed">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule / Recent Activity */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={15} className="text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">활동 & 스케줄</h2>
        </div>

        {(() => {
          const allLogs = memberDetails.flatMap(m =>
            (m.growth_log ?? []).map(g => ({ ...g, memberName: m.name, memberRole: m.role }))
          ).sort((a, b) => b.date.localeCompare(a.date));

          if (allLogs.length === 0) {
            return (
              <div className="text-center py-8">
                <Calendar size={24} className="mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground/50">아직 활동 기록이 없습니다</p>
                <p className="text-xs text-muted-foreground/30 mt-1">작업이 완료되면 자동으로 기록됩니다</p>
              </div>
            );
          }

          return (
            <div className="space-y-3">
              {allLogs.slice(0, 10).map((entry, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center mt-1">
                    <Circle size={6} className="text-primary fill-primary" />
                    {i < Math.min(allLogs.length, 10) - 1 && <div className="w-px h-full min-h-[24px] bg-border mt-1" />}
                  </div>
                  <div className="flex-1 min-w-0 pb-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[13px] font-medium">{entry.memberName}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${roleColors[entry.memberRole] ?? 'bg-muted text-muted-foreground'}`}>
                        {entry.memberRole}
                      </span>
                      <span className="text-[11px] text-muted-foreground/40 ml-auto shrink-0">{entry.date}</span>
                    </div>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">{entry.event}</p>
                    {entry.trigger && (
                      <p className="text-[11px] text-muted-foreground/40 mt-0.5">{entry.trigger}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function MemberCard({ member, teamMember, isLeader }: {
  member?: Member;
  teamMember: { name: string; role: string; personality: string };
  isLeader?: boolean;
}) {
  const status = member ? getMemberStatus(member) : 'new';
  const sc = statusConfig[status];
  const rc = roleColors[teamMember.role] ?? 'bg-muted text-muted-foreground border-border';

  return (
    <Link
      href={`/members/${encodeURIComponent(teamMember.name)}`}
      className="group w-[160px] rounded-xl border border-border bg-card hover:border-primary/30 transition-all p-4"
    >
      <div className="flex flex-col items-center text-center">
        {/* Avatar */}
        <div className={`relative w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold mb-2 ${isLeader ? 'bg-primary/15 text-primary ring-2 ring-primary/20' : 'bg-accent text-muted-foreground'}`}>
          {teamMember.name[0]}
          {/* Status dot inside avatar */}
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${sc.dot} ${status === 'working' ? 'animate-pulse' : ''}`} />
        </div>

        {/* Name */}
        <div className="flex items-center gap-1 mb-1">
          {isLeader && <Crown size={11} className="text-amber-400" />}
          <span className="text-[13px] font-semibold group-hover:text-primary transition-colors">{teamMember.name}</span>
        </div>

        {/* Role badge */}
        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${rc}`}>
          {teamMember.role}
        </span>

        {/* Status */}
        <span className={`text-[10px] mt-1.5 ${sc.color}`}>{sc.label}</span>

        {/* Stats */}
        {member && (member.total_tasks > 0 || (member.learned?.length ?? 0) > 0) && (
          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground/40">
            {member.total_tasks > 0 && <span>{member.total_tasks}건</span>}
            {member.learned && member.learned.length > 0 && (
              <span className="text-amber-500/60">{member.learned.length}규칙</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

/** Org chart tree: leader on top, members below with clean connector lines */
function OrgTree({ leader, members }: { leader: React.ReactNode; members: React.ReactNode[] }) {
  if (members.length === 0) {
    return <div className="flex flex-col items-center">{leader}</div>;
  }

  // Card width 160px + gap 24px between cards
  const CARD_W = 160;
  const GAP = 24;
  const count = members.length;
  const totalW = count * CARD_W + (count - 1) * GAP;
  const STEM = 32; // vertical stem from leader
  const DROP = 24; // vertical drop to member cards
  const BAR_Y = STEM; // y of horizontal bar

  return (
    <div className="flex flex-col items-center">
      {leader}

      {/* SVG connector */}
      <svg
        width={totalW}
        height={STEM + DROP}
        className="shrink-0"
        style={{ overflow: 'visible' }}
        strokeLinecap="round"
      >
        {/* Vertical stem from center */}
        <line x1={totalW / 2} y1={0} x2={totalW / 2} y2={BAR_Y} stroke="#c4c4c4" strokeWidth={1.5} />

        {count > 1 ? (
          <>
            {/* Horizontal bar */}
            <line
              x1={CARD_W / 2}
              y1={BAR_Y}
              x2={totalW - CARD_W / 2}
              y2={BAR_Y}
              stroke="#c4c4c4"
              strokeWidth={1.5}
            />
            {/* Vertical drops to each member */}
            {members.map((_, i) => {
              const cx = i * (CARD_W + GAP) + CARD_W / 2;
              return (
                <line key={i} x1={cx} y1={BAR_Y} x2={cx} y2={BAR_Y + DROP} stroke="#c4c4c4" strokeWidth={1.5} />
              );
            })}
          </>
        ) : (
          /* Single member — just extend the stem */
          <line x1={totalW / 2} y1={BAR_Y} x2={totalW / 2} y2={BAR_Y + DROP} stroke="#c4c4c4" strokeWidth={1.5} />
        )}
      </svg>

      {/* Member cards */}
      <div className="flex" style={{ gap: GAP }}>
        {members}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="max-w-4xl space-y-6">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}
