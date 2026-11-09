# ランキングのセットアップ (Supabase / 無料枠)

1. https://supabase.com でプロジェクトを作成する。
2. SQL Editor で以下を実行する。

```sql
create table public.scores (
  id bigint generated always as identity primary key,
  player_id text not null check (char_length(player_id) between 1 and 64),
  name text not null check (char_length(name) between 1 and 12),
  score integer not null check (score between 0 and 1000000),
  correct integer not null default 0 check (correct >= 0),
  max_combo integer not null default 0 check (max_combo >= 0),
  created_at timestamptz not null default now()
);
create index on public.scores (score desc);

alter table public.scores enable row level security;
create policy "anyone can read" on public.scores for select using (true);
create policy "anyone can insert" on public.scores for insert with check (true);
```

3. Project Settings → API の `Project URL` と `anon public` キーを、GitHub の
   Settings → Secrets and variables → Actions → **Variables** に
   `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` として登録する。
   (anon キーは公開前提のキーです。RLS で insert/select のみ許可しています)
4. main に push（または Deploy ワークフローを再実行）すると反映される。

ローカル確認は `.env.local` に同じ2変数を書く。未設定ならランキング機能は非表示になる。
