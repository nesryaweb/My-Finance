import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 }
      );
    }

    const group = await prisma.categoryGroup.update({
      where: { id },
      data: {
        name,
      },
    });

    return NextResponse.json(group);
  } catch (error) {
    console.error("Failed to update category group:", error);

    return NextResponse.json(
      { error: "Failed to update category group" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const categoryCount = await prisma.category.count({
      where: {
        groupId: id,
      },
    });

    if (categoryCount > 0) {
      return NextResponse.json(
        {
          error:
            "This group cannot be deleted because it still contains categories.",
        },
        { status: 400 },
      );
    }

    await prisma.categoryGroup.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Failed to delete group:", error);

    return NextResponse.json(
      {
        error: "Failed to delete group",
        details: error.message,
      },
      { status: 500 },
    );
  }
}