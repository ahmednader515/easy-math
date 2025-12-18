import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const isStaff = (role?: string | null) => role === "ADMIN" || role === "TEACHER";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { courseId, chapterId } = resolvedParams;
    
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const chapter = await db.chapter.findUnique({
      where: {
        id: chapterId,
        courseId: courseId,
      },
      include: {
        course: {
          select: {
            userId: true,
          }
        },
        userProgress: {
          where: {
            userId,
          }
        },
        attachments: {
          orderBy: {
            position: 'asc',
          },
        }
      }
    });

    if (!chapter) {
      return new NextResponse("Chapter not found", { status: 404 });
    }

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

    const chaptersWithType = chapters.map(chapter => ({ ...chapter, type: 'chapter' as const }));
    const quizzesWithType = quizzes.map(quiz => ({ ...quiz, type: 'quiz' as const }));
    const livestreamsWithType = activeLiveStreams.map(ls => ({ 
      ...ls, 
      type: 'livestream' as const, 
      position: ls.scheduledAt ? new Date(ls.scheduledAt).getTime() : 999999 
    }));

    const sortedContent = [...chaptersWithType, ...quizzesWithType, ...livestreamsWithType].sort((a, b) => a.position - b.position);

    const currentIndex = sortedContent.findIndex(content => 
      content.id === chapterId && content.type === 'chapter'
    );

    const nextContent = currentIndex !== -1 && currentIndex < sortedContent.length - 1 
      ? sortedContent[currentIndex + 1] 
      : null;
    
    const previousContent = currentIndex > 0 
      ? sortedContent[currentIndex - 1] 
      : null;

    const response = {
      ...chapter,
      nextChapterId: nextContent?.id || null,
      previousChapterId: previousContent?.id || null,
      nextContentType: nextContent?.type || null,
      previousContentType: previousContent?.type || null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[CHAPTER_ID] Detailed error:", error);
    if (error instanceof Error) {
      return new NextResponse(`Internal Error: ${error.message}\nStack: ${error.stack}`, { status: 500 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;
        const values = await req.json();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (!isStaff(user?.role)) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const course = await db.course.findUnique({
            where: {
                id: resolvedParams.courseId,
            }
        });

        if (!course) {
            return new NextResponse("Course not found", { status: 404 });
        }

        const chapter = await db.chapter.update({
            where: {
                id: resolvedParams.chapterId,
                courseId: resolvedParams.courseId,
            },
            data: {
                ...values,
            }
        });

        return NextResponse.json(chapter);
    } catch (error) {
        console.log("[CHAPTER_ID]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (!isStaff(user?.role)) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const existingChapter = await db.chapter.findUnique({
            where: {
                id: resolvedParams.chapterId,
                courseId: resolvedParams.courseId,
            }
        });

        if (!existingChapter) {
            return new NextResponse("Chapter not found", { status: 404 });
        }

        await db.chapter.delete({
            where: {
                id: resolvedParams.chapterId,
                courseId: resolvedParams.courseId,
            }
        });

        return new NextResponse("Chapter deleted successfully", { status: 200 });
    } catch (error) {
        console.error("[CHAPTER_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
