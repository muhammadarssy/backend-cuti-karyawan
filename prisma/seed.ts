import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface SeedData {
  nik: string;
  nama: string;
  tanggalMasuk: string;
  status: string;
  cutiTahunan: {
    tahun: number;
    jatahDasar: number;
    carryForward: number;
    totalHakCuti: number;
    cutiTerpakai: number;
    sisaCuti: number;
    tipe: string;
  };
}

interface CutiRecord {
  nik: string;
  nama: string;
  jenis: 'TAHUNAN' | 'SAKIT' | 'IZIN' | 'BAKU' | 'TANPA_KETERANGAN' | 'LAINNYA';
  tanggal: string;
  alasan: string;
}

async function main() {
  console.log('🌱 Mulai seeding data...\n');

  // 1. Seed Karyawan dan Cuti Tahunan
  console.log('📋 Seeding karyawan dan cuti tahunan...');
  const seedDataPath = join(process.cwd(), 'prisma', 'seed-data.json');
  const jsonData = readFileSync(seedDataPath, 'utf-8');
  const karyawanData: SeedData[] = JSON.parse(jsonData);

  const karyawanMap = new Map<string, string>(); // NIK -> karyawanId

  for (const data of karyawanData) {
    // Check if karyawan already exists
    let karyawan = await prisma.karyawan.findUnique({
      where: { nik: data.nik },
    });

    if (!karyawan) {
      // Create new karyawan
      karyawan = await prisma.karyawan.create({
        data: {
          nik: data.nik,
          nama: data.nama,
          tanggalMasuk: new Date(data.tanggalMasuk),
          status: data.status as any,
        },
      });

      // Create cuti tahunan
      await prisma.cutiTahunan.create({
        data: {
          karyawanId: karyawan.id,
          tahun: data.cutiTahunan.tahun,
          jatahDasar: data.cutiTahunan.jatahDasar,
          carryForward: data.cutiTahunan.carryForward,
          totalHakCuti: data.cutiTahunan.totalHakCuti,
          cutiTerpakai: data.cutiTahunan.cutiTerpakai,
          sisaCuti: data.cutiTahunan.sisaCuti,
          tipe: data.cutiTahunan.tipe as any,
        },
      });

      console.log(`✓ ${karyawan.nama} - Sisa Cuti: ${data.cutiTahunan.sisaCuti}`);
    } else {
      console.log(`⚠️  Skip: ${data.nama} already exists`);
    }

    karyawanMap.set(data.nik, karyawan.id);
  }

  console.log(`\n✅ ${karyawanData.length} karyawan data processed\n`);

  // 2. Seed Data Cuti Januari 2026
  console.log('📅 Seeding transaksi cuti Januari 2026...');
  const cutiDataPath = join(process.cwd(), 'prisma', 'seed-cuti-data.json');
  const cutiJsonData = readFileSync(cutiDataPath, 'utf-8');
  const cutiRecords: CutiRecord[] = JSON.parse(cutiJsonData);

  console.log(`📊 Total ${cutiRecords.length} records cuti akan di-seed\n`);

  let cutiSuccessCount = 0;
  let cutiSkipCount = 0;

  for (const record of cutiRecords) {
    const karyawanId = karyawanMap.get(record.nik);

    if (!karyawanId) {
      console.log(`⚠️  Skip: NIK ${record.nik} (${record.nama}) tidak ditemukan`);
      cutiSkipCount++;
      continue;
    }

    try {
      // Get cuti tahunan 2026
      const cutiTahunan = await prisma.cutiTahunan.findFirst({
        where: {
          karyawanId: karyawanId,
          tahun: 2026,
        },
      });

      if (!cutiTahunan) {
        console.log(`⚠️  Skip: Cuti tahunan 2026 tidak ditemukan untuk ${record.nama}`);
        cutiSkipCount++;
        continue;
      }

      // Create cuti record
      const tanggalISO = new Date(`${record.tanggal}T00:00:00.000Z`);

      await prisma.cuti.create({
        data: {
          karyawanId: karyawanId,
          cutiTahunanId: cutiTahunan.id,
          tahun: 2026,
          jenis: record.jenis,
          alasan: record.alasan,
          tanggalMulai: tanggalISO,
          tanggalSelesai: tanggalISO,
          jumlahHari: 1,
        },
      });

      // Update saldo only for TAHUNAN
      if (record.jenis === 'TAHUNAN') {
        await prisma.cutiTahunan.update({
          where: { id: cutiTahunan.id },
          data: {
            cutiTerpakai: { increment: 1 },
            sisaCuti: { decrement: 1 },
          },
        });
      }

      cutiSuccessCount++;
      console.log(`✅ ${record.nama} - ${record.jenis} - ${record.tanggal}`);
    } catch (error: any) {
      console.error(`❌ Error for ${record.nama} (${record.tanggal}): ${error.message}`);
      cutiSkipCount++;
    }
  }

  console.log(`\n✅ ${cutiSuccessCount} transaksi cuti berhasil di-seed`);
  console.log(`⚠️  ${cutiSkipCount} transaksi cuti di-skip`);
  console.log('\n✨ Seeding selesai!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
