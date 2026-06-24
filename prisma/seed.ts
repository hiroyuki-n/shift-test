import { PrismaClient, Role, MembershipType, ShiftStatus, Position } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * ダミーデータ投入スクリプト
 * 実行: npx prisma db seed
 * ※ DATABASE_URL / DIRECT_URL（Supabase）への接続が必要です。
 */
async function main() {
  console.log('🌱 Seeding...')

  // --- 既存データのクリア（依存関係の順に削除） ---
  await prisma.finalShift.deleteMany()
  await prisma.shiftRequest.deleteMany()
  await prisma.shopMembership.deleteMany()
  await prisma.user.deleteMany()
  await prisma.shop.deleteMany()

  // --- 店舗 ---
  const shibuya = await prisma.shop.create({
    data: { name: '渋谷本店', address: '東京都渋谷区道玄坂1-2-3' },
  })
  const shinjuku = await prisma.shop.create({
    data: { name: '新宿東口店', address: '東京都新宿区新宿3-1-1' },
  })
  const yokohama = await prisma.shop.create({
    data: { name: '横浜西口店', address: '神奈川県横浜市西区南幸2-5-7' },
  })

  // --- 本社管理者 ---
  await prisma.user.create({
    data: { name: '本社 管理者', email: 'admin@example.com', role: Role.SUPER_ADMIN },
  })

  // --- 店長（各店舗1名） ---
  const shibuyaManager = await prisma.user.create({
    data: {
      name: '渋谷 店長',
      email: 'manager.shibuya@example.com',
      role: Role.SHOP_ADMIN,
      primaryShopId: shibuya.id,
      shopMemberships: { create: { shopId: shibuya.id, type: MembershipType.PRIMARY } },
    },
  })
  await prisma.user.create({
    data: {
      name: '新宿 店長',
      email: 'manager.shinjuku@example.com',
      role: Role.SHOP_ADMIN,
      primaryShopId: shinjuku.id,
      shopMemberships: { create: { shopId: shinjuku.id, type: MembershipType.PRIMARY } },
    },
  })

  // --- スタッフ（ダミー） ---
  const staffSeed = [
    { name: '山田 太郎', email: 'yamada@example.com', shop: shibuya },
    { name: '佐藤 花子', email: 'sato@example.com', shop: shibuya },
    { name: '鈴木 一郎', email: 'suzuki@example.com', shop: shibuya },
    { name: '田中 美咲', email: 'tanaka@example.com', shop: shinjuku },
    { name: '高橋 健太', email: 'takahashi@example.com', shop: shinjuku },
    { name: '伊藤 さくら', email: 'ito@example.com', shop: yokohama },
  ]

  const staffUsers = []
  for (const s of staffSeed) {
    const user = await prisma.user.create({
      data: {
        name: s.name,
        email: s.email,
        role: Role.STAFF,
        primaryShopId: s.shop.id,
        shopMemberships: { create: { shopId: s.shop.id, type: MembershipType.PRIMARY } },
      },
    })
    staffUsers.push(user)
  }

  // --- ヘルプ（応援）の例: 山田を新宿店にもSUPPORTで所属させる ---
  await prisma.shopMembership.create({
    data: { userId: staffUsers[0].id, shopId: shinjuku.id, type: MembershipType.SUPPORT },
  })

  // --- 希望シフト（ダミー） ---
  await prisma.shiftRequest.createMany({
    data: [
      {
        userId: staffUsers[0].id,
        shopId: shibuya.id,
        date: new Date('2026-07-01'),
        startTime: new Date('2026-07-01T09:00:00+09:00'),
        endTime: new Date('2026-07-01T17:00:00+09:00'),
        status: ShiftStatus.APPROVED,
      },
      {
        userId: staffUsers[1].id,
        shopId: shibuya.id,
        date: new Date('2026-07-03'),
        startTime: new Date('2026-07-03T12:00:00+09:00'),
        endTime: new Date('2026-07-03T21:00:00+09:00'),
        status: ShiftStatus.PENDING,
      },
    ],
  })

  // --- 確定シフト（ダミー） ---
  await prisma.finalShift.create({
    data: {
      userId: staffUsers[0].id,
      shopId: shibuya.id,
      createdById: shibuyaManager.id,
      date: new Date('2026-07-01'),
      startTime: new Date('2026-07-01T09:00:00+09:00'),
      endTime: new Date('2026-07-01T17:00:00+09:00'),
      position: Position.HALL,
    },
  })

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
