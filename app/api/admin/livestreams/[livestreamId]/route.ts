import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { detectMeetingType, extractMeetingId, isValidMeetingUrl } from "@/lib/zoom";

export async function GET(
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

        if (!livestream) {
            return NextResponse.json({ error: "Livestream not found" }, { status: 404 });
        }

        return NextResponse.json({
            ...livestream,
            attendanceCount: livestream._count.attendance,
            _count: undefined
        });
    } catch (error) {
        console.log("[ADMIN_LIVESTREAM_GET]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ livestreamId: string }> }
) {
    try {
        const resolvedParams = await params;
        const { userId, user } = await auth();
        const { title, description, meetingUrl, scheduledAt, duration } = await req.json();

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

        // Build update data
        const updateData: any = {};
        
        if (title !== undefined) {
            if (!title || !title.trim()) {
                return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
            }
            updateData.title = title;
        }

        if (description !== undefined) {
            updateData.description = description || null;
        }

        if (meetingUrl !== undefined) {
            if (!meetingUrl || !meetingUrl.trim()) {
                return NextResponse.json({ error: "Meeting URL cannot be empty" }, { status: 400 });
            }

            if (!isValidMeetingUrl(meetingUrl)) {
                return NextResponse.json({ error: "Invalid meeting URL. Please provide a valid Zoom or Google Meet URL." }, { status: 400 });
            }

            const meetingType = detectMeetingType(meetingUrl);
            if (!meetingType) {
                return NextResponse.json({ error: "Could not detect meeting type" }, { status: 400 });
            }

            const meetingId = extractMeetingId(meetingUrl, meetingType);
            if (!meetingId) {
                return NextResponse.json({ error: "Could not extract meeting ID" }, { status: 400 });
            }

            updateData.meetingUrl = meetingUrl;
            updateData.meetingId = meetingId;
            updateData.meetingType = meetingType;
        }

        if (scheduledAt !== undefined) {
            updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
        }

        if (duration !== undefined) {
            updateData.duration = duration ? parseInt(duration) : null;
        }

        const updatedLivestream = await db.liveStream.update({
            where: {
                id: resolvedParams.livestreamId
            },
            data: updateData,
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
        console.log("[ADMIN_LIVESTREAM_PATCH]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function DELETE(
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

        await db.liveStream.delete({
            where: {
                id: resolvedParams.livestreamId
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.log("[ADMIN_LIVESTREAM_DELETE]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

