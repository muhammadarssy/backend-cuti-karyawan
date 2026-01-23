import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface BackupData {
  karyawan: any[];
  cutiTahunan: any[];
  cuti: any[];
  item: any[];
  pembelian: any[];
  pengeluaran: any[];
  absensi: any[];
  timestamp: string;
}

async function restore(backupFile?: string) {
  console.log('🔄 Memulai restore data...\n');

  try {
    const backupDir = join(process.cwd(), 'backups');

    // Jika tidak ada file, list semua backup
    if (!backupFile) {
      const files = readdirSync(backupDir)
        .filter((f) => f.startsWith('backup-') && f.endsWith('.json'))
        .sort()
        .reverse(); // Latest first

      if (files.length === 0) {
        console.error('❌ Tidak ada file backup ditemukan!');
        process.exit(1);
      }

      console.log('📁 File backup yang tersedia:');
      files.forEach((f, i) => {
        console.log(`   ${i + 1}. ${f}`);
      });

      // Gunakan yang terbaru
      backupFile = files[0];
      console.log(`\n✅ Menggunakan backup terbaru: ${backupFile}\n`);
    }

    const backupPath = join(backupDir, backupFile);
    const backupData: BackupData = JSON.parse(
      readFileSync(backupPath, 'utf-8')
    );

    console.log(`📅 Backup dibuat pada: ${backupData.timestamp}\n`);

    // Restore dalam transaction
    await prisma.$transaction(
      async (tx) => {
        console.log('📋 Restore Karyawan...');
        for (const k of backupData.karyawan) {
          await tx.karyawan.upsert({
            where: { nik: k.nik },
            update: {
              nama: k.nama,
              jabatan: k.jabatan,
              departemen: k.departemen,
              tanggalMasuk: new Date(k.tanggalMasuk),
              status: k.status,
              fingerprintId: k.fingerprintId,
            },
            create: {
              id: k.id,
              nik: k.nik,
              nama: k.nama,
              jabatan: k.jabatan,
              departemen: k.departemen,
              tanggalMasuk: new Date(k.tanggalMasuk),
              status: k.status,
              fingerprintId: k.fingerprintId,
            },
          });
        }

        console.log('📋 Restore Cuti Tahunan...');
        for (const ct of backupData.cutiTahunan) {
          // Find karyawan by NIK or use existing ID
          const karyawan = await tx.karyawan.findUnique({
            where: { id: ct.karyawanId },
          });
          if (karyawan) {
            await tx.cutiTahunan.upsert({
              where: {
                karyawanId_tahun: {
                  karyawanId: ct.karyawanId,
                  tahun: ct.tahun,
                },
              },
              update: {
                jatahDasar: ct.jatahDasar,
                carryForward: ct.carryForward,
                totalHakCuti: ct.totalHakCuti,
                cutiTerpakai: ct.cutiTerpakai,
                sisaCuti: ct.sisaCuti,
                tipe: ct.tipe,
              },
              create: {
                id: ct.id,
                karyawanId: ct.karyawanId,
                tahun: ct.tahun,
                jatahDasar: ct.jatahDasar,
                carryForward: ct.carryForward,
                totalHakCuti: ct.totalHakCuti,
                cutiTerpakai: ct.cutiTerpakai,
                sisaCuti: ct.sisaCuti,
                tipe: ct.tipe,
              },
            });
          }
        }

        console.log('📋 Restore Cuti...');
        for (const c of backupData.cuti) {
          await tx.cuti.upsert({
            where: { id: c.id },
            update: {
              tahun: c.tahun,
              jenis: c.jenis,
              alasan: c.alasan,
              tanggalMulai: new Date(c.tanggalMulai),
              tanggalSelesai: new Date(c.tanggalSelesai),
              jumlahHari: c.jumlahHari,
            },
            create: {
              id: c.id,
              karyawanId: c.karyawanId,
              cutiTahunanId: c.cutiTahunanId,
              tahun: c.tahun,
              jenis: c.jenis,
              alasan: c.alasan,
              tanggalMulai: new Date(c.tanggalMulai),
              tanggalSelesai: new Date(c.tanggalSelesai),
              jumlahHari: c.jumlahHari,
            },
          });
        }

        console.log('📋 Restore Item...');
        for (const i of backupData.item) {
          await tx.item.upsert({
            where: { kode: i.kode },
            update: {
              nama: i.nama,
              kategori: i.kategori,
              satuan: i.satuan,
              stokMinimal: i.stokMinimal,
              stokSekarang: i.stokSekarang,
              keterangan: i.keterangan,
            },
            create: {
              id: i.id,
              kode: i.kode,
              nama: i.nama,
              kategori: i.kategori,
              satuan: i.satuan,
              stokMinimal: i.stokMinimal,
              stokSekarang: i.stokSekarang,
              keterangan: i.keterangan,
            },
          });
        }

        console.log('📋 Restore Pembelian...');
        for (const p of backupData.pembelian) {
          await tx.pembelian.create({
            data: {
              id: p.id,
              itemId: p.itemId,
              jumlah: p.jumlah,
              tanggal: new Date(p.tanggal),
              supplier: p.supplier,
              hargaSatuan: p.hargaSatuan,
              totalHarga: p.totalHarga,
              keterangan: p.keterangan,
            },
          });
        }

        console.log('📋 Restore Pengeluaran...');
        for (const pe of backupData.pengeluaran) {
          await tx.pengeluaran.create({
            data: {
              id: pe.id,
              itemId: pe.itemId,
              jumlah: pe.jumlah,
              tanggal: new Date(pe.tanggal),
              keperluan: pe.keperluan,
              penerima: pe.penerima,
              keterangan: pe.keterangan,
            },
          });
        }

        console.log('📋 Restore Absensi...');
        for (const a of backupData.absensi) {
          await tx.absensi.upsert({
            where: {
              karyawanId_tanggal: {
                karyawanId: a.karyawanId,
                tanggal: new Date(a.tanggal),
              },
            },
            update: {
              jam: a.jam ? new Date(a.jam) : null,
              statusKehadiran: a.statusKehadiran,
              isManual: a.isManual,
              keterangan: a.keterangan,
              diinputOleh: a.diinputOleh,
            },
            create: {
              id: a.id,
              karyawanId: a.karyawanId,
              tanggal: new Date(a.tanggal),
              jam: a.jam ? new Date(a.jam) : null,
              statusKehadiran: a.statusKehadiran,
              isManual: a.isManual,
              keterangan: a.keterangan,
              diinputOleh: a.diinputOleh,
            },
          });
        }
      },
      {
        timeout: 60000, // 60 seconds
      }
    );

    console.log('\n✅ Restore berhasil!');
    console.log(`📊 Data yang di-restore:`);
    console.log(`   - Karyawan: ${backupData.karyawan.length}`);
    console.log(`   - Cuti Tahunan: ${backupData.cutiTahunan.length}`);
    console.log(`   - Cuti: ${backupData.cuti.length}`);
    console.log(`   - Item: ${backupData.item.length}`);
    console.log(`   - Pembelian: ${backupData.pembelian.length}`);
    console.log(`   - Pengeluaran: ${backupData.pengeluaran.length}`);
    console.log(`   - Absensi: ${backupData.absensi.length}`);
  } catch (error) {
    console.error('❌ Error saat restore:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Get backup file from command line argument
const backupFile = process.argv[2];

restore(backupFile)
  .then(() => {
    console.log('\n✨ Restore selesai!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Restore gagal:', error);
    process.exit(1);
  });
