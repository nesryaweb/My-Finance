import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

// ======================================================
// POST ALLOCATION
// ======================================================

export async function POST(request, { params }) {
  try {
    const user = await requireUser();

    const { id: incomeId } = await params;

    // ==================================================
    // READ REQUEST BODY
    // ==================================================

    const body = await request.json();

    const accountId = body.accountId;
    const amount = Number(body.amount);

    // ==================================================
    // VALIDATION
    // ==================================================

    if (!accountId) {
      return NextResponse.json(
        {
          error: "Account is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          error: "Allocation amount must be greater than 0.",
        },
        {
          status: 400,
        },
      );
    }

    // ==================================================
    // FIND INCOME
    //
    // IMPORTANT:
    // Only allow the logged-in user to allocate
    // their own income.
    // ==================================================

    const income = await prisma.income.findFirst({
      where: {
        id: incomeId,
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
    // CALCULATE ALREADY ALLOCATED
    // ==================================================

    const totalAllocated = income.allocations.reduce(
      (total, allocation) =>
        total + Number(allocation.amount || 0),
      0,
    );

    // ==================================================
    // CALCULATE REMAINING INCOME
    // ==================================================

    const remaining = Number(income.amount || 0) - totalAllocated;

    // ==================================================
    // MAKE SURE ALLOCATION DOES NOT EXCEED
    // REMAINING INCOME
    // ==================================================

    if (amount > remaining) {
      return NextResponse.json(
        {
          error: `Only ${remaining.toLocaleString()} birr is available from this income.`,
        },
        {
          status: 400,
        },
      );
    }

    // ==================================================
    // FIND ACCOUNT
    //
    // IMPORTANT:
    // Only allow allocation into an account belonging
    // to the logged-in user.
    // ==================================================

    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId: user.id,
      },
    });

    if (!account) {
      return NextResponse.json(
        {
          error: "Account not found.",
        },
        {
          status: 404,
        },
      );
    }

    // ==================================================
    // CREATE ALLOCATION
    // ==================================================

    const allocation = await prisma.incomeAllocation.create({
      data: {
        incomeId,
        accountId,
        amount,
      },

      include: {
        account: true,
      },
    });

    // ==================================================
    // RESPONSE
    // ==================================================

    return NextResponse.json(
      {
        success: true,

        allocation,

        totalAllocated: totalAllocated + amount,

        remaining: remaining - amount,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("Failed to allocate income:", error);

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
        error: "Failed to allocate income.",
        details: error?.message || "Unknown error",
      },
      {
        status: 500,
      },
    );
  }
}

// ======================================================
// DELETE INCOME
// ======================================================

export async function DELETE(request, { params }) {
  try {
    const user = await requireUser();

    const { id: incomeId } = await params;

    // ==================================================
    // FIND INCOME
    //
    // IMPORTANT:
    // Only allow the logged-in user to delete
    // their own income.
    // ==================================================

    const income = await prisma.income.findFirst({
      where: {
        id: incomeId,
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
    // IncomeAllocation is deleted automatically because
    // the Prisma relation uses onDelete: Cascade.
    // ==================================================

    await prisma.income.delete({
      where: {
        id: incomeId,
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
