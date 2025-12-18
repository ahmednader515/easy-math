import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const resolvedParams = await params;
        const { userId } = await auth();

        // Check if user has purchased the course and get course data
        let hasAccess = false;
        let coursePrice = 0;
        
        if (userId) {
            const course = await db.course.findUnique({
                where: {
                    id: resolvedParams.courseId,
                    isPublished: true,
                },
                select: {
                    price: true,
                    purchases: {
                        where: {
                            userId,
                            status: "ACTIVE"
                        }
                    }
                }
            });

            // Free courses are always accessible, but we still check purchase
            if (course) {
                coursePrice = course.price;
                hasAccess = course.price === 0 || course.purchases.length > 0;
            }
        }

        // Fetch chapters, quizzes, and livestreams in parallel
        const [chapters, quizzes, livestreams] = await Promise.all([
            db.chapter.findMany({
                where: {
                    courseId: resolvedParams.courseId,
                    isPublished: true
                },
                include: hasAccess && userId ? {
                    userProgress: {
                        where: {
                            userId
                        },
                        select: {
                            isCompleted: true
                        }
                    }
                } : undefined,
                orderBy: {
                    position: "asc"
                }
            }),
            db.quiz.findMany({
                where: {
                    courseId: resolvedParams.courseId,
                    isPublished: true
                },
                include: hasAccess && userId ? {
                    quizResults: {
                        where: {
                            studentId: userId
                        },
                        select: {
                            id: true,
                            score: true,
                            totalPoints: true,
                            percentage: true
                        }
                    }
                } : undefined,
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
                    title: true,
                    description: true,
                    meetingUrl: true,
                    meetingType: true,
                    scheduledAt: true,
                    duration: true,
                    createdAt: true,
                    updatedAt: true
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

        // Combine and sort by position
        // Livestreams use scheduledAt timestamp as position (or 999999 if not scheduled)
        const allContent = [
            ...chapters.map(chapter => ({
                ...chapter,
                type: 'chapter' as const,
                // Only include userProgress if user has access
                userProgress: hasAccess ? chapter.userProgress : undefined
            })),
            ...quizzes.map(quiz => ({
                ...quiz,
                type: 'quiz' as const,
                // Only include quizResults if user has access
                quizResults: hasAccess ? quiz.quizResults : undefined
            })),
            ...activeLiveStreams.map(livestream => ({
                ...livestream,
                type: 'livestream' as const,
                position: livestream.scheduledAt ? new Date(livestream.scheduledAt).getTime() : 999999 // Live streams appear at the end
            }))
        ].sort((a, b) => a.position - b.position);

        return NextResponse.json(allContent);
    } catch (error) {
        console.log("[COURSE_CONTENT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 