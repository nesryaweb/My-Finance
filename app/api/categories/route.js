import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export async function POST(request) {
  try {
    const user = await requireUser();

    const body = await request.json();

    const name = body.name?.trim();
    const groupId = body.groupId;

    // ==================================================
    // VALIDATE INPUT
    // ==================================================

    if (!name) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    if (!groupId) {
      return NextResponse.json(
        { error: "Category group is required" },
        { status: 400 }
      );
    }

    // ==================================================
    // VERIFY GROUP BELONGS TO CURRENT USER
    // ==================================================

    const group = await prisma.categoryGroup.findFirst({
      where: {
        id: groupId,
        userId: user.id,
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Category group not found" },
        { status: 404 }
      );
    }

    // ==================================================
    // CREATE CATEGORY
    // ==================================================

    const category = await prisma.category.create({
      data: {
        name,
        groupId,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Failed to create category:", error);

    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create category",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
} 