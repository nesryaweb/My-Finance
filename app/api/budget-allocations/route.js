import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export async function POST(request) {
  try {
    const user = await requireUser();

    const body = await request.json();

    const {
      budgetId,
      categoryId,
      accountId,
      amount,
    } = body;

    // ==================================================
    // VALIDATION
    // ==================================================

    if (!budgetId) {
      return NextResponse.json(
        { error: "Budget is required" },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }

    if (!accountId) {
      return NextResponse.json(
        { error: "Account is required" },
        { status: 400 }
      );
    }

    if (
      amount === undefined ||
      amount === null ||
      Number.isNaN(Number(amount)) ||
      Number(amount) < 0
    ) {
      return NextResponse.json(
        { error: "Valid amount is required" },
        { status: 400 }
      );
    }

    // ==================================================
    // VERIFY BUDGET BELONGS TO CURRENT USER
    // ==================================================

    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId: user.id,
      },
    });

    if (!budget) {
      return NextResponse.json(
        {
          error: "Budget not found.",
        },
        {
          status: 404,
        }
      );
    }

    // ==================================================
    // VERIFY ACCOUNT BELONGS TO CURRENT USER
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
        }
      );
    }

    // ==================================================
    // VERIFY CATEGORY BELONGS TO CURRENT USER
    //
    // Category itself does not have userId.
    // Its ownership comes from CategoryGroup.
    // ==================================================

    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        group: {
          userId: user.id,
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        {
          error: "Category not found.",
        },
        {
          status: 404,
        }
      );
    }

    // ==================================================
    // SAVE ALLOCATION
    // ==================================================

    const allocation =
      await prisma.budgetAllocation.upsert({
        where: {
          budgetId_categoryId_accountId: {
            budgetId,
            categoryId,
            accountId,
          },
        },

        update: {
          amount: String(amount),
        },

        create: {
          budgetId,
          categoryId,
          accountId,
          amount: String(amount),
        },
      });

    return NextResponse.json(allocation);
  } catch (error) {
    console.error(
      "Failed to save budget allocation:",
      error
    );

    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to save budget allocation",
        details: error.message,
      },
      {
        status: 500,
      }
    );
  }
}