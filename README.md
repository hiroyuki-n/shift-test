# シフト管理システム（マルチテナント型）

50店舗・約1,000人規模の飲食店向けマルチテナント型シフト管理システムの土台。
**Nuxt 3 + TypeScript + Supabase + Cloudflare Workers + Tailwind CSS** で構成しています。

## 技術スタック

| 項目         | 内容                                            |
| ------------ | ----------------------------------------------- |
| フロント     | Nuxt 3 (Vue 3 / Composition API)                |
| 言語         | TypeScript                                      |
| デプロイ先   | Cloudflare Workers（Nitro `cloudflare_module`） |
| DB / BaaS    | Supabase (PostgreSQL)                           |
| DBアクセス   | `@nuxtjs/supabase`（supabase-js / HTTP経由）    |
| スキーマ管理 | Prisma（マイグレーション・スキーマ定義専用）    |
| スタイリング | Tailwind CSS                                    |

> **データアクセス方針**: Cloudflare Workers ランタイムと相性の良い **supabase-js（HTTP/PostgREST経由）** を実行時のDBアクセスに使用します。
> Prisma は **スキーマ定義とマイグレーション専用** とし、Workers 実行時には使用しません。

## ディレクトリ構造

```
shift-test/
├── app.vue                          # ルートコンポーネント
├── nuxt.config.ts                   # Nuxt 設定（Cloudflare preset + Supabase）
├── wrangler.toml                    # Cloudflare Workers デプロイ設定
├── tailwind.config.ts               # Tailwind 設定
├── tsconfig.json
├── package.json
├── .env.example                     # 環境変数サンプル（Supabase接続情報）
├── .dev.vars                        # Workers ローカル用環境変数（gitignore）
├── types/
│   └── database.types.ts            # Supabase 生成型のプレースホルダ
├── prisma/
│   ├── schema.prisma                # DBスキーマ（モデル・リレーション・インデックス）
│   └── seed.ts                      # ダミーデータ投入スクリプト
├── server/
│   ├── api/
│   │   └── shops.get.ts             # 店舗一覧API（supabase-js のサンプル）
│   └── utils/
│       └── prisma.ts                # PrismaClient（マイグレーション/スクリプト用）
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
#   SUPABASE_URL / SUPABASE_KEY（anon key）を Supabase ダッシュボードから取得して記入
#   DATABASE_URL / DIRECT_URL は Prisma migrate 用（DBパスワードを含む）

# 3. （DB初期化）Prisma でスキーマを反映 & ダミーデータ投入
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# 4. 開発サーバー起動
npm run dev
```

## Cloudflare Workers へのデプロイ

```bash
# 1. Wrangler にログイン
npx wrangler login

# 2. 機密情報は Secrets で登録（wrangler.toml には書かない）
#    SUPABASE_KEY を Secrets 管理にする場合や、service role key など
npx wrangler secret put SUPABASE_KEY

# 3. ビルド & デプロイ（nuxt build → wrangler deploy）
npm run deploy
```

- `wrangler.toml` がデプロイ設定の単一の真実（`main` / `assets` / `[vars]`）。
- 公開してよい値（`SUPABASE_URL` / anon `SUPABASE_KEY`）は `[vars]`、機密値は `wrangler secret put` で登録。
- ローカルでの Workers エミュレーションは `.dev.vars` を使用（`npm run cf:dev`）。

## Supabase 型定義の生成

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > types/database.types.ts
```

> 注: 認証・権限チェック（middleware）は本土台には未実装です。
> 画面はモックデータで動作し、`server/api/shops.get.ts` に supabase-js を使ったAPIのサンプルがあります。
> 接続情報（`SUPABASE_URL` / `SUPABASE_KEY`）はプレースホルダのため、実際の値に置き換えてください。
