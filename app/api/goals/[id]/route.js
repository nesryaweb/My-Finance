import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
// ======================================================
// UPDATE GOAL
// ======================================================

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;

    const body = await request.json();

    const name = body.name?.trim();
    const targetAmount = Number(body.targetAmount);
    const deadline = body.deadline ? new Date(body.deadline) : null;
    const user = await requireUser();
    const goal = await prisma.financialGoal.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        contributions: true,
      },
    });
    // --------------------------------------------------
    // VALIDATE NAME
    // --------------------------------------------------

    if (!name) {
      return NextResponse.json(
        {
          error: "Goal name is required.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // VALIDATE TARGET
    // --------------------------------------------------

    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      return NextResponse.json(
        {
          error: "Target amount must be greater than 0.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // VALIDATE DEADLINE
    // --------------------------------------------------

    if (deadline && Number.isNaN(deadline.getTime())) {
      return NextResponse.json(
        {
          error: "Invalid deadline.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // FIND GOAL
    // --------------------------------------------------

    if (!goal) {
      return NextResponse.json(
        {
          error: "Financial goal not found.",
        },
        { status: 404 },
      );
    }

    // --------------------------------------------------
    // CURRENT SAVED AMOUNT
    // --------------------------------------------------

    const savedAmount = goal.contributions.reduce(
      (total, contribution) => total + Number(contribution.amount || 0),
      0,
    );

    // --------------------------------------------------
    // TARGET CANNOT BE BELOW SAVED AMOUNT
    // --------------------------------------------------

    if (targetAmount < savedAmount) {
      return NextResponse.json(
        {
          error: `Target amount cannot be less than the amount already saved (${savedAmount.toLocaleString()} birr).`,
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // CALCULATE STATUS
    // --------------------------------------------------

    const status = savedAmount >= targetAmount ? "COMPLETED" : "ACTIVE";

    // --------------------------------------------------
    // UPDATE
    // --------------------------------------------------

    const updatedGoal = await prisma.financialGoal.update({
      where: {
        id,
      },
      data: {
        name,
        targetAmount: String(targetAmount),
        deadline,
        status,
      },
      include: {
        contributions: {
          include: {
            account: true,
            transaction: true,
          },
          orderBy: {
            date: "desc",
          },
        },
      },
    });

    // --------------------------------------------------
    // CALCULATE RESPONSE VALUES
    // --------------------------------------------------

    const remainingAmount = Math.max(targetAmount - savedAmount, 0);

    const progress =
      targetAmount > 0 ? Math.min((savedAmount / targetAmount) * 100, 100) : 0;

    return NextResponse.json({
      ...updatedGoal,
      savedAmount,
      remainingAmount,
      progress,
    });
  } catch (error) {
    console.error("Failed to update financial goal:", error);

    return NextResponse.json(
      {
        error: "Failed to update financial goal.",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

// ======================================================
// DELETE GOAL
// ======================================================

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const user = await requireUser();

    const existingGoal = await prisma.financialGoal.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        contributions: true,
      },
    });

    if (!existingGoal) {
      return NextResponse.json(
        {
          error: "Financial goal not found.",
        },
        {
          status: 404,
        },
      );
    }

    // Don't allow deleting a goal that already
    // has money contributed to it.
    if (existingGoal.contributions.length > 0) {
      return NextResponse.json(
        {
          error:
            "This goal has contributions. Remove the contributions before deleting the goal.",
        },
        {
          status: 400,
        },
      );
    }

    await prisma.financialGoal.delete({
      where: {
        id,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Failed to delete financial goal:", error);

    return NextResponse.json(
      {
        error: "Failed to delete financial goal.",
        details: error.message,
      },
      {
        status: 500,
      },
    );
  }
}
