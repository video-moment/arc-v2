-- ARC V2: 노트 기능 테이블
-- Supabase SQL Editor에서 실행

-- 1. 노트 그룹 (폴더)
create table if not exists note_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text default '📁',
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. 노트 페이지
create table if not exists note_pages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references note_groups(id) on delete cascade,
  title text not null,
  emoji text default '📝',
  content text default '',
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 인덱스
create index if not exists idx_note_pages_group on note_pages(group_id);

-- updated_at 자동 갱신 트리거
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_note_groups_updated
  before update on note_groups
  for each row execute function update_updated_at();

create trigger trg_note_pages_updated
  before update on note_pages
  for each row execute function update_updated_at();

-- RLS 비활성화 (개인 대시보드이므로)
alter table note_groups enable row level security;
alter table note_pages enable row level security;

create policy "Allow all on note_groups" on note_groups for all using (true) with check (true);
create policy "Allow all on note_pages" on note_pages for all using (true) with check (true);
