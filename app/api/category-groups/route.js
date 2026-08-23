import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

// ======================================================
// GET ALL CATEGORY GROUPS FOR CURRENT USER
// ======================================================

export async function GET() {
  try {
    const user = await requireUser();

    const groups = await prisma.categoryGroup.findMany({
      where: {
        userId: user.id,
      },
      include: {
        categories: {
          orderBy: {
            createdAt: "asc",
          },
          include: {
            budgetAllocations: {
              include: {
                account: true,
                budget: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error("Failed to fetch category groups:", error);

    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to fetch category groups",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

// ======================================================
// CREATE CATEGORY GROUP
// ======================================================

export async function POST(request) {
  try {
    const user = await requireUser();

    const body = await request.json();

    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 }
      );
    }

    const group = await prisma.categoryGroup.create({
      data: {
        name,
        userId: user.id,
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error("Failed to create category group:", error);

    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create category group",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

// ======================================================
// UPDATE CATEGORY GROUP
// ======================================================

export async function PATCH(request, { params }) {
  try {
    const user = await requireUser();

    const { id } = await params;

    const body = await request.json();

    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // MAKE SURE GROUP BELONGS TO CURRENT USER
    // --------------------------------------------------

    const existingGroup = await prisma.categoryGroup.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingGroup) {
      return NextResponse.json(
        { error: "Category group not found" },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // UPDATE
    // --------------------------------------------------

    const group = await prisma.categoryGroup.update({
      where: {
        id,
      },
      data: {
        name,
      },
    });

    return NextResponse.json(group);
  } catch (error) {
    console.error("Failed to update category group:", error);

    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to update category group",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

// ======================================================
// DELETE CATEGORY GROUP
// ======================================================

export async function DELETE(request, { params }) {
  try {
    const user = await requireUser();

    const { id } = await params;

    // --------------------------------------------------
    // MAKE SURE GROUP BELONGS TO CURRENT USER
    // --------------------------------------------------

    const existingGroup = await prisma.categoryGroup.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingGroup) {
      return NextResponse.json(
        { error: "Category group not found" },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // DELETE
    // --------------------------------------------------

    await prisma.categoryGroup.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Failed to delete category group:", error);

    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to delete category group",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}