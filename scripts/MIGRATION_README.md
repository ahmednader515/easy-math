# Database Migration Scripts

This directory contains scripts to migrate data from your Aiven database to a Prisma database.

## Prerequisites

1. **PostgreSQL Client Tools** (for PowerShell script):
   - Install PostgreSQL client tools: https://www.postgresql.org/download/windows/
   - Make sure `pg_dump` and `psql` are in your system PATH

2. **Environment Variables**:
   - `SOURCE_DATABASE_URL`: Your Aiven database connection string
   - `TARGET_DATABASE_URL`: Your target Prisma database connection string (or use `DATABASE_URL`)

## Migration Methods

### Method 1: PowerShell Script (Recommended for Large Databases)

This script uses `pg_dump` and `psql` for efficient bulk data transfer.

**Usage:**
```powershell
# Set environment variables in .env file or PowerShell
$env:SOURCE_DATABASE_URL = "postgresql://user:password@aiven-host:port/database"
$env:TARGET_DATABASE_URL = "postgresql://user:password@target-host:port/database"

# Run migration
npm run migrate:db
```

**Or directly:**
```powershell
powershell -ExecutionPolicy Bypass -File scripts/migrate-db.ps1
```

**Features:**
- Exports data only (not schema - schema should be managed by Prisma migrations)
- Creates a SQL dump file for backup
- Imports data into target database
- Handles large datasets efficiently

**Important Notes:**
- Make sure you've run Prisma migrations on the target database first:
  ```bash
  npx prisma migrate deploy
  ```
- The script will ask for confirmation before importing data
- Dump files are saved in `temp_migration/` directory

### Method 2: TypeScript Script (Recommended for Data Integrity)

This script uses Prisma Client to migrate data with proper relationship handling.

**Usage:**
```powershell
# Set environment variables in .env file
SOURCE_DATABASE_URL=postgresql://user:password@aiven-host:port/database
TARGET_DATABASE_URL=postgresql://user:password@target-host:port/database

# Run migration
npm run migrate:db:ts
```

**Or directly:**
```powershell
ts-node --project scripts/tsconfig.json scripts/migrate-db.ts
```

**Features:**
- Uses Prisma Client for type-safe data migration
- Handles relationships and foreign keys properly
- Uses upsert operations (won't duplicate data if run multiple times)
- Migrates data in correct order to respect foreign key constraints
- Better error handling and progress reporting

**Migration Order:**
1. Users
2. Courses
3. Chapters
4. Attachments & Chapter Attachments
5. User Progress
6. Purchases
7. Balance Transactions
8. Quizzes
9. Questions
10. Quiz Results
11. Quiz Attempts
12. Quiz Answers
13. Promo Codes

## Setup Steps

1. **Prepare Target Database:**
   ```bash
   # Make sure your target database has the schema
   npx prisma migrate deploy
   # Or if developing locally:
   npx prisma migrate dev
   ```

2. **Set Environment Variables:**
   Create or update your `.env` file:
   ```env
   # Source database (Aiven)
   SOURCE_DATABASE_URL=postgresql://user:password@aiven-host:port/database
   
   # Target database (Prisma)
   TARGET_DATABASE_URL=postgresql://user:password@target-host:port/database
   # Or use existing DATABASE_URL
   DATABASE_URL=postgresql://user:password@target-host:port/database
   ```

3. **Run Migration:**
   ```bash
   # Option 1: PowerShell script (faster for large databases)
   npm run migrate:db
   
   # Option 2: TypeScript script (better for data integrity)
   npm run migrate:db:ts
   ```

## Troubleshooting

### PowerShell Script Issues

**Error: pg_dump not found**
- Install PostgreSQL client tools
- Add PostgreSQL bin directory to PATH
- Or run: `powershell -ExecutionPolicy Bypass -File scripts/find-pgdump.ps1`

**Error: Connection refused**
- Check your database URLs are correct
- Verify network connectivity to both databases
- Check firewall rules

**Error: Permission denied**
- Ensure database user has read permissions on source database
- Ensure database user has write permissions on target database

### TypeScript Script Issues

**Error: Cannot find module '@prisma/client'**
- Run: `npx prisma generate`
- Make sure Prisma schema is up to date

**Error: Foreign key constraint violation**
- The script migrates data in the correct order
- If you still get errors, check that all foreign key relationships exist in target database
- Make sure Prisma migrations are up to date

**Error: Unique constraint violation**
- The script uses `upsert` operations, so this shouldn't happen
- If it does, check for duplicate unique values in source data

## Verification

After migration, verify the data:

```bash
# Connect to target database and check record counts
npx prisma studio
```

Or use SQL:
```sql
SELECT 
  (SELECT COUNT(*) FROM "User") as users,
  (SELECT COUNT(*) FROM "Course") as courses,
  (SELECT COUNT(*) FROM "Chapter") as chapters,
  (SELECT COUNT(*) FROM "Purchase") as purchases;
```

## Cleanup

After successful migration and verification:

```powershell
# Remove temporary migration files
Remove-Item -Recurse -Force temp_migration
```

## Notes

- **Backup First**: Always backup your target database before migration
- **Test Environment**: Test the migration on a test/staging database first
- **Downtime**: Consider downtime during migration for production databases
- **Data Validation**: Verify data integrity after migration
- **Rollback Plan**: Keep the dump file until you're confident the migration succeeded

