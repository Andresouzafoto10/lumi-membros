-- =============================================================================
-- Broaden gamification + student_missions write policies to any authenticated
-- user (matches the points_log "sistema insere" pattern).
--
-- Reason: awardPoints() is also called cross-user (e.g. liking a post awards
-- points to the post AUTHOR, not the liker). A self-only RLS policy would
-- block those updates. Authentication is sufficient — the engine controls
-- which row is written based on action semantics.
-- =============================================================================

drop policy if exists "gamification: aluno insere próprio" on public.gamification;
drop policy if exists "gamification: aluno atualiza próprio" on public.gamification;

create policy "gamification: autenticado insere"
  on public.gamification for insert
  with check (auth.uid() is not null);

create policy "gamification: autenticado atualiza"
  on public.gamification for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "student_missions: aluno insere próprio" on public.student_missions;
drop policy if exists "student_missions: aluno atualiza próprio" on public.student_missions;

create policy "student_missions: autenticado insere"
  on public.student_missions for insert
  with check (auth.uid() is not null);

create policy "student_missions: autenticado atualiza"
  on public.student_missions for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);
