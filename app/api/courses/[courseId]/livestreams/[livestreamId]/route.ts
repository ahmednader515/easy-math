import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ courseId: string; livestreamId: string }> }
) {
    try {
        const resolvedParams = await params;
        const { courseId, livestreamId } = resolvedParams;
        
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Get the livestream
        const livestream = await db.liveStream.findUnique({
            where: {
                id: livestreamId,
                courseId: courseId,
                isPublished: true
            },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        userId: true,
                        price: true,
                        purchases: {
                            where: {
                                userId,
                                status: "ACTIVE"
                            }
                        }
                    }
                }
            }
        });

        if (!livestream) {
            return new NextResponse("Livestream not found", { status: 404 });
        }

        // Check if livestream is expired (hide expired livestreams from students)
        let isExpired = false;
        if (livestream.scheduledAt) {
            const scheduledTime = new Date(livestream.scheduledAt);
            const now = new Date();
            
            // Calculate end time: scheduled time + duration (in milliseconds)
            const endTime = livestream.duration 
                ? new Date(scheduledTime.getTime() + (livestream.duration * 60 * 1000))
                : scheduledTime;
            
            // Only mark as expired if the end time has passed
            isExpired = endTime < now;
        }

        if (isExpired) {
            return new NextResponse("Livestream has expired", { status: 404 });
        }

        // Check access - free courses or purchased courses
        const hasAccess = livestream.course.price === 0 || livestream.course.purchases.length > 0;

        if (!hasAccess) {
            return new NextResponse("Access denied. Please purchase the course.", { status: 403 });
        }

        // Get all content (chapters, quizzes, and livestreams) for navigation
        const [chapters, quizzes, livestreams] = await Promise.all([
            db.chapter.findMany({
                where: {
                    courseId: courseId,
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
                    courseId: courseId,
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
                    courseId: courseId,
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
        const chaptersWithType = chapters.map(chapter => ({ ...chapter, type: 'chapter' as const, position: chapter.position }));
        const quizzesWithType = quizzes.map(quiz => ({ ...quiz, type: 'quiz' as const, position: quiz.position }));
        const livestreamsWithType = activeLiveStreams.map(ls => ({ 
            ...ls, 
            type: 'livestream' as const, 
            position: ls.scheduledAt ? new Date(ls.scheduledAt).getTime() : 999999 
        }));

        // Combine and sort by position
        const sortedContent = [...chaptersWithType, ...quizzesWithType, ...livestreamsWithType].sort((a, b) => a.position - b.position);

        // Find current livestream index
        const currentIndex = sortedContent.findIndex(content => 
            content.id === livestreamId && content.type === 'livestream'
        );

        // Find next and previous content
        const nextContent = currentIndex !== -1 && currentIndex < sortedContent.length - 1
            ? sortedContent[currentIndex + 1]
            : null;
        
        const previousContent = currentIndex > 0
            ? sortedContent[currentIndex - 1]
            : null;

        return NextResponse.json({
            ...livestream,
            nextChapterId: nextContent?.id || null,
            nextContentType: nextContent?.type || null,
            previousChapterId: previousContent?.id || null,
            previousContentType: previousContent?.type || null,
            course: undefined // Remove course from response
        });
    } catch (error) {
        console.log("[COURSE_LIVESTREAM_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

