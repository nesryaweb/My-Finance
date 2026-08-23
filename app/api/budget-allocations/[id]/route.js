import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request,
  { params }
) {
  try {
    const { id } = await params;

    await prisma.budgetAllocation.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Failed to delete budget allocation:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete budget allocation",
        details: error.message,
      },
      { status: 500 }
    );
  }
}