import cron, { type ScheduledTask } from 'node-cron';
import { cutiTahunanAgent } from './cuti-tahunan.agent.js';
import { getCurrentYear } from '../utils/date.js';
import { logger } from '../utils/logger.js';

/**
 * SchedulerAgent - Proses otomatis terjadwal
 */
export class SchedulerAgent {
  private cronJob: ScheduledTask | null = null;

  /**
   * Start scheduler untuk generate cuti tahunan otomatis
   * Default: Setiap tanggal 1 Januari jam 00:00
   */
  startAutoGenerateCutiTahunan(cronExpression: string = '0 0 1 1 *') {
    if (this.cronJob) {
      logger.warn('SchedulerAgent: Cron job already running');
      return;
    }

    logger.info('🕐 SchedulerAgent: Starting auto-generate cuti tahunan scheduler', {
      cronExpression,
    });

    this.cronJob = cron.schedule(
      cronExpression,
      async () => {
        const tahun = getCurrentYear();
        logger.info('🔄 SchedulerAgent: Running auto-generate cuti tahunan', { tahun });

        try {
          const result = await cutiTahunanAgent.generateCutiTahunanBulk(tahun);

          logger.info('✅ SchedulerAgent: Auto-generate completed', {
            tahun,
            success: result.success.length,
            failed: result.failed.length,
          });

          if (result.failed.length > 0) {
            logger.warn('⚠️ SchedulerAgent: Some generations failed', {
              failures: result.failed,
            });
          }
        } catch (error) {
          logger.error('❌ SchedulerAgent: Auto-generate failed', {
            tahun,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
      {
        timezone: 'Asia/Jakarta', // Sesuaikan dengan timezone Anda
      }
    );

    logger.info('✅ SchedulerAgent: Scheduler started successfully');
  }

  /**
   * Stop scheduler
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('⏹️ SchedulerAgent: Scheduler stopped');
    }
  }

  /**
   * Trigger manual generate untuk semua karyawan aktif
   */
  async triggerManualGenerate(tahun?: number) {
    const targetTahun = tahun || getCurrentYear();
    logger.info('🔄 SchedulerAgent: Manual trigger generate cuti tahunan', {
      tahun: targetTahun,
    });

    try {
      const result = await cutiTahunanAgent.generateCutiTahunanBulk(targetTahun);

      logger.info('✅ SchedulerAgent: Manual generate completed', {
        tahun: targetTahun,
        success: result.success.length,
        failed: result.failed.length,
      });

      return result;
    } catch (error) {
      logger.error('❌ SchedulerAgent: Manual generate failed', {
        tahun: targetTahun,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Check if scheduler is running
   */
  isRunning(): boolean {
    return this.cronJob !== null;
  }

  /**
   * Get cron status
   */
  getStatus() {
    return {
      isRunning: this.isRunning(),
      nextRun: this.cronJob
        ? 'Scheduled for 1st January 00:00'
        : 'Not scheduled',
    };
  }
}

// Export singleton instance
export const schedulerAgent = new SchedulerAgent();
