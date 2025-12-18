import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { detectMeetingType, extractMeetingId, isValidMeetingUrl } from "@/lib/zoom";

export async function GET() {
    try {
        const { userId, user } = await auth();
        
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        if (user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const livestreams = await db.liveStream.findMany({
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
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        // Add attendance count and expiration check
        const livestreamsWithCount = livestreams.map(ls => {
            let isExpired = false;
            
            if (ls.scheduledAt) {
                const scheduledTime = new Date(ls.scheduledAt);
                const now = new Date();
                
                // Calculate end time: scheduled time + duration (in milliseconds)
                const endTime = ls.duration 
                    ? new Date(scheduledTime.getTime() + (ls.duration * 60 * 1000))
                    : scheduledTime;
                
                // Only mark as expired if the end time has passed
                isExpired = endTime < now;
            }
            
            return {
                ...ls,
                attendanceCount: ls._count.attendance,
                isExpired,
                _count: undefined
            };
        });

        return NextResponse.json(livestreamsWithCount);
    } catch (error) {
        console.log("[ADMIN_LIVESTREAMS_GET]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { userId, user } = await auth();
        const { title, description, meetingUrl, courseId, scheduledAt, duration } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Validate required fields
        if (!title || !title.trim()) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        if (!meetingUrl || !meetingUrl.trim()) {
            return NextResponse.json({ error: "Meeting URL is required" }, { status: 400 });
        }

        if (!isValidMeetingUrl(meetingUrl)) {
            return NextResponse.json({ error: "Invalid meeting URL. Please provide a valid Zoom or Google Meet URL." }, { status: 400 });
        }

        if (!courseId) {
            return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
        }

        // Verify the course exists
        const course = await db.course.findUnique({
            where: {
                id: courseId,
            }
        });

        if (!course) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        // Detect meeting type and extract meeting ID
        const meetingType = detectMeetingType(meetingUrl);
        if (!meetingType) {
            return NextResponse.json({ error: "Could not detect meeting type" }, { status: 400 });
        }

        const meetingId = extractMeetingId(meetingUrl, meetingType);
        if (!meetingId) {
            return NextResponse.json({ error: "Could not extract meeting ID" }, { status: 400 });
        }

        // Create the livestream
        const livestream = await db.liveStream.create({
            data: {
                title,
                description: description || null,
                meetingUrl,
                meetingId,
                meetingType,
                courseId,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                duration: duration ? parseInt(duration) : null,
                isPublished: false
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
            ...livestream,
            attendanceCount: livestream._count.attendance,
            _count: undefined
        });
    } catch (error) {
        console.log("[ADMIN_LIVESTREAMS_POST]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

