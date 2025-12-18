import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ courseId: string; quizId: string }> }
) {
    try {
        const { userId } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Check if user has access to the course
        const purchase = await db.purchase.findUnique({
            where: {
                userId_courseId: {
                    userId,
                    courseId: resolvedParams.courseId
                }
            }
        });

        if (!purchase) {
            return new NextResponse("Course access required", { status: 403 });
        }

        // Get the current quiz
        const quiz = await db.quiz.findFirst({
            where: {
                id: resolvedParams.quizId,
                courseId: resolvedParams.courseId,
                isPublished: true
            }
        });

        if (!quiz) {
            return new NextResponse("Quiz not found", { status: 404 });
        }

        // Get all content (chapters, quizzes, and livestreams) for this course
        const [chapters, quizzes, livestreams] = await Promise.all([
            db.chapter.findMany({
                where: {
                    courseId: resolvedParams.courseId,
                    isPublished: true
                },
                select: {
                    id: true,
                    position: true
                },
                orderBy: {
                    position: "asc"
                }
            }),
            db.quiz.findMany({
                where: {
                    courseId: resolvedParams.courseId,
                    isPublished: true
                },
                select: {
                    id: true,
                    position: true
                },
                orderBy: {
                    position: "asc"
                }
            }),
            db.liveStream.findMany({
                where: {
                    courseId: resolvedParams.courseId,
                    isPublished: true
                },
                select: {
                    id: true,
                    scheduledAt: true,
                    duration: true
                },
                orderBy: {
                    scheduledAt: "asc"
                }
            })
        ]);

        // Filter out expired livestreams (accounting for duration)
        const now = new Date();
        const activeLiveStreams = livestreams.filter(ls => {
            if (!ls.scheduledAt) {
                // Immediate livestreams (no schedule) are always active
                return true;
            }
            
            const scheduledTime = new Date(ls.scheduledAt);
            // Calculate end time: scheduled time + duration (in milliseconds)
            const endTime = ls.duration 
                ? new Date(scheduledTime.getTime() + (ls.duration * 60 * 1000))
                : scheduledTime;
            
            // Show if livestream hasn't ended yet
            return endTime >= now;
        });

        // Add type to each item and combine
        const chaptersWithType = chapters.map(chapter => ({ ...chapter, type: 'chapter' as const }));
        const quizzesWithType = quizzes.map(quiz => ({ ...quiz, type: 'quiz' as const }));
        const livestreamsWithType = activeLiveStreams.map(ls => ({ 
            ...ls, 
            type: 'livestream' as const, 
            position: ls.scheduledAt ? new Date(ls.scheduledAt).getTime() : 999999 
        }));

        // Combine and sort by position
        const sortedContent = [...chaptersWithType, ...quizzesWithType, ...livestreamsWithType].sort((a, b) => a.position - b.position);

        // Find current quiz index
        const currentIndex = sortedContent.findIndex(content => 
            content.id === resolvedParams.quizId && content.type === 'quiz'
        );

        // Find next and previous content
        const nextContent = currentIndex !== -1 && currentIndex < sortedContent.length - 1 
            ? sortedContent[currentIndex + 1] 
            : null;
        
        const previousContent = currentIndex > 0 
            ? sortedContent[currentIndex - 1] 
            : null;

        const response = {
            nextContentId: nextContent?.id || null,
            previousContentId: previousContent?.id || null,
            nextContentType: nextContent?.type || null,
            previousContentType: previousContent?.type || null,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.log("[QUIZ_NAVIGATION_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 