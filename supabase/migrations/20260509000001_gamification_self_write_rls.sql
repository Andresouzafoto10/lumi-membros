-- =============================================================================
-- Allow students to write their own gamification + student_missions rows.
-- Previously only admins had write access, causing awardPoints() upserts from
-- the client to silently fail under RLS — points_log accumulated correctly
-- but gamification.points stayed at 0, breaking the global ranking.
-- =============================================================================

-- gamification: self insert/update/select
drop policy if exists "gamification: aluno insere próprio" on public.gamification;
create policy "gamification: aluno insere próprio"
  on public.gamification for insert
  with check (student_id = auth.uid());

drop policy if exists "gamification: aluno atualiza próprio" on public.gamification;
create policy "gamification: aluno atualiza próprio"
  on public.gamification for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- student_missions: self insert/update (read already public via existing policies)
drop policy if exists "student_missions: aluno insere próprio" on public.student_missions;
create policy "student_missions: aluno insere próprio"
  on public.student_missions for insert
  with check (student_id = auth.uid());

drop policy if exists "student_missions: aluno atualiza próprio" on public.student_missions;
create policy "student_missions: aluno atualiza próprio"
  on public.student_missions for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- =============================================================================
-- Backfill: recompute gamification.points from points_log for every student.
-- Also recompute current_level using levels table.
-- =============================================================================

with sums as (
  select student_id, sum(points)::int as total
  from public.points_log
  group by student_id
),
levels_desc as (
  select level_number, points_required
  from public.levels
  order by points_required desc
)
insert into public.gamification (student_id, points, current_level)
select
  s.student_id,
  s.total,
  coalesce(
    (select level_number from levels_desc l where s.total >= l.points_required limit 1),
    1
  ) as current_level
from sums s
on conflict (student_id) do update
  set points = excluded.points,
      current_level = excluded.current_level;
