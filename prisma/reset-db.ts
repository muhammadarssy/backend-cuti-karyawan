import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function resetDatabase() {
  console.log('⚠️  PERINGATAN: Ini akan menghapus SEMUA data dari database!');
  console.log('📋 Pastikan sudah backup data terlebih dahulu.\n');

  // Check if user confirms
  const args = process.argv.slice(2);
  if (!args.includes('--confirm')) {
    console.error('❌ Untuk reset database, gunakan flag --confirm');
    console.error('   Contoh: npm run prisma:reset -- --confirm');
    process.exit(1);
  }

  try {
    console.log('🗑️  Menghapus data...\n');

    // Delete dalam urutan yang benar (menghindari foreign key constraint)
    console.log('   - Menghapus StrukItem...');
    await prisma.strukItem.deleteMany();

    console.log('   - Menghapus Struk...');
    await prisma.struk.deleteMany();

    console.log('   - Menghapus BudgetKategori...');
    await prisma.budgetKategori.deleteMany();

    console.log('   - Menghapus Budget...');
    await prisma.budget.deleteMany();

    console.log('   - Menghapus KategoriBudget...');
    await prisma.kategoriBudget.deleteMany();

    console.log('   - Menghapus LabelStruk...');
    await prisma.labelStruk.deleteMany();

    console.log('   - Menghapus Absensi...');
    await prisma.absensi.deleteMany();

    console.log('   - Menghapus Pengeluaran...');
    await prisma.pengeluaran.deleteMany();

    console.log('   - Menghapus Pembelian...');
    await prisma.pembelian.deleteMany();

    console.log('   - Menghapus Cuti...');
    await prisma.cuti.deleteMany();

    console.log('   - Menghapus CutiTahunan...');
    await prisma.cutiTahunan.deleteMany();

    console.log('   - Menghapus Item...');
    await prisma.item.deleteMany();

    console.log('   - Menghapus Karyawan...');
    await prisma.karyawan.deleteMany();

    console.log('\n✅ Semua data berhasil dihapus!');
    console.log('💡 Sekarang jalankan: npm run prisma:migrate');
    console.log('   untuk apply migration schema baru.');
  } catch (error) {
    console.error('❌ Error saat reset database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

resetDatabase()
  .then(() => {
    console.log('\n✨ Reset selesai!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Reset gagal:', error);
    process.exit(1);
  });
