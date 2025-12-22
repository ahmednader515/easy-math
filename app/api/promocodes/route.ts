import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET all promocodes - for teachers and admins
export async function GET(req: NextRequest) {
    try {
        const { userId, user } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Only teachers and admins can access promocodes
        if (user?.role !== "TEACHER" && user?.role !== "ADMIN") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Check if promoCode exists on db object
        if (!db.promoCode) {
            console.error("[PROMOCODES_GET] db.promoCode is undefined. Available models:", Object.keys(db).filter(key => !key.startsWith('$')));
            return new NextResponse(
                JSON.stringify({ error: "Database model not available. Please restart the server." }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        const promocodes = await db.promoCode.findMany({
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json(promocodes);
    } catch (error) {
        console.error("[PROMOCODES_GET] Error details:", error);
        if (error instanceof Error) {
            console.error("[PROMOCODES_GET] Error message:", error.message);
            console.error("[PROMOCODES_GET] Error stack:", error.stack);
            return new NextResponse(
                JSON.stringify({ error: error.message }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// Generate a unique promo code
function generatePromoCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing characters like 0, O, I, 1
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// POST create new promocodes - for teachers and admins
export async function POST(req: NextRequest) {
    try {
        const { userId, user } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Only teachers and admins can create promocodes
        if (user?.role !== "TEACHER" && user?.role !== "ADMIN") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const body = await req.json();
        const { courseId, numberOfCodes } = body;

        // Validate required fields
        if (!courseId) {
            return new NextResponse(
                JSON.stringify({ error: "الكورس مطلوب" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        if (!numberOfCodes || numberOfCodes < 1 || numberOfCodes > 100) {
            return new NextResponse(
                JSON.stringify({ error: "عدد الأكواد يجب أن يكون بين 1 و 100" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Check if course exists
        const course = await db.course.findUnique({
            where: { id: courseId },
        });

        if (!course) {
            return new NextResponse(
                JSON.stringify({ error: "الكورس غير موجود" }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            );
        }

        // Check if promoCode exists on db object
        if (!db.promoCode) {
            console.error("[PROMOCODES_POST] db.promoCode is undefined. Available models:", Object.keys(db).filter(key => !key.startsWith('$')));
            return new NextResponse(
                JSON.stringify({ error: "Database model not available. Please restart the server." }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        // Generate unique codes
        const codesToCreate: string[] = [];
        let attempts = 0;
        const maxAttempts = numberOfCodes * 10; // Prevent infinite loop

        while (codesToCreate.length < numberOfCodes && attempts < maxAttempts) {
            attempts++;
            const newCode = generatePromoCode();
            
            // Check if code already exists
            const existingCode = await db.promoCode.findUnique({
                where: { code: newCode },
            });

            if (!existingCode && !codesToCreate.includes(newCode)) {
                codesToCreate.push(newCode);
            }
        }

        if (codesToCreate.length < numberOfCodes) {
            return new NextResponse(
                JSON.stringify({ error: "فشل في إنشاء العدد المطلوب من الأكواد. يرجى المحاولة مرة أخرى." }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        // Create all promocodes in a transaction
        const createdPromocodes = await db.$transaction(
            codesToCreate.map(code =>
                db.promoCode.create({
                    data: {
                        code,
                        courseId,
                        discountType: "PERCENTAGE",
                        discountValue: 100, // 100% discount
                        usageLimit: 1, // Each code can be used once
                        isActive: true,
                    },
                })
            )
        );

        return NextResponse.json({
            success: true,
            count: createdPromocodes.length,
            codes: createdPromocodes.map(pc => pc.code),
        });
    } catch (error) {
        console.error("[PROMOCODES_POST]", error);
        if (error instanceof Error) {
            return new NextResponse(
                JSON.stringify({ error: error.message }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
        return new NextResponse("Internal Error", { status: 500 });
    }
}
