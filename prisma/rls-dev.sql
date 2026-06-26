-- ============================================================
--  開発用 RLS ポリシー（Supabase SQL Editor 貼り付け用）
--
--  認証未導入の開発段階では、公開キー(anon)からの読み書きが
--  RLS によりブロックされ、データが取得できない。
--  下記は anon / authenticated に全操作を許可する暫定ポリシー。
--
--  ⚠️ 本番では絶対にこのまま使わないこと。
--     認証導入時に「自店舗のみ」「本人のみ」等の適切なポリシーへ置き換える。
-- ============================================================

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['shops', 'users', 'shop_memberships', 'shift_requests', 'final_shifts']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS dev_all_access ON public.%I;', t);
    EXECUTE format(
      'CREATE POLICY dev_all_access ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);',
      t
    );
  END LOOP;
END $$;
