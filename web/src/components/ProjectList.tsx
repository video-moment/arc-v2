'use client';

import { useState } from 'react';
import type { PomoProject, PomoSubproject, PomoTask } from '@/lib/api';
import { FolderIcon, SubfolderIcon, ChevronIcon, PlusIcon, XIcon, TomatoIcon, InboxIcon } from './Icons';

interface Props {
  projects: PomoProject[];
  subprojects: PomoSubproject[];
  tasks: PomoTask[];
  selectedProjectId: string | null;
  selectedSubprojectId: string | null;
  showStats: boolean;
  showInbox: boolean;
  inboxCount: number;
  onSelectProject: (id: string | null) => void;
  onSelectSubproject: (id: string | null) => void;
  onShowStats: () => void;
  onShowInbox: () => void;
  onCreateProject: (name: string, color: string) => void;
  onDeleteProject: (id: string) => void;
  onCreateSubproject: (projectId: string, name: string) => void;
  onDeleteSubproject: (id: string) => void;
}

const PROJECT_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#06b6d4'];

export default function ProjectList({
  projects, subprojects, tasks,
  selectedProjectId, selectedSubprojectId, showStats, showInbox, inboxCount,
  onSelectProject, onSelectSubproject, onShowStats, onShowInbox,
  onCreateProject, onDeleteProject,
  onCreateSubproject, onDeleteSubproject,
}: Props) {
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [addingSubTo, setAddingSubTo] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');

  const toggleExpand = (id: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    onCreateProject(newProjectName.trim(), newProjectColor);
    setNewProjectName('');
    setShowProjectForm(false);
  };

  const handleCreateSubproject = (e: React.FormEvent, projectId: string) => {
    e.preventDefault();
    if (!newSubName.trim()) return;
    onCreateSubproject(projectId, newSubName.trim());
    setNewSubName('');
    setAddingSubTo(null);
  };

  const getTaskCount = (projectId: string) => {
    const subIds = subprojects.filter(s => s.projectId === projectId).map(s => s.id);
    return tasks.filter(t =>
      t.status !== 'completed' &&
      (t.projectId === projectId || (t.subprojectId && subIds.includes(t.subprojectId)))
    ).length;
  };

  const getSubTaskCount = (subprojectId: string) =>
    tasks.filter(t => t.subprojectId === subprojectId && t.status !== 'completed').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 space-y-0.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <button
          onClick={onShowStats}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] font-medium transition-all"
          style={{
            background: showStats ? 'var(--accent-soft)' : 'transparent',
            color: showStats ? 'var(--accent-hover)' : 'var(--text-tertiary)',
          }}
        >
          <TomatoIcon size={13} />
          통계
        </button>
        <button
          onClick={onShowInbox}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] font-medium transition-all"
          style={{
            background: showInbox ? 'var(--accent-soft)' : 'transparent',
            color: showInbox ? 'var(--accent-hover)' : 'var(--text-tertiary)',
          }}
        >
          <InboxIcon size={13} />
          인박스
          {inboxCount > 0 && (
            <span className="ml-auto text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              {inboxCount}
            </span>
          )}
        </button>
        <button
          onClick={() => { onSelectProject(null); onSelectSubproject(null); }}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] font-medium transition-all"
          style={{
            background: !showStats && !selectedProjectId ? 'var(--accent-soft)' : 'transparent',
            color: !showStats && !selectedProjectId ? 'var(--accent-hover)' : 'var(--text-tertiary)',
          }}
        >
          전체 할 일
          <span className="ml-auto text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            {tasks.filter(t => t.status !== 'completed').length}
          </span>
        </button>
      </div>

      {/* Project tree */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {projects.map(p => {
          const isExpanded = expandedProjects.has(p.id);
          const isSelected = selectedProjectId === p.id && !selectedSubprojectId;
          const subs = subprojects.filter(s => s.projectId === p.id);

          return (
            <div key={p.id}>
              {/* Project row */}
              <div className="group flex items-center">
                <button
                  onClick={() => toggleExpand(p.id)}
                  className="p-1 flex-shrink-0"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <ChevronIcon size={11} direction={isExpanded ? 'down' : 'right'} />
                </button>
                <button
                  onClick={() => { onSelectProject(p.id); onSelectSubproject(null); }}
                  className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] font-medium transition-all truncate"
                  style={{
                    background: isSelected ? 'var(--accent-soft)' : 'transparent',
                    color: isSelected ? 'var(--accent-hover)' : 'var(--text-secondary)',
                    borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                    transform: 'translateX(0)',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'var(--bg-hover, var(--bg-elevated))';
                      e.currentTarget.style.transform = 'translateX(2px)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }
                  }}
                >
                  <span style={{ filter: `drop-shadow(0 0 3px ${p.color}40)` }}>
                    <FolderIcon size={13} color={p.color} />
                  </span>
                  <span className="truncate">{p.name}</span>
                  <span className="ml-auto text-[11px] flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                    {getTaskCount(p.id)}
                  </span>
                </button>
                <button
                  onClick={() => { setAddingSubTo(addingSubTo === p.id ? null : p.id); if (!isExpanded) toggleExpand(p.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 transition-opacity flex-shrink-0"
                  style={{ color: 'var(--text-tertiary)' }}
                  title="세부 프로젝트 추가"
                >
                  <PlusIcon size={12} />
                </button>
                <button
                  onClick={() => onDeleteProject(p.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 transition-opacity flex-shrink-0"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <XIcon size={11} />
                </button>
              </div>

              {/* Subprojects */}
              {isExpanded && (
                <div className="ml-4 space-y-0.5">
                  {subs.map(sub => {
                    const isSubSelected = selectedSubprojectId === sub.id;
                    return (
                      <div key={sub.id} className="group flex items-center">
                        <button
                          onClick={() => { onSelectProject(p.id); onSelectSubproject(sub.id); }}
                          className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] font-medium transition-all truncate"
                          style={{
                            background: isSubSelected ? 'var(--accent-soft)' : 'transparent',
                            color: isSubSelected ? 'var(--accent-hover)' : 'var(--text-tertiary)',
                            borderLeft: isSubSelected ? '3px solid var(--accent)' : '3px solid transparent',
                            transform: 'translateX(0)',
                          }}
                          onMouseEnter={e => {
                            if (!isSubSelected) {
                              e.currentTarget.style.background = 'var(--bg-hover, var(--bg-elevated))';
                              e.currentTarget.style.transform = 'translateX(2px)';
                            }
                          }}
                          onMouseLeave={e => {
                            if (!isSubSelected) {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.transform = 'translateX(0)';
                            }
                          }}
                        >
                          <SubfolderIcon size={12} color={sub.color} />
                          <span className="truncate">{sub.name}</span>
                          <span className="ml-auto text-[11px] flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                            {getSubTaskCount(sub.id)}
                          </span>
                        </button>
                        <button
                          onClick={() => onDeleteSubproject(sub.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 transition-opacity flex-shrink-0"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          <XIcon size={11} />
                        </button>
                      </div>
                    );
                  })}

                  {/* Add subproject form */}
                  {addingSubTo === p.id && (
                    <form onSubmit={(e) => handleCreateSubproject(e, p.id)} className="flex items-center gap-1 px-2 py-1">
                      <SubfolderIcon size={12} color="var(--text-tertiary)" />
                      <input
                        autoFocus
                        value={newSubName}
                        onChange={e => setNewSubName(e.target.value)}
                        onBlur={() => { if (!newSubName.trim()) setAddingSubTo(null); }}
                        placeholder="세부 프로젝트명"
                        className="flex-1 px-2 py-1 rounded text-[12px] outline-none"
                        style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      />
                    </form>
                  )}

                  {subs.length === 0 && addingSubTo !== p.id && (
                    <p className="text-[11px] px-2 py-1" style={{ color: 'var(--text-tertiary)' }}>
                      + 버튼으로 세부 프로젝트 추가
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add project */}
      <div className="px-3 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        {showProjectForm ? (
          <form onSubmit={handleCreateProject} className="space-y-2">
            <input
              autoFocus
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              placeholder="프로젝트 이름"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
            <div className="flex gap-1.5">
              {PROJECT_COLORS.map(c => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setNewProjectColor(c)}
                  className="w-5 h-5 rounded-full transition-transform"
                  style={{
                    background: c,
                    transform: newProjectColor === c ? 'scale(1.3)' : 'scale(1)',
                    boxShadow: newProjectColor === c
                      ? '0 0 0 2px var(--bg-secondary), 0 0 0 3px ' + c
                      : '0 0 4px ' + c + '40',
                  }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--accent)', color: '#fff' }}>
                추가
              </button>
              <button type="button" onClick={() => setShowProjectForm(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                취소
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowProjectForm(true)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          >
            <PlusIcon size={12} /> 프로젝트 추가
          </button>
        )}
      </div>
    </div>
  );
}
