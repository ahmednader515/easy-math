/**
 * Database Migration Script (TypeScript)
 * 
 * This script migrates data from current database to new database
 * using Prisma Client for better type safety and relationship handling.
 * 
 * Usage:
 *   Set DATABASE_URL, DIRECT_DATABASE_URL, PRISMA_ACCELERATE_URL (current)
 *   Set NEW_DATABASE_URL, NEW_DIRECT_DATABASE_URL, NEW_PRISMA_ACCELERATE_URL (new)
 *   Run: npm run migrate:db:ts
 */

import { PrismaClient } from '@prisma/client';

// Parse database URL to create Prisma client with custom datasource
function createPrismaClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
}

async function migrateData() {
  // Source database (current) - use DIRECT_DATABASE_URL if available, otherwise DATABASE_URL
  const sourceUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  
  // Target database (new) - use NEW_DIRECT_DATABASE_URL if available, otherwise NEW_DATABASE_URL
  const targetUrl = process.env.NEW_DIRECT_DATABASE_URL || process.env.NEW_DATABASE_URL;

  if (!sourceUrl) {
    console.error('❌ Error: DATABASE_URL or DIRECT_DATABASE_URL environment variable not found!');
    console.error('Please set DATABASE_URL (or DIRECT_DATABASE_URL) to your current database connection string.');
    process.exit(1);
  }

  if (!targetUrl) {
    console.error('❌ Error: NEW_DATABASE_URL or NEW_DIRECT_DATABASE_URL environment variable not found!');
    console.error('Please set NEW_DATABASE_URL (or NEW_DIRECT_DATABASE_URL) to your new database connection string.');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('Database Migration Script');
  console.log('='.repeat(60));
  console.log('');

  const sourceClient = createPrismaClient(sourceUrl);
  const targetClient = createPrismaClient(targetUrl);

  try {
    // Test connections
    console.log('[Step 1/17] Testing database connections...');
    await sourceClient.$connect();
    console.log('  ✓ Source database connected');
    await targetClient.$connect();
    console.log('  ✓ Target database connected');
    console.log('');

    // Verify target database schema is up to date
    console.log('[Step 2/17] Verifying target database schema...');
    const skipSchemaCheck = process.env.SKIP_SCHEMA_CHECK === 'true';
    
    if (skipSchemaCheck) {
      console.log('  ⚠️  Skipping schema check (SKIP_SCHEMA_CHECK=true)');
      console.log('');
    } else {
      try {
        // Try to query a Course with all expected fields
        await targetClient.course.findFirst({
          select: {
            id: true,
            userId: true,
            title: true,
            description: true,
            imageUrl: true,
            price: true,
            isPublished: true,
            grade: true,
            divisions: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        console.log('  ✓ Target database schema verified');
      } catch (error: any) {
        if (error.code === 'P2022' || error.message?.includes('does not exist') || error.code === '42P01') {
          console.log('');
          console.log('  ❌ Error: Target database schema is not up to date!');
          console.log('');
          console.log('  Please run Prisma migrations on the target database first.');
          console.log('');
          console.log('  EASIEST WAY: Use the setup script:');
          console.log('    npm run setup:new-db');
          console.log('');
          console.log('  OR manually run migrations (PowerShell):');
          console.log('    $env:DATABASE_URL="' + targetUrl + '"');
          if (process.env.NEW_DIRECT_DATABASE_URL) {
            console.log('    $env:DIRECT_DATABASE_URL="' + process.env.NEW_DIRECT_DATABASE_URL + '"');
          }
          console.log('    npx prisma migrate deploy');
          console.log('');
          console.log('  Or if developing locally:');
          console.log('    $env:DATABASE_URL="' + targetUrl + '"');
          if (process.env.NEW_DIRECT_DATABASE_URL) {
            console.log('    $env:DIRECT_DATABASE_URL="' + process.env.NEW_DIRECT_DATABASE_URL + '"');
          }
          console.log('    npx prisma migrate dev');
          console.log('');
          console.log('  Alternatively, you can set SKIP_SCHEMA_CHECK=true to skip this check');
          console.log('  (not recommended unless you are certain the schema is correct)');
          console.log('');
          throw new Error('Target database schema is not up to date. Please run Prisma migrations first.');
        }
        throw error;
      }
    }
    console.log('');

    // Migrate Users (must be first due to foreign key dependencies)
    console.log('[Step 3/17] Migrating Users...');
    const users = await sourceClient.user.findMany({
      orderBy: { createdAt: 'asc' },
    });
    console.log(`  Found ${users.length} users`);
    
    if (users.length > 0) {
      // Delete existing users in target (optional - comment out if you want to merge)
      // await targetClient.user.deleteMany();
      
      for (const user of users) {
        await targetClient.user.upsert({
          where: { id: user.id },
          update: user,
          create: user,
        });
      }
      console.log(`  ✓ Migrated ${users.length} users`);
    }
    console.log('');

    // Migrate Courses
    console.log('[Step 4/17] Migrating Courses...');
    const courses = await sourceClient.course.findMany({
      orderBy: { createdAt: 'asc' },
    });
    console.log(`  Found ${courses.length} courses`);
    
    if (courses.length > 0) {
      for (const course of courses) {
        await targetClient.course.upsert({
          where: { id: course.id },
          update: course,
          create: course,
        });
      }
      console.log(`  ✓ Migrated ${courses.length} courses`);
    }
    console.log('');

    // Migrate Chapters
    console.log('[Step 5/17] Migrating Chapters...');
    const chapters = await sourceClient.chapter.findMany({
      orderBy: { createdAt: 'asc' },
    });
    console.log(`  Found ${chapters.length} chapters`);
    
    if (chapters.length > 0) {
      for (const chapter of chapters) {
        await targetClient.chapter.upsert({
          where: { id: chapter.id },
          update: chapter,
          create: chapter,
        });
      }
      console.log(`  ✓ Migrated ${chapters.length} chapters`);
    }
    console.log('');

    // Migrate Attachments
    console.log('[Step 6/17] Migrating Attachments...');
    const attachments = await sourceClient.attachment.findMany({
      orderBy: { createdAt: 'asc' },
    });
    console.log(`  Found ${attachments.length} attachments`);
    
    if (attachments.length > 0) {
      for (const attachment of attachments) {
        await targetClient.attachment.upsert({
          where: { id: attachment.id },
          update: attachment,
          create: attachment,
        });
      }
      console.log(`  ✓ Migrated ${attachments.length} attachments`);
    }

    // Migrate Chapter Attachments
    const chapterAttachments = await sourceClient.chapterAttachment.findMany({
      orderBy: { createdAt: 'asc' },
    });
    console.log(`  Found ${chapterAttachments.length} chapter attachments`);
    
    if (chapterAttachments.length > 0) {
      for (const attachment of chapterAttachments) {
        await targetClient.chapterAttachment.upsert({
          where: { id: attachment.id },
          update: attachment,
          create: attachment,
        });
      }
      console.log(`  ✓ Migrated ${chapterAttachments.length} chapter attachments`);
    }
    console.log('');

    // Migrate User Progress
    console.log('[Step 7/17] Migrating User Progress...');
    const userProgress = await sourceClient.userProgress.findMany({
      orderBy: { createdAt: 'asc' },
    });
    console.log(`  Found ${userProgress.length} user progress records`);
    
    if (userProgress.length > 0) {
      for (const progress of userProgress) {
        await targetClient.userProgress.upsert({
          where: {
            userId_chapterId: {
              userId: progress.userId,
              chapterId: progress.chapterId,
            },
          },
          update: progress,
          create: progress,
        });
      }
      console.log(`  ✓ Migrated ${userProgress.length} user progress records`);
    }
    console.log('');

    // Migrate Purchases
    console.log('[Step 8/16] Migrating Purchases...');
    const purchases = await sourceClient.purchase.findMany({
      orderBy: { createdAt: 'asc' },
    });
    console.log(`  Found ${purchases.length} purchases`);
    
    if (purchases.length > 0) {
      for (const purchase of purchases) {
        await targetClient.purchase.upsert({
          where: {
            userId_courseId: {
              userId: purchase.userId,
              courseId: purchase.courseId,
            },
          },
          update: purchase,
          create: purchase,
        });
      }
      console.log(`  ✓ Migrated ${purchases.length} purchases`);
    }
    console.log('');

    // Migrate Balance Transactions
    console.log('[Step 9/16] Migrating Balance Transactions...');
    const transactions = await sourceClient.balanceTransaction.findMany({
      orderBy: { createdAt: 'asc' },
    });
    console.log(`  Found ${transactions.length} balance transactions`);
    
    if (transactions.length > 0) {
      for (const transaction of transactions) {
        await targetClient.balanceTransaction.upsert({
          where: { id: transaction.id },
          update: transaction,
          create: transaction,
        });
      }
      console.log(`  ✓ Migrated ${transactions.length} balance transactions`);
    }
    console.log('');

    // Migrate Quizzes
    console.log('[Step 10/16] Migrating Quizzes...');
    const quizzes = await sourceClient.quiz.findMany({
      orderBy: { createdAt: 'asc' },
    });
    console.log(`  Found ${quizzes.length} quizzes`);
    
    if (quizzes.length > 0) {
      for (const quiz of quizzes) {
        await targetClient.quiz.upsert({
          where: { id: quiz.id },
          update: quiz,
          create: quiz,
        });
      }
      console.log(`  ✓ Migrated ${quizzes.length} quizzes`);
    }
    console.log('');

    // Migrate Questions
    console.log('[Step 11/16] Migrating Questions...');
    const questions = await sourceClient.question.findMany({
      orderBy: { createdAt: 'asc' },
    });
    console.log(`  Found ${questions.length} questions`);
    
    if (questions.length > 0) {
      for (const question of questions) {
        await targetClient.question.upsert({
          where: { id: question.id },
          update: question,
          create: question,
        });
      }
      console.log(`  ✓ Migrated ${questions.length} questions`);
    }
    console.log('');

    // Migrate Quiz Results
    console.log('[Step 12/16] Migrating Quiz Results...');
    const quizResults = await sourceClient.quizResult.findMany({
      orderBy: { createdAt: 'asc' },
    });
    console.log(`  Found ${quizResults.length} quiz results`);
    
    if (quizResults.length > 0) {
      for (const result of quizResults) {
        await targetClient.quizResult.upsert({
          where: { id: result.id },
          update: result,
          create: result,
        });
      }
      console.log(`  ✓ Migrated ${quizResults.length} quiz results`);
    }
    console.log('');

    // Migrate Quiz Attempts
    console.log('[Step 13/16] Migrating Quiz Attempts...');
    const quizAttempts = await sourceClient.quizAttempt.findMany({
      orderBy: { startedAt: 'asc' },
    });
    console.log(`  Found ${quizAttempts.length} quiz attempts`);
    
    if (quizAttempts.length > 0) {
      for (const attempt of quizAttempts) {
        await targetClient.quizAttempt.upsert({
          where: {
            studentId_quizId: {
              studentId: attempt.studentId,
              quizId: attempt.quizId,
            },
          },
          update: attempt,
          create: attempt,
        });
      }
      console.log(`  ✓ Migrated ${quizAttempts.length} quiz attempts`);
    }
    console.log('');

    // Migrate Quiz Answers
    console.log('[Step 14/16] Migrating Quiz Answers...');
    const quizAnswers = await sourceClient.quizAnswer.findMany({
      orderBy: { createdAt: 'asc' },
    });
    console.log(`  Found ${quizAnswers.length} quiz answers`);
    
    if (quizAnswers.length > 0) {
      for (const answer of quizAnswers) {
        await targetClient.quizAnswer.upsert({
          where: { id: answer.id },
          update: answer,
          create: answer,
        });
      }
      console.log(`  ✓ Migrated ${quizAnswers.length} quiz answers`);
    }
    console.log('');

    // Migrate Promo Codes
    console.log('[Step 15/16] Migrating Promo Codes...');
    const promoCodes = await sourceClient.promoCode.findMany({
      orderBy: { createdAt: 'asc' },
    });
    console.log(`  Found ${promoCodes.length} promo codes`);
    
    if (promoCodes.length > 0) {
      for (const promoCode of promoCodes) {
        await targetClient.promoCode.upsert({
          where: { code: promoCode.code },
          update: promoCode,
          create: promoCode,
        });
      }
      console.log(`  ✓ Migrated ${promoCodes.length} promo codes`);
    }
    console.log('');

    // Migrate Live Streams
    console.log('[Step 16/17] Migrating Live Streams...');
    const liveStreams = await sourceClient.liveStream.findMany({
      orderBy: { createdAt: 'asc' },
    });
    console.log(`  Found ${liveStreams.length} live streams`);
    
    if (liveStreams.length > 0) {
      for (const liveStream of liveStreams) {
        await targetClient.liveStream.upsert({
          where: { id: liveStream.id },
          update: liveStream,
          create: liveStream,
        });
      }
      console.log(`  ✓ Migrated ${liveStreams.length} live streams`);
    }
    console.log('');

    // Migrate Live Stream Attendance
    console.log('[Step 17/17] Migrating Live Stream Attendance...');
    const liveStreamAttendance = await sourceClient.liveStreamAttendance.findMany({
      orderBy: { clickedAt: 'asc' },
    });
    console.log(`  Found ${liveStreamAttendance.length} live stream attendance records`);
    
    if (liveStreamAttendance.length > 0) {
      for (const attendance of liveStreamAttendance) {
        await targetClient.liveStreamAttendance.upsert({
          where: {
            liveStreamId_studentId: {
              liveStreamId: attendance.liveStreamId,
              studentId: attendance.studentId,
            },
          },
          update: attendance,
          create: attendance,
        });
      }
      console.log(`  ✓ Migrated ${liveStreamAttendance.length} live stream attendance records`);
    }
    console.log('');

    console.log('='.repeat(60));
    console.log('✅ Migration Completed Successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('');
    console.error('❌ Error during migration:', error);
    process.exit(1);
  } finally {
    await sourceClient.$disconnect();
    await targetClient.$disconnect();
  }
}

// Run migration
migrateData().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

