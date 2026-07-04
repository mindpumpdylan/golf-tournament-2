-- Run once in the Supabase SQL editor for this project.
-- Records which team member's ball was used for each individual stroke on a
-- hole (scramble format). One row per (team_id, hole_number, shot_number).

create table shot_logs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  hole_number int not null,
  shot_number int not null,
  player_id uuid not null references profiles(id) on delete cascade,
  entered_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  unique (team_id, hole_number, shot_number)
);

alter table shot_logs enable row level security;

-- IMPORTANT: these policies mirror what we assume `scores` already has
-- (team members can read/write only their own team's rows). Before relying
-- on this, open Dashboard -> Authentication -> Policies -> scores and check
-- the real predicate there, then adjust these to match exactly.

create policy "Team members can view their team's shot logs"
  on shot_logs for select
  using (
    exists (
      select 1 from team_members
      where team_members.team_id = shot_logs.team_id
        and team_members.player_id = auth.uid()
    )
  );

create policy "Team members can insert their team's shot logs"
  on shot_logs for insert
  with check (
    exists (
      select 1 from team_members
      where team_members.team_id = shot_logs.team_id
        and team_members.player_id = auth.uid()
    )
  );

create policy "Team members can update their team's shot logs"
  on shot_logs for update
  using (
    exists (
      select 1 from team_members
      where team_members.team_id = shot_logs.team_id
        and team_members.player_id = auth.uid()
    )
  );

create policy "Team members can delete their team's shot logs"
  on shot_logs for delete
  using (
    exists (
      select 1 from team_members
      where team_members.team_id = shot_logs.team_id
        and team_members.player_id = auth.uid()
    )
  );
