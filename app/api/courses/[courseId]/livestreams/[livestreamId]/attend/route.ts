import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(
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

        // Verify the livestream exists and user has access
        const livestream = await db.liveStream.findUnique({
            where: {
                id: livestreamId,
                courseId: courseId,
                isPublished: true
            },
            include: {
                course: {
                    select: {
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

        // Check access
        const hasAccess = livestream.course.price === 0 || livestream.course.purchases.length > 0;

        if (!hasAccess) {
            return new NextResponse("Access denied", { status: 403 });
        }

        // Check if attendance already exists
        const existingAttendance = await db.liveStreamAttendance.findUnique({
            where: {
                liveStreamId_studentId: {
                    liveStreamId,
                    studentId: userId
                }
            }
        });

        if (existingAttendance) {
            // Update the clickedAt timestamp
            await db.liveStreamAttendance.update({
                where: {
                    id: existingAttendance.id
                },
                data: {
                    clickedAt: new Date()
                }
            });
        } else {
            // Create new attendance record
            await db.liveStreamAttendance.create({
                data: {
                    liveStreamId,
                    studentId: userId
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[COURSE_LIVESTREAM_ATTEND]", error);
        
        // Provide more detailed error information
        if (error instanceof Error) {
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
            
            // Check if it's a Prisma error
            if (error.message.includes("Unknown model") || error.message.includes("does not exist")) {
                return NextResponse.json({ 
                    error: "Database models not found. Please run 'npx prisma generate' and restart the server." 
                }, { status: 500 });
            }
        }
        
        return NextResponse.json({ 
            error: "Internal Error",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}

