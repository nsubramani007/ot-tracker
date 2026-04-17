-- Run this in your Supabase SQL Editor (supabase.com → your project → SQL Editor)

create table ot_entries (
  id              bigint generated always as identity primary key,
  created_at      timestamptz default now(),
  agent_name      text not null,
  agent_email     text not null,
  shift           text not null,
  team_leader     text not null,
  date            date not null,
  regular_hours   numeric default 0,
  ot_hours        numeric default 0,
  contest_emails  integer default 0,
  case_ids        text default ''
);

-- Allow anyone to insert (agents submitting)
alter table ot_entries enable row level security;

create policy "Anyone can insert entries"
  on ot_entries for insert
  with check (true);

create policy "Anyone can read entries"
  on ot_entries for select
  using (true);
