// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
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
  // SupabaseのDB接続情報などは .env から runtimeConfig 経由で利用する想定
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
    },
  },
})
