import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface BackupData {
  karyawan: unknown[];
  cutiTahunan: unknown[];
  cuti: unknown[];
  item: unknown[];
  pembelian: unknown[];
  pengeluaran: unknown[];
  absensi: unknown[];
  timestamp: string;
}

async function backup() {
  console.log('📦 Memulai backup data...\n');

  try {
    // Create backup directory
    const backupDir = join(process.cwd(), 'backups');
    mkdirSync(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = join(backupDir, `backup-${timestamp}.json`);

    console.log('📋 Mengambil data Karyawan...');
    const karyawan = await prisma.karyawan.findMany({
      orderBy: { createdAt: 'asc' },
    });

    console.log('📋 Mengambil data Cuti Tahunan...');
    const cutiTahunan = await prisma.cutiTahunan.findMany({
      orderBy: { createdAt: 'asc' },
    });

    console.log('📋 Mengambil data Cuti...');
    const cuti = await prisma.cuti.findMany({
      orderBy: { createdAt: 'asc' },
    });

    console.log('📋 Mengambil data Item...');
    const item = await prisma.item.findMany({
      orderBy: { createdAt: 'asc' },
    });

    console.log('📋 Mengambil data Pembelian...');
    const pembelian = await prisma.pembelian.findMany({
      orderBy: { createdAt: 'asc' },
    });

    console.log('📋 Mengambil data Pengeluaran...');
    const pengeluaran = await prisma.pengeluaran.findMany({
      orderBy: { createdAt: 'asc' },
    });

    console.log('📋 Mengambil data Absensi...');
    const absensi = await prisma.absensi.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const backupData: BackupData = {
      karyawan,
      cutiTahunan,
      cuti,
      item,
      pembelian,
      pengeluaran,
      absensi,
      timestamp: new Date().toISOString(),
    };

    // Write backup file
    writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf-8');

    console.log('\n✅ Backup berhasil!');
    console.log(`📁 File backup: ${backupFile}`);
    console.log(`📊 Statistik:`);
    console.log(`   - Karyawan: ${karyawan.length}`);
    console.log(`   - Cuti Tahunan: ${cutiTahunan.length}`);
    console.log(`   - Cuti: ${cuti.length}`);
    console.log(`   - Item: ${item.length}`);
    console.log(`   - Pembelian: ${pembelian.length}`);
    console.log(`   - Pengeluaran: ${pengeluaran.length}`);
    console.log(`   - Absensi: ${absensi.length}`);
  } catch (error) {
    console.error('❌ Error saat backup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

backup()
  .then(() => {
    console.log('\n✨ Backup selesai!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Backup gagal:', error);
    process.exit(1);
  });
