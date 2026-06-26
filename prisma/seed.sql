-- ============================================================
--  ダミーデータ投入 SQL（Supabase SQL Editor 貼り付け用）
--  内容: 店舗3つ（大橋店 / 天神店 / 博多店）
--        各店舗5名（アルバイト3 + 社員2）+ 本社管理者1名
--  ※ prisma/seed.ts と同じ内容です。
-- ============================================================

BEGIN;

-- --- 既存データのクリア（依存関係の順に削除） ---
DELETE FROM final_shifts;
DELETE FROM shift_requests;
DELETE FROM shop_memberships;
DELETE FROM users;
DELETE FROM shops;

-- --- 本社管理者 ---
INSERT INTO users (id, email, name, role, "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'admin@example.com', '本社 管理者', 'SUPER_ADMIN'::"Role", true, now(), now());

-- ============================================================
--  大橋店
-- ============================================================
WITH shop AS (
  INSERT INTO shops (id, name, address, "isActive", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), '大橋店', '福岡県福岡市南区大橋1-1-1', true, now(), now())
  RETURNING id
),
ins_users AS (
  INSERT INTO users (id, email, name, role, "employmentType", "isActive", "createdAt", "updatedAt", "primaryShopId")
  SELECT gen_random_uuid(), v.email, v.name, 'STAFF'::"Role", v.etype::"EmploymentType", true, now(), now(), shop.id
  FROM shop, (VALUES
    ('ohashi.part1@example.com', '田中 陽菜', 'PART_TIME'),
    ('ohashi.part2@example.com', '佐藤 蓮',   'PART_TIME'),
    ('ohashi.part3@example.com', '鈴木 葵',   'PART_TIME'),
    ('ohashi.full4@example.com', '山本 健一', 'FULL_TIME'),
    ('ohashi.full5@example.com', '中村 直樹', 'FULL_TIME')
  ) AS v(email, name, etype)
  RETURNING id, "primaryShopId"
)
INSERT INTO shop_memberships (id, "userId", "shopId", type, "createdAt")
SELECT gen_random_uuid(), id, "primaryShopId", 'PRIMARY'::"MembershipType", now()
FROM ins_users;

-- ============================================================
--  天神店
-- ============================================================
WITH shop AS (
  INSERT INTO shops (id, name, address, "isActive", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), '天神店', '福岡県福岡市中央区天神2-2-2', true, now(), now())
  RETURNING id
),
ins_users AS (
  INSERT INTO users (id, email, name, role, "employmentType", "isActive", "createdAt", "updatedAt", "primaryShopId")
  SELECT gen_random_uuid(), v.email, v.name, 'STAFF'::"Role", v.etype::"EmploymentType", true, now(), now(), shop.id
  FROM shop, (VALUES
    ('tenjin.part1@example.com', '小林 美咲', 'PART_TIME'),
    ('tenjin.part2@example.com', '加藤 大輔', 'PART_TIME'),
    ('tenjin.part3@example.com', '吉田 結衣', 'PART_TIME'),
    ('tenjin.full4@example.com', '渡辺 隆',   'FULL_TIME'),
    ('tenjin.full5@example.com', '伊藤 真央', 'FULL_TIME')
  ) AS v(email, name, etype)
  RETURNING id, "primaryShopId"
)
INSERT INTO shop_memberships (id, "userId", "shopId", type, "createdAt")
SELECT gen_random_uuid(), id, "primaryShopId", 'PRIMARY'::"MembershipType", now()
FROM ins_users;

-- ============================================================
--  博多店
-- ============================================================
WITH shop AS (
  INSERT INTO shops (id, name, address, "isActive", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), '博多店', '福岡県福岡市博多区博多駅前3-3-3', true, now(), now())
  RETURNING id
),
ins_users AS (
  INSERT INTO users (id, email, name, role, "employmentType", "isActive", "createdAt", "updatedAt", "primaryShopId")
  SELECT gen_random_uuid(), v.email, v.name, 'STAFF'::"Role", v.etype::"EmploymentType", true, now(), now(), shop.id
  FROM shop, (VALUES
    ('hakata.part1@example.com', '松本 翔',     'PART_TIME'),
    ('hakata.part2@example.com', '井上 さくら', 'PART_TIME'),
    ('hakata.part3@example.com', '木村 拓海',   'PART_TIME'),
    ('hakata.full4@example.com', '林 浩二',     'FULL_TIME'),
    ('hakata.full5@example.com', '清水 麻衣',   'FULL_TIME')
  ) AS v(email, name, etype)
  RETURNING id, "primaryShopId"
)
INSERT INTO shop_memberships (id, "userId", "shopId", type, "createdAt")
SELECT gen_random_uuid(), id, "primaryShopId", 'PRIMARY'::"MembershipType", now()
FROM ins_users;

COMMIT;

-- --- 確認用 ---
-- SELECT s.name AS shop, u.name, u.role, u."employmentType"
-- FROM users u JOIN shops s ON s.id = u."primaryShopId"
-- ORDER BY s.name, u."employmentType";
