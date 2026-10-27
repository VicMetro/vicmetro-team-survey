-- Vic Metro team feedback survey responses. Anon may INSERT only; no IP / device info stored. Never delete rows.
create table if not exists public.team_survey_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  is_test boolean not null default false,
  source text not null default 'web',
  name text null,
  answers jsonb not null default '{}'::jsonb,
  details jsonb not null default '{}'::jsonb,
  posted_at timestamptz null,
  slack_ts text null,
  constraint team_survey_name_len check (name is null or char_length(name) <= 200),
  constraint team_survey_answers_obj check (jsonb_typeof(answers) = 'object'),
  constraint team_survey_details_obj check (jsonb_typeof(details) = 'object')
);
create index if not exists team_survey_unposted on public.team_survey_responses (created_at) where posted_at is null;

alter table public.team_survey_responses enable row level security;
revoke all on public.team_survey_responses from anon, authenticated;
grant insert on public.team_survey_responses to anon, authenticated;
create policy "anon can insert unposted survey responses" on public.team_survey_responses
  for insert to anon, authenticated with check (posted_at is null and slack_ts is null);

create or replace function public.team_survey_before_insert() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  new.created_at := now(); new.posted_at := null; new.slack_ts := null;   -- the client can't set these
  new.name := nullif(btrim(new.name), '');                                -- blank = anonymous
  return new;
end $$;
drop trigger if exists team_survey_before_insert on public.team_survey_responses;
create trigger team_survey_before_insert before insert on public.team_survey_responses
  for each row execute function public.team_survey_before_insert();
