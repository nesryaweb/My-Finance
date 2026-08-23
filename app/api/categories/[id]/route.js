import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const name = body.name?.trim();
    const groupId = body.groupId;

    if (!name) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 },
      );
    }

    if (!groupId) {
      return NextResponse.json(
        { error: "Category group is required" },
        { status: 400 },
      );
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        groupId,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Failed to update category:", error);

    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 },
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    // Check whether this category is used by transactions
    const transactionCount = await prisma.transaction.count({
      where: {
        categoryId: id,
      },
    });

    if (transactionCount > 0) {
      return NextResponse.json(
        {
          error:
            "This category cannot be deleted because it is used by existing transactions.",
        },
        { status: 400 },
      );
    }

    // No transactions, so remove any budget allocations
    // connected to this category first.
    await prisma.budgetAllocation.deleteMany({
      where: {
        categoryId: id,
      },
    });

    // Now delete the category
    await prisma.category.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Failed to delete category:", error);

    return NextResponse.json(
      {
        error: "Failed to delete category",
        details: error.message,
      },
      { status: 500 },
    );
  }
}