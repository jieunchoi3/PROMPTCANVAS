-- The owner's flashcard study progress (spaced repetition state per card).
-- Card ids are derived from asset/tag ids on the client, e.g. "f:<asset>:<category>" or "r:<tag>".

create table if not exists prompt_canvas.flashcard_reviews (
  user_id uuid not null default prompt_canvas.library_owner(),
  card_id text not null,
  due_at timestamptz not null default now(),
  interval_days real not null default 0,
  reps integer not null default 0,
  lapses integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

alter table prompt_canvas.flashcard_reviews enable row level security;

create policy pc_owner_all on prompt_canvas.flashcard_reviews for all to authenticated
  using (user_id = (select auth.uid()) and (select auth.uid()) = prompt_canvas.library_owner())
  with check (user_id = (select auth.uid()) and (select auth.uid()) = prompt_canvas.library_owner());

grant select, insert, update, delete on prompt_canvas.flashcard_reviews to authenticated;
