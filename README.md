# Backend Cuti - API Documentation

Backend sistem cuti karyawan dengan arsitektur agent-based menggunakan Express.js, TypeScript, dan Prisma ORM.

## Features

- ✅ CRUD Karyawan dengan status management
- ✅ Generate hak cuti tahunan dengan carry forward
- ✅ Pencatatan cuti langsung (tanpa approval)
- ✅ Rollback otomatis saat hapus cuti
- ✅ Professional logging dengan Winston
- ✅ Standardized API response format
- ✅ Input validation dengan Zod
- ✅ ESLint & Prettier untuk code quality
- ✅ TypeScript untuk type safety

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Validation**: Zod
- **Logging**: Winston
- **Code Quality**: ESLint + Prettier

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL database
- npm or yarn

### Installation

1. Clone repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` file with your database credentials.

4. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```

5. Run database migration:
   ```bash
   npm run prisma:migrate
   ```

### Development

Run development server with hot reload:
```bash
npm run dev
```

### Build & Production

Build TypeScript to JavaScript:
```bash
npm run build
```

Run production server:
```bash
npm start
```

### Code Quality

Run linter:
```bash
npm run lint
```

Auto-fix linting issues:
```bash
npm run lint:fix
```

Format code:
```bash
npm run format
```

## API Endpoints

### Health Check

```
GET /api/health
```

### Karyawan API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/karyawan` | Create new karyawan |
| GET | `/api/karyawan` | Get all karyawan (filter by status optional) |
| GET | `/api/karyawan/:id` | Get karyawan by ID |
| PUT | `/api/karyawan/:id` | Update karyawan |
| DELETE | `/api/karyawan/:id` | Deactivate karyawan (soft delete) |

### Cuti Tahunan API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cuti-tahunan/generate` | Generate hak cuti tahunan |
| GET | `/api/cuti-tahunan` | Get rekap cuti tahunan (filter by tahun/karyawan) |
| GET | `/api/cuti-tahunan/:id` | Get detail cuti tahunan by ID |

### Cuti API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cuti` | Create/record cuti (langsung potong saldo) |
| GET | `/api/cuti` | Get list cuti with pagination & filters |
| GET | `/api/cuti/:id` | Get cuti by ID |
| DELETE | `/api/cuti/:id` | Delete cuti & rollback saldo |
| GET | `/api/cuti/rekap/alasan` | Get rekap alasan cuti |
| GET | `/api/cuti/summary/:karyawanId` | Get summary cuti by karyawan |

## Project Structure

```
backend-cuti/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── agents/                # Business logic layer
│   │   ├── karyawan.agent.ts
│   │   ├── cuti-tahunan.agent.ts
│   │   └── cuti.agent.ts
│   ├── controllers/           # API handlers
│   │   ├── karyawan.controller.ts
│   │   ├── cuti-tahunan.controller.ts
│   │   └── cuti.controller.ts
│   ├── routes/                # API routes
│   │   ├── index.ts
│   │   ├── karyawan.routes.ts
│   │   ├── cuti-tahunan.routes.ts
│   │   └── cuti.routes.ts
│   ├── middleware/            # Express middleware
│   │   └── error-handler.ts
│   ├── lib/                   # External libraries config
│   │   └── prisma.ts
│   ├── utils/                 # Utility functions
│   │   ├── logger.ts
│   │   ├── response.ts
│   │   ├── errors.ts
│   │   └── date.ts
│   └── index.ts               # Application entry point
├── logs/                      # Application logs (auto-generated)
├── .env                       # Environment variables
├── .env.example               # Environment template
├── tsconfig.json              # TypeScript config
├── eslint.config.js           # ESLint config
├── .prettierrc                # Prettier config
└── package.json
```

## API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "meta": {
    "timestamp": "2026-01-09T10:00:00.000Z"
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": {
    "code": "ERROR_CODE",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2026-01-09T10:00:00.000Z"
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Data retrieved",
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  },
  "meta": {
    "timestamp": "2026-01-09T10:00:00.000Z"
  }
}
```

## Logging Levels

- **error**: Error yang memerlukan perhatian
- **warn**: Warning yang perlu dimonitor
- **info**: Informasi umum (default)
- **debug**: Informasi detail untuk debugging

Set log level di `.env`:
```
LOG_LEVEL=info
```

## License

ISC
