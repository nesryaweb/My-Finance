import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

// ======================================================
// GET ALL FINANCIAL GOALS
// ======================================================

export async function GET() {
  try {
    const user = await requireUser();

    const goals = await prisma.financialGoal.findMany({
      where: {
        userId: user.id,
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

      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedGoals = goals.map((goal) => {
      const targetAmount = Number(goal.targetAmount);

      const savedAmount = goal.contributions.reduce((total, contribution) => {
        return total + Number(contribution.amount);
      }, 0);

      const remainingAmount = Math.max(targetAmount - savedAmount, 0);

      const progress =
        targetAmount > 0
          ? Math.min((savedAmount / targetAmount) * 100, 100)
          : 0;

      return {
        ...goal,
        targetAmount,
        savedAmount,
        remainingAmount,
        progress,
      };
    });

    return NextResponse.json(formattedGoals);
  } catch (error) {
    console.error("Failed to fetch financial goals:", error);

    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: "Failed to fetch financial goals.",
        details: error?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// CREATE FINANCIAL GOAL
// ======================================================

export async function POST(request) {
  try {
    const user = await requireUser();

    const body = await request.json();

    const { name, targetAmount, deadline } = body;

    // --------------------------------------------------
    // VALIDATE NAME
    // --------------------------------------------------

    if (!name || !name.trim()) {
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

    if (
      targetAmount === undefined ||
      targetAmount === null ||
      targetAmount === "" ||
      Number(targetAmount) <= 0
    ) {
      return NextResponse.json(
        {
          error: "Target amount must be greater than 0.",
        },
        { status: 400 },
      );
    }

    const amount = Number(targetAmount);

    // --------------------------------------------------
    // CREATE GOAL FOR CURRENT USER
    // --------------------------------------------------

    const goal = await prisma.financialGoal.create({
      data: {
        name: name.trim(),
        targetAmount: String(amount),
        deadline: deadline ? new Date(deadline) : null,
        userId: user.id,
      },
    });

    return NextResponse.json(
      {
        ...goal,
        targetAmount: Number(goal.targetAmount),
        savedAmount: 0,
        remainingAmount: amount,
        progress: 0,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create financial goal:", error);

    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: "Failed to create financial goal.",
        details: error?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
