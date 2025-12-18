import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
    try {
        const { userId, user } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only allow regular users (students) to update their own profile
        if (user?.role !== "USER") {
            return NextResponse.json({ error: "Only students can update their grade and division" }, { status: 403 });
        }

        const { grade, division } = await req.json();

        // Validate grade
        const validGrades = [
            "الأول الثانوي",
            "الثاني الثانوي",
            "الثالث الثانوي",
            "الأول الاعدادي",
            "الثاني الاعدادي",
            "الثالث الاعدادي"
        ];

        if (grade && !validGrades.includes(grade)) {
            return NextResponse.json({ error: "Invalid grade" }, { status: 400 });
        }

        // Validate division - all grades have the same division options
        if (grade && division) {
            const validDivisions = ["بكالوريا", "عام"];
            
            if (!validDivisions.includes(division)) {
                return NextResponse.json({ error: "Invalid division. Must be 'بكالوريا' or 'عام'" }, { status: 400 });
            }
        }

        // Update user profile
        const updatedUser = await db.user.update({
            where: {
                id: userId
            },
            data: {
                ...(grade !== undefined && { grade: grade || null }),
                ...(division !== undefined && { division: division || null })
            },
            select: {
                id: true,
                fullName: true,
                grade: true,
                division: true
            }
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.log("[USER_PROFILE_PATCH]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await db.user.findUnique({
            where: {
                id: userId
            },
            select: {
                id: true,
                fullName: true,
                grade: true,
                division: true,
                role: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.log("[USER_PROFILE_GET]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

