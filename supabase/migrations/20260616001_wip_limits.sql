-- v1.1 #10: WIP limits per column
-- Adds a soft WIP limit to columns. Null = no limit. No write blocking —
-- the UI shows a warning when cards.length > wip_limit, nothing more.

alter table columns
  add column if not exists wip_limit int null
    check (wip_limit is null or wip_limit > 0);

comment on column columns.wip_limit is
  'Optional soft WIP limit. Exceeding it shows a warning in the column header, never blocks writes.';
