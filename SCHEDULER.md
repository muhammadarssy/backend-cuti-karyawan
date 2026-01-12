# Scheduler Agent Documentation

## Overview

SchedulerAgent adalah komponen opsional yang menyediakan automasi untuk generate hak cuti tahunan secara otomatis setiap awal tahun.

## Features

✅ **Auto-generate cuti tahunan** - Otomatis generate hak cuti untuk semua karyawan aktif setiap 1 Januari jam 00:00  
✅ **Manual trigger** - API endpoint untuk trigger manual generation  
✅ **Configurable** - Dapat diaktifkan/nonaktifkan via environment variable  
✅ **Timezone support** - Mendukung timezone configuration (default: Asia/Jakarta)  
✅ **Error handling** - Comprehensive error logging dan handling  

## Configuration

### Environment Variable

```env
# .env file
ENABLE_SCHEDULER=true  # Set to true untuk enable auto-generation
```

### Default Schedule

- **Cron Expression**: `0 0 1 1 *`
- **Meaning**: Setiap tanggal 1 Januari jam 00:00
- **Timezone**: Asia/Jakarta (dapat disesuaikan)

## Usage

### 1. Enable Scheduler

Set environment variable di `.env`:

```env
ENABLE_SCHEDULER=true
```

Server akan otomatis start scheduler saat aplikasi berjalan.

### 2. Manual Trigger

Generate cuti tahunan secara manual melalui API endpoint (akan dibuat):

```bash
POST /api/scheduler/trigger
{
  "tahun": 2026  # Optional, default to current year
}
```

### 3. Check Status

```bash
GET /api/scheduler/status
```

Response:
```json
{
  "success": true,
  "data": {
    "isRunning": true,
    "nextRun": "Scheduled for 1st January 00:00"
  }
}
```

## Implementation Details

### SchedulerAgent Class

```typescript
class SchedulerAgent {
  // Start auto-generate scheduler
  startAutoGenerateCutiTahunan(cronExpression?: string): void
  
  // Stop scheduler
  stop(): void
  
  // Manual trigger
  triggerManualGenerate(tahun?: number): Promise<Result>
  
  // Check if running
  isRunning(): boolean
  
  // Get status
  getStatus(): Status
}
```

### Cron Expression Format

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

**Examples:**
- `0 0 1 1 *` - Setiap 1 Januari jam 00:00
- `0 0 1 * *` - Setiap tanggal 1 setiap bulan jam 00:00
- `0 2 * * *` - Setiap hari jam 02:00

## Process Flow

```
1. Scheduler triggered (cron atau manual)
   ↓
2. Get current year
   ↓
3. Call CutiTahunanAgent.generateCutiTahunanBulk(tahun)
   ↓
4. Iterate all active karyawan
   ↓
5. Generate cuti tahunan for each
   ↓
6. Log results (success/failed)
   ↓
7. Send notification (optional)
```

## Logging

Scheduler menghasilkan log untuk monitoring:

```
🕐 Scheduler starting...
🔄 Running auto-generate for year 2026
✅ Auto-generate completed: 50 success, 0 failed
⚠️ Some generations failed: [...]
❌ Auto-generate failed: Error message
⏹️ Scheduler stopped
```

## Error Handling

- **Karyawan sudah memiliki cuti tahun berjalan**: Akan di-skip, tidak error
- **Database error**: Dicatat di log, proses tetap continue untuk karyawan lain
- **Network error**: Retry logic dapat ditambahkan jika diperlukan

## Best Practices

1. ✅ **Enable di Production**: Untuk automasi generate cuti tahunan
2. ✅ **Disable di Development**: Set `ENABLE_SCHEDULER=false` saat development
3. ✅ **Monitor Logs**: Periksa log setiap awal tahun untuk memastikan berhasil
4. ✅ **Manual Backup**: Tetap sediakan manual trigger untuk edge cases
5. ✅ **Test First**: Test manual trigger sebelum enable auto-scheduler

## Testing

Untuk testing scheduler:

```bash
# Set cron untuk run setiap menit (testing only)
schedulerAgent.startAutoGenerateCutiTahunan('* * * * *');

# Atau trigger manual
const result = await schedulerAgent.triggerManualGenerate(2026);
console.log(result);
```

## Graceful Shutdown

Scheduler akan otomatis stop saat aplikasi shutdown (SIGINT/SIGTERM):

```typescript
process.on('SIGINT', async () => {
  schedulerAgent.stop(); // Stop scheduler first
  await prisma.$disconnect();
  process.exit(0);
});
```

## Future Enhancements

- 📧 Email notification saat auto-generate selesai
- 📊 Dashboard untuk monitoring scheduler
- 🔔 Alert jika ada failure
- 📅 Multiple scheduler untuk task berbeda
- 🔄 Retry mechanism untuk failed generations

## Dependencies

- `node-cron`: ^3.0.3
- `@types/node-cron`: ^3.0.11

## Related Files

- `src/agents/scheduler.agent.ts` - Main implementation
- `src/agents/cuti-tahunan.agent.ts` - Generate logic
- `src/index.ts` - Scheduler initialization

## Support

Jika ada issue dengan scheduler, check:
1. Environment variable `ENABLE_SCHEDULER`
2. Database connection
3. Log files di `logs/error.log`
4. Timezone configuration
