-- 家庭投資儀表板 V1.3 / Supabase SQL
-- 在 Supabase SQL Editor 一次執行。
create extension if not exists pgcrypto;

create table if not exists public.transactions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 person text not null check (person in ('老爸','老媽','博任')),
 type text not null check (type in ('BUY','SELL')),
 symbol text not null check (symbol = upper(symbol)),
 qty numeric(18,6) not null check (qty > 0),
 price numeric(18,6) not null check (price > 0),
 fee numeric(18,6) not null default 0 check (fee >= 0),
 trade_date date not null,
 created_at timestamptz not null default now()
);
create table if not exists public.cash_transactions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 person text not null check (person in ('老爸','老媽','博任')),
 type text not null check (type in ('DEPOSIT','WITHDRAW')),
 amount numeric(18,6) not null check (amount > 0),
 cash_date date not null,
 note text not null default '',
 created_at timestamptz not null default now()
);
create table if not exists public.portfolio_snapshots (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 snapshot_date date not null,
 total_usd numeric(18,6) not null,
 created_at timestamptz not null default now(),
 unique(user_id,snapshot_date)
);

alter table public.transactions enable row level security;
alter table public.cash_transactions enable row level security;
alter table public.portfolio_snapshots enable row level security;

drop policy if exists "own transactions" on public.transactions;
create policy "own transactions" on public.transactions for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists "own cash" on public.cash_transactions;
create policy "own cash" on public.cash_transactions for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists "own snapshots" on public.portfolio_snapshots;
create policy "own snapshots" on public.portfolio_snapshots for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

create index if not exists transactions_user_date on public.transactions(user_id,trade_date);
create index if not exists cash_user_date on public.cash_transactions(user_id,cash_date);
create index if not exists snapshots_user_date on public.portfolio_snapshots(user_id,snapshot_date);

-- 建議：Supabase Authentication > Email 的 email confirmation
-- 可依你的使用情境決定是否啟用。
