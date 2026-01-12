import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logLevel = process.env.LOG_LEVEL || 'info';

// Custom format untuk console dengan warna dan emoji
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...metadata }) => {
    // Emoji untuk setiap level
    const emoji: Record<string, string> = {
      error: '❌',
      warn: '⚠️',
      info: '✅',
      debug: '🔍',
    };

    // Ambil level name tanpa warna untuk emoji
    const levelName = level.includes('error')
      ? 'error'
      : level.includes('warn')
        ? 'warn'
        : level.includes('info')
          ? 'info'
          : 'debug';

    let msg = `${timestamp} ${emoji[levelName] || '📝'} [${level}] ${message}`;

    // Tambahkan metadata dengan format yang lebih baik
    const metadataKeys = Object.keys(metadata);
    if (metadataKeys.length > 0) {
      // Filter metadata yang bukan dari winston internal
      const filteredMetadata: Record<string, unknown> = {};
      for (const key of metadataKeys) {
        if (!['level', 'message', 'timestamp', 'stack'].includes(key)) {
          filteredMetadata[key] = metadata[key];
        }
      }

      if (Object.keys(filteredMetadata).length > 0) {
        msg += `\n  📋 Metadata: ${JSON.stringify(filteredMetadata, null, 2).split('\n').join('\n  ')}`;
      }
    }

    // Tambahkan stack trace untuk error
    if (stack && typeof stack === 'string') {
      msg += `\n  🔥 Stack Trace:\n  ${stack.split('\n').join('\n  ')}`;
    }

    return msg;
  })
);

// Custom format untuk file (tanpa warna dan emoji)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Logger instance
export const logger = winston.createLogger({
  level: logLevel,
  transports: [
    // Console transport dengan warna dan emoji
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // File transport untuk semua log
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      level: 'info',
      format: fileFormat,
    }),
    // File transport khusus untuk error
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      format: fileFormat,
    }),
  ],
});

// Stream untuk Morgan HTTP logging middleware
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};
