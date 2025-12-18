/**
 * Database Migration Script (TypeScript)
 * 
 * This script migrates data from Aiven database to Prisma database
 * using Prisma Client for better type safety and relationship handling.
 * 
 * Usage:
 *   Set SOURCE_DATABASE_URL and TARGET_DATABASE_URL in .env
 *   Run: ts-node --project scripts/tsconfig.json scripts/migrate-db.ts
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
  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  const targetUrl = process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL;

  if (!sourceUrl) {
    console.error('❌ Error: SOURCE_DATABASE_URL environment variable not found!');
    console.error('Please set SOURCE_DATABASE_URL to your Aiven database connection string.');
    process.exit(1);
  }

  if (!targetUrl) {
    console.error('❌ Error: TARGET_DATABASE_URL or DATABASE_URL environment variable not found!');
    console.error('Please set TARGET_DATABASE_URL to your target Prisma database connection string.');
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
    console.log('[Step 1/15] Testing database connections...');
    await sourceClient.$connect();
    console.log('  ✓ Source database connected');
    await targetClient.$connect();
    console.log('  ✓ Target database connected');
    console.log('');

    // Verify target database schema is up to date
    console.log('[Step 2/15] Verifying target database schema...');
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
      if (error.code === 'P2022' || error.message?.includes('does not exist')) {
        console.log('');
        console.log('  ❌ Error: Target database schema is not up to date!');
        console.log('');
        console.log('  Please run Prisma migrations on the target database first:');
        console.log('    npx prisma migrate deploy');
        console.log('');
        console.log('  Or if developing locally:');
        console.log('    npx prisma migrate dev');
        console.log('');
        throw new Error('Target database schema is not up to date. Please run Prisma migrations first.');
      }
      throw error;
    }
    console.log('');

    // Migrate Users (must be first due to foreign key dependencies)
    console.log('[Step 3/15] Migrating Users...');
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
    console.log('[Step 4/15] Migrating Courses...');
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
    console.log('[Step 5/15] Migrating Chapters...');
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
    console.log('[Step 6/15] Migrating Attachments...');
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
    console.log('[Step 7/15] Migrating User Progress...');
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
    console.log('[Step 8/14] Migrating Purchases...');
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
    console.log('[Step 9/14] Migrating Balance Transactions...');
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
    console.log('[Step 10/14] Migrating Quizzes...');
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
    console.log('[Step 11/14] Migrating Questions...');
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
    console.log('[Step 12/14] Migrating Quiz Results...');
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
    console.log('[Step 13/14] Migrating Quiz Attempts...');
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
    console.log('[Step 14/14] Migrating Quiz Answers...');
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
    console.log('[Step 15/15] Migrating Promo Codes...');
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

