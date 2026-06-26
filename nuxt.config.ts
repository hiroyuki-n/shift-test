// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // Cloudflare Workers (Static Assets) には 2024-09-19 以降が必要
  compatibilityDate: '2024-09-19',
  // devtools のセットアップに毎回 約3分かかりローカル起動を阻害するため無効化
  devtools: { enabled: false },

  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/supabase'],

  // Cloudflare Workers 向けビルド設定
  // 注: cloudflare_module はビルド/デプロイ専用。dev では適用すると依存の
  // ワーカー向けバンドルが走り起動が極端に遅くなるため、本番ビルド時のみ適用する。
  nitro: {
    preset:
      process.env.NODE_ENV === 'production' ? 'cloudflare_module' : undefined,
    cloudflare: {
      // ルートの wrangler.toml を唯一の設定源とする（main/assets/vars を定義）
      nodeCompat: true,
    },
  },

  // Supabase 設定（環境変数 SUPABASE_URL / SUPABASE_KEY を使用）
  supabase: {
    // 現状はモック画面のため、未ログインでも全ページ閲覧可能にする。
    // 認証導入時に redirect を有効化し、redirectOptions で保護パスを指定する。
    redirect: false,
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  app: {
    head: {
      title: 'シフト管理システム',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },
})
