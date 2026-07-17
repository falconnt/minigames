-- Online highscores voor de Minigames-app.
-- Wordt automatisch toegepast via de Supabase↔GitHub-koppeling; je kunt dit ook
-- handmatig draaien in de Supabase SQL Editor.

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  username text not null,
  game text not null,
  score integer not null,
  created_at timestamptz not null default now()
);

alter table public.scores enable row level security;

-- Iedereen mag de ranglijst lezen.
drop policy if exists "scores_select_all" on public.scores;
create policy "scores_select_all"
  on public.scores for select
  using (true);

-- Alleen de ingelogde gebruiker mag zijn eigen score toevoegen.
drop policy if exists "scores_insert_own" on public.scores;
create policy "scores_insert_own"
  on public.scores for insert
  with check (auth.uid() = user_id);

create index if not exists scores_game_score_idx
  on public.scores (game, score desc);
