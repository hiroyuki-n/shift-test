/**
 * Supabase データベース型定義（プレースホルダ）
 *
 * 本番では Supabase CLI で自動生成してください:
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_REF > types/database.types.ts
 *
 * @nuxtjs/supabase はこの Database 型を useSupabaseClient<Database>() に適用します。
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
