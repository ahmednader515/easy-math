import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST bulk delete/deactivate promocodes
export async function POST(req: NextRequest) {
    try {
        const { userId, user } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Only teachers and admins can delete promocodes
        if (user?.role !== "TEACHER" && user?.role !== "ADMIN") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const body = await req.json();
        const { ids, action } = body; // action: "delete", "deactivate", or "activate"

        if (!Array.isArray(ids) || ids.length === 0) {
            return new NextResponse(
                JSON.stringify({ error: "يجب تحديد الأكواد المراد حذفها" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        if (action !== "delete" && action !== "deactivate" && action !== "activate") {
            return new NextResponse(
                JSON.stringify({ error: "الإجراء غير صحيح" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Check if promoCode exists on db object
        if (!db.promoCode) {
            console.error("[PROMOCODES_BULK] db.promoCode is undefined");
            return new NextResponse(
                JSON.stringify({ error: "Database model not available. Please restart the server." }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        if (action === "delete") {
            // Delete completely from database
            await db.promoCode.deleteMany({
                where: {
                    id: {
                        in: ids,
                    },
                },
            });

            return NextResponse.json({
                success: true,
                message: `تم حذف ${ids.length} كود بنجاح`,
                count: ids.length,
            });
        } else if (action === "deactivate") {
            // Deactivate (set isActive to false)
            await db.promoCode.updateMany({
                where: {
                    id: {
                        in: ids,
                    },
                },
                data: {
                    isActive: false,
                },
            });

            return NextResponse.json({
                success: true,
                message: `تم إزالة ${ids.length} كود من القائمة بنجاح`,
                count: ids.length,
            });
        } else {
            // Activate (set isActive to true)
            await db.promoCode.updateMany({
                where: {
                    id: {
                        in: ids,
                    },
                },
                data: {
                    isActive: true,
                },
            });

            return NextResponse.json({
                success: true,
                message: `تم تفعيل ${ids.length} كود بنجاح`,
                count: ids.length,
            });
        }
    } catch (error) {
        console.error("[PROMOCODES_BULK]", error);
        if (error instanceof Error) {
            return new NextResponse(
                JSON.stringify({ error: error.message }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
        return new NextResponse("Internal Error", { status: 500 });
    }
}

