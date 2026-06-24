# シフト管理システム（マルチテナント型）

50店舗・約1,000人規模の飲食店向けマルチテナント型シフト管理システムの土台。
**Nuxt 3 + TypeScript + Supabase (PostgreSQL) + Prisma ORM + Tailwind CSS** で構成しています。

## 技術スタック

| 項目         | 内容                              |
| ------------ | --------------------------------- |
| フロント     | Nuxt 3 (Vue 3 / Composition API)  |
| 言語         | TypeScript                        |
| DB           | PostgreSQL (Supabase)             |
| ORM          | Prisma                            |
| スタイリング | Tailwind CSS                      |

## ディレクトリ構造

```
shift-test/
├── app.vue                          # ルートコンポーネント
├── nuxt.config.ts                   # Nuxt 設定
├── tailwind.config.ts               # Tailwind 設定
├── tsconfig.json
├── package.json
├── .env.example                     # 環境変数サンプル（Supabase接続情報）
├── prisma/
│   └── schema.prisma                # DBスキーマ（モデル・リレーション・インデックス）
├── server/
│   └── utils/
│       └── prisma.ts                # PrismaClient シングルトン
└── pages/
    ├── index.vue                    # ロール別エントリ（開発用）
    ├── admin/
    │   └── index.vue                # [SUPER_ADMIN] 本社ダッシュボード
    ├── shop/
    │   └── [shopId]/
    │       └── index.vue            # [SHOP_ADMIN] 店舗管理（動的ルート）
    └── staff/
        └── index.vue                # [STAFF] マイシフト
```

## ロール（権限）

| Role          | 役割     | 主な権限                                       |
| ------------- | -------- | ---------------------------------------------- |
| `SUPER_ADMIN` | 本社     | 店舗の追加、全データの閲覧・編集               |
| `SHOP_ADMIN`  | 店長     | 自店舗の管理、スタッフ追加、シフト編集・確定   |
| `STAFF`       | スタッフ | 希望シフト提出、確定シフト確認                 |

## ヘルプ（応援）対応のリレーション設計

- `User.primaryShopId` … メイン所属店舗（任意）
- `ShopMembership`（中間テーブル）… User × Shop の多対多。`type` で `PRIMARY` / `SUPPORT`（ヘルプ）を区別。

これにより「メイン店舗を持ちつつ、他店舗へヘルプに行ける」要件を満たします。

## セットアップ

```bash
# 1. 依存インストール
npm install

# 2. 環境変数を設定（Supabaseの接続情報を記入）
cp .env.example .env

# 3. Prisma Client 生成 & マイグレーション
npm run prisma:generate
npm run prisma:migrate

# 4. 開発サーバー起動
npm run dev
```

> 注: 認証・権限チェック（middleware）、API（`server/api/`）は本土台には含まれません。
> 各ページはモックデータで動作します。
