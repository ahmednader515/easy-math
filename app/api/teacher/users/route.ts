import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        console.log("[TEACHER_USERS_GET] Session:", { userId: session?.user?.id, role: session?.user?.role });

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "TEACHER") {
            console.log("[TEACHER_USERS_GET] Access denied:", { userId: session.user.id, role: session.user.role });
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Get query parameters
        const searchParams = req.nextUrl.searchParams;
        const roleFilter = searchParams.get("role"); // "STAFF" or "USER" or null (all)
        const searchTerm = searchParams.get("search") || "";
        const skip = parseInt(searchParams.get("skip") || "0", 10);
        const take = parseInt(searchParams.get("take") || "25", 10);

        // Build where clause based on role filter and search
        let whereClause: any = {};
        if (roleFilter === "STAFF") {
            // Fetch all staff (teachers and admins) without pagination
            whereClause = {
                role: {
                    in: ["TEACHER", "ADMIN"]
                }
            };
        } else if (roleFilter === "USER") {
            // Fetch students with pagination
            whereClause = {
                role: "USER"
            };
        } else {
            // Default: all users (for backward compatibility)
            whereClause = {
                role: {
                    in: ["USER", "TEACHER", "ADMIN"]
                }
            };
        }

        // Add search filter if provided
        if (searchTerm) {
            whereClause = {
                ...whereClause,
                OR: [
                    {
                        fullName: {
                            contains: searchTerm,
                            mode: "insensitive"
                        }
                    },
                    {
                        phoneNumber: {
                            contains: searchTerm
                        }
                    }
                ]
            };
        }

        // If fetching staff, don't paginate (load all)
        // If searching, don't paginate (show all results)
        const shouldPaginate = roleFilter !== "STAFF" && !searchTerm;
        
        const [users, totalCount] = await Promise.all([
            db.user.findMany({
                where: whereClause,
                select: {
                    id: true,
                    fullName: true,
                    phoneNumber: true,
                    parentPhoneNumber: true,
                    role: true,
                    balance: true,
                    grade: true,
                    division: true,
                    studyType: true,
                    governorate: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: {
                            courses: true,
                            purchases: true,
                            userProgress: true
                        }
                    }
                },
                orderBy: {
                    createdAt: "desc"
                },
                ...(shouldPaginate && { skip, take })
            }),
            db.user.count({
                where: whereClause
            })
        ]);

        console.log("[TEACHER_USERS_GET] Found users:", users.length, "of", totalCount, `(roleFilter: ${roleFilter})`);
        console.log("[TEACHER_USERS_GET] Users by role:", {
            USER: users.filter(u => u.role === "USER").length,
            TEACHER: users.filter(u => u.role === "TEACHER").length,
            ADMIN: users.filter(u => u.role === "ADMIN").length
        });
        
        return NextResponse.json({
            users,
            totalCount,
            hasMore: shouldPaginate ? skip + take < totalCount : false
        });
    } catch (error) {
        console.error("[TEACHER_USERS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
