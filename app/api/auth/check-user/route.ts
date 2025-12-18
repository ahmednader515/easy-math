import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { phoneNumber } = await req.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { exists: false },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: {
        phoneNumber: phoneNumber,
      },
      select: {
        id: true,
        hashedPassword: true,
      },
    });

    return NextResponse.json({
      exists: !!user,
      hasPassword: !!user?.hashedPassword,
    });
  } catch (error) {
    console.error("Error checking user:", error);
    return NextResponse.json(
      { exists: false },
      { status: 500 }
    );
  }
}

