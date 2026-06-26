import { PrismaClient, Role, MembershipType, EmploymentType } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * ダミーデータ投入スクリプト
 * 実行: npx prisma db seed
 * ※ DATABASE_URL / DIRECT_URL（Supabase など PostgreSQL）への接続が必要です。
 *
 * 内容:
 *   - 店舗3つ（大橋店 / 天神店 / 博多店）
 *   - 各店舗に5名のスタッフ（アルバイト3名 + 社員2名）
 */

// 各店舗のスタッフ構成（アルバイト3名 + 社員2名）
const SHOP_SEED = [
  {
    name: '大橋店',
    address: '福岡県福岡市南区大橋1-1-1',
    slug: 'ohashi',
    staff: [
      { name: '田中 陽菜', employmentType: EmploymentType.PART_TIME },
      { name: '佐藤 蓮', employmentType: EmploymentType.PART_TIME },
      { name: '鈴木 葵', employmentType: EmploymentType.PART_TIME },
      { name: '山本 健一', employmentType: EmploymentType.FULL_TIME },
      { name: '中村 直樹', employmentType: EmploymentType.FULL_TIME },
    ],
  },
  {
    name: '天神店',
    address: '福岡県福岡市中央区天神2-2-2',
    slug: 'tenjin',
    staff: [
      { name: '小林 美咲', employmentType: EmploymentType.PART_TIME },
      { name: '加藤 大輔', employmentType: EmploymentType.PART_TIME },
      { name: '吉田 結衣', employmentType: EmploymentType.PART_TIME },
      { name: '渡辺 隆', employmentType: EmploymentType.FULL_TIME },
      { name: '伊藤 真央', employmentType: EmploymentType.FULL_TIME },
    ],
  },
  {
    name: '博多店',
    address: '福岡県福岡市博多区博多駅前3-3-3',
    slug: 'hakata',
    staff: [
      { name: '松本 翔', employmentType: EmploymentType.PART_TIME },
      { name: '井上 さくら', employmentType: EmploymentType.PART_TIME },
      { name: '木村 拓海', employmentType: EmploymentType.PART_TIME },
      { name: '林 浩二', employmentType: EmploymentType.FULL_TIME },
      { name: '清水 麻衣', employmentType: EmploymentType.FULL_TIME },
    ],
  },
] as const

async function main() {
  console.log('🌱 Seeding...')

  // --- 既存データのクリア（依存関係の順に削除） ---
  await prisma.finalShift.deleteMany()
  await prisma.shiftRequest.deleteMany()
  await prisma.shopMembership.deleteMany()
  await prisma.user.deleteMany()
  await prisma.shop.deleteMany()

  // --- 本社管理者 ---
  await prisma.user.create({
    data: { name: '本社 管理者', email: 'admin@example.com', role: Role.SUPER_ADMIN },
  })

  // --- 店舗 & スタッフ ---
  for (const shopSeed of SHOP_SEED) {
    const shop = await prisma.shop.create({
      data: { name: shopSeed.name, address: shopSeed.address },
    })

    let index = 1
    for (const staff of shopSeed.staff) {
      const kind = staff.employmentType === EmploymentType.PART_TIME ? 'part' : 'full'
      await prisma.user.create({
        data: {
          name: staff.name,
          email: `${shopSeed.slug}.${kind}${index}@example.com`,
          role: Role.STAFF,
          employmentType: staff.employmentType,
          primaryShopId: shop.id,
          shopMemberships: { create: { shopId: shop.id, type: MembershipType.PRIMARY } },
        },
      })
      index += 1
    }

    console.log(`  ✔ ${shopSeed.name}: スタッフ${shopSeed.staff.length}名（アルバイト3 / 社員2）`)
  }

  console.log('✅ Seed completed.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
