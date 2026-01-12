import { beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import prisma from '../lib/prisma.js';

// Mock logger untuk menghindari noise di test output
jest.unstable_mockModule('../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Setup before all tests
beforeAll(async () => {
  // Koneksi ke test database
  await prisma.$connect();
  
  // Clear all data before starting tests
  await prisma.cuti.deleteMany();
  await prisma.cutiTahunan.deleteMany();
  await prisma.karyawan.deleteMany();
});

// Cleanup after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

// Clear database before each test
beforeEach(async () => {
  // Delete all data in reverse order of dependencies
  try {
    await prisma.cuti.deleteMany();
    await prisma.cutiTahunan.deleteMany();
    await prisma.karyawan.deleteMany();
  } catch {
    // Ignore errors during cleanup
  }
});

// Additional cleanup after each test
afterEach(async () => {
  // Additional cleanup if needed
});
