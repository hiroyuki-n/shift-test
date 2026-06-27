-- ============================================================
--  ダミーデータ投入 SQL（Supabase SQL Editor 貼り付け用）
--  内容: 店舗3つ（大橋店 / 天神店 / 博多店）
--        各店舗5名（アルバイト3 + 社員2）+ 本社管理者1名
--
--  id は SERIAL（自動採番）に任せるため指定しない。
--  挿入順に 本社管理者=1 / 各スタッフ=2.. / 店舗=1.. の連番になる。
--  ログイン用パスワードは全員共通で「password」（PBKDF2ハッシュ）。
-- ============================================================

BEGIN;

-- --- 既存データのクリア（依存関係の順に削除） ---
DELETE FROM final_shifts;
DELETE FROM shift_requests;
DELETE FROM shop_memberships;
DELETE FROM users;
DELETE FROM shops;

-- 連番を 1 から振り直す
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE shops_id_seq RESTART WITH 1;
ALTER SEQUENCE shop_memberships_id_seq RESTART WITH 1;

-- --- 本社管理者 ---
INSERT INTO users (name, "passwordHash", role, "isActive", "createdAt", "updatedAt")
VALUES ('本社 管理者', 'pbkdf2$210000$a7x85rQuKu9o+IHfj04PWg==$ZvfRXbWsyvF7W5w0jB+oiLhFbHQ9tHb2TWpgV5HoABM=', 'SUPER_ADMIN'::"Role", true, now(), now());

-- ============================================================
--  大橋店
-- ============================================================
WITH shop AS (
  INSERT INTO shops (name, "isActive", "createdAt", "updatedAt")
  VALUES ('大橋店', true, now(), now())
  RETURNING id
),
ins_users AS (
  INSERT INTO users (name, "passwordHash", role, "employmentType", "isActive", "createdAt", "updatedAt", "primaryShopId")
  SELECT v.name, 'pbkdf2$210000$a7x85rQuKu9o+IHfj04PWg==$ZvfRXbWsyvF7W5w0jB+oiLhFbHQ9tHb2TWpgV5HoABM=', 'STAFF'::"Role", v.etype::"EmploymentType", true, now(), now(), shop.id
  FROM shop, (VALUES
    ('田中 陽菜', 'PART_TIME'),
    ('佐藤 蓮',   'PART_TIME'),
    ('鈴木 葵',   'PART_TIME'),
    ('山本 健一', 'FULL_TIME'),
    ('中村 直樹', 'FULL_TIME')
  ) AS v(name, etype)
  RETURNING id, "primaryShopId"
)
INSERT INTO shop_memberships ("userId", "shopId", type, "createdAt")
SELECT id, "primaryShopId", 'PRIMARY'::"MembershipType", now()
FROM ins_users;

-- ============================================================
--  天神店
-- ============================================================
WITH shop AS (
  INSERT INTO shops (name, "isActive", "createdAt", "updatedAt")
  VALUES ('天神店', true, now(), now())
  RETURNING id
),
ins_users AS (
  INSERT INTO users (name, "passwordHash", role, "employmentType", "isActive", "createdAt", "updatedAt", "primaryShopId")
  SELECT v.name, 'pbkdf2$210000$a7x85rQuKu9o+IHfj04PWg==$ZvfRXbWsyvF7W5w0jB+oiLhFbHQ9tHb2TWpgV5HoABM=', 'STAFF'::"Role", v.etype::"EmploymentType", true, now(), now(), shop.id
  FROM shop, (VALUES
    ('小林 美咲', 'PART_TIME'),
    ('加藤 大輔', 'PART_TIME'),
    ('吉田 結衣', 'PART_TIME'),
    ('渡辺 隆',   'FULL_TIME'),
    ('伊藤 真央', 'FULL_TIME')
  ) AS v(name, etype)
  RETURNING id, "primaryShopId"
)
INSERT INTO shop_memberships ("userId", "shopId", type, "createdAt")
SELECT id, "primaryShopId", 'PRIMARY'::"MembershipType", now()
FROM ins_users;

-- ============================================================
--  博多店
-- ============================================================
WITH shop AS (
  INSERT INTO shops (name, "isActive", "createdAt", "updatedAt")
  VALUES ('博多店', true, now(), now())
  RETURNING id
),
ins_users AS (
  INSERT INTO users (name, "passwordHash", role, "employmentType", "isActive", "createdAt", "updatedAt", "primaryShopId")
  SELECT v.name, 'pbkdf2$210000$a7x85rQuKu9o+IHfj04PWg==$ZvfRXbWsyvF7W5w0jB+oiLhFbHQ9tHb2TWpgV5HoABM=', 'STAFF'::"Role", v.etype::"EmploymentType", true, now(), now(), shop.id
  FROM shop, (VALUES
    ('松本 翔',     'PART_TIME'),
    ('井上 さくら', 'PART_TIME'),
    ('木村 拓海',   'PART_TIME'),
    ('林 浩二',     'FULL_TIME'),
    ('清水 麻衣',   'FULL_TIME')
  ) AS v(name, etype)
  RETURNING id, "primaryShopId"
)
INSERT INTO shop_memberships ("userId", "shopId", type, "createdAt")
SELECT id, "primaryShopId", 'PRIMARY'::"MembershipType", now()
FROM ins_users;

COMMIT;

-- --- 確認用 ---
-- SELECT s.name AS shop, u.id, u.name, u.role, u."employmentType"
-- FROM users u JOIN shops s ON s.id = u."primaryShopId"
-- ORDER BY u.id;
