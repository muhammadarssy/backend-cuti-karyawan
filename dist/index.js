import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './utils/logger.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import prisma from './lib/prisma.js';
import { schedulerAgent } from './agents/scheduler.agent.js';
// Load environment variables
dotenv.config();
// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusEmoji = res.statusCode >= 500 ? '💥' : res.statusCode >= 400 ? '⚠️' : '✅';
        logger.info(`HTTP ${statusEmoji} ${req.method} ${req.path} - ${res.statusCode}`, {
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip || req.socket.remoteAddress,
            userAgent: req.get('user-agent'),
        });
    });
    next();
});
// Mount API routes
app.use('/api', routes);
// 404 handler
app.use(notFoundHandler);
// Global error handler
app.use(errorHandler);
// Start server
async function startServer() {
    try {
        // Test database connection
        await prisma.$connect();
        logger.info('🗄️  Database PostgreSQL connected successfully');
        app.listen(PORT, () => {
            logger.info(`🚀 Server started successfully`, {
                port: PORT,
                env: process.env.NODE_ENV || 'development',
                apiUrl: `http://localhost:${PORT}/api`,
                healthCheck: `http://localhost:${PORT}/api/health`,
            });
            logger.info(`📚 API Documentation available at http://localhost:${PORT}/api`);
            // Start scheduler untuk auto-generate cuti tahunan
            if (process.env.ENABLE_SCHEDULER === 'true') {
                schedulerAgent.startAutoGenerateCutiTahunan();
                logger.info('⏰ Scheduler enabled: Auto-generate cuti tahunan activated');
            }
            else {
                logger.info('⏰ Scheduler disabled: Set ENABLE_SCHEDULER=true to enable auto-generation');
            }
        });
    }
    catch (error) {
        logger.error('❌ Failed to start server', { error });
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('⏹️  Received SIGINT signal, shutting down gracefully...');
    schedulerAgent.stop();
    await prisma.$disconnect();
    logger.info('👋 Server stopped successfully');
    process.exit(0);
});
process.on('SIGTERM', async () => {
    logger.info('⏹️  Received SIGTERM signal, shutting down gracefully...');
    schedulerAgent.stop();
    await prisma.$disconnect();
    logger.info('👋 Server stopped successfully');
    process.exit(0);
});
// Start the server
startServer();
