import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ livestreamId: string }> }
) {
    try {
        const resolvedParams = await params;
        const { userId, user } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const livestream = await db.liveStream.findUnique({
            where: {
                id: resolvedParams.livestreamId
            }
        });

        if (!livestream) {
            return NextResponse.json({ error: "Livestream not found" }, { status: 404 });
        }

        const updatedLivestream = await db.liveStream.update({
            where: {
                id: resolvedParams.livestreamId
            },
            data: {
                isPublished: !livestream.isPublished
            },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                _count: {
                    select: {
                        attendance: true
                    }
                }
            }
        });

        return NextResponse.json({
            ...updatedLivestream,
            attendanceCount: updatedLivestream._count.attendance,
            _count: undefined
        });
    } catch (error) {
        console.log("[ADMIN_LIVESTREAM_PUBLISH]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

