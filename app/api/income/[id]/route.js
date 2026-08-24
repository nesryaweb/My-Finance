import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

// ======================================================
// DELETE INCOME
// ======================================================

export async function DELETE(request, { params }) {
  try {
    const user = await requireUser();

    const { id } = await params;

    // ==================================================
    // FIND INCOME
    //
    // IMPORTANT:
    // Only allow the logged-in user to delete
    // their own income.
    // ==================================================

    const income = await prisma.income.findFirst({
      where: {
        id,
        userId: user.id,
      },

      include: {
        allocations: true,
      },
    });

    if (!income) {
      return NextResponse.json(
        {
          error: "Income not found.",
        },
        {
          status: 404,
        },
      );
    }

    // ==================================================
    // DELETE INCOME
    //
    // IncomeAllocation has:
    //
    // income Income @relation(
    //   ...,
    //   onDelete: Cascade
    // )
    //
    // Therefore its allocations will also be deleted.
    // ==================================================

    await prisma.income.delete({
      where: {
        id: income.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Income deleted successfully.",
    });
  } catch (error) {
    console.error("Failed to delete income:", error);

    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to delete income.",
        details: error?.message || "Unknown error",
      },
      {
        status: 500,
      },
    );
  }
}