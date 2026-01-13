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

async function main() {
  console.log('Mulai seeding data...');

  const seedDataPath = join(process.cwd(), 'prisma', 'seed-data.json');
  const jsonData = readFileSync(seedDataPath, 'utf-8');
  const karyawanData: SeedData[] = JSON.parse(jsonData);

  for (const data of karyawanData) {
    const karyawan = await prisma.karyawan.create({
      data: {
        nik: data.nik,
        nama: data.nama,
        tanggalMasuk: new Date(data.tanggalMasuk),
        status: data.status as any,
      },
    });

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
  }

  console.log('Seeding selesai!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
