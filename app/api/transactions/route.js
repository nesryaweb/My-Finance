import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

// ======================================================
// GET TRANSACTIONS
// Supports filtering + pagination
// ======================================================

export async function GET(request) {
  try {
    const user = await requireUser();

    const { searchParams } = new URL(request.url);

    const page = Math.max(Number(searchParams.get("page")) || 1, 1);

    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 20, 1),
      100,
    );

    const skip = (page - 1) * limit;

    // ==================================================
    // ONLY GET TRANSACTIONS BELONGING TO CURRENT USER
    // ==================================================

    const where = {
      userId: user.id,
    };

    const transactions = await prisma.transaction.findMany({
      where,

      include: {
        account: true,

        category: {
          include: {
            group: true,
          },
        },
      },

      orderBy: {
        date: "desc",
      },

      skip,
      take: limit,
    });

    const totalTransactions =
      await prisma.transaction.count({
        where,
      });

    const totalPages = Math.ceil(
      totalTransactions / limit,
    );

    return NextResponse.json({
      transactions,

      pagination: {
        page,
        limit,
        totalTransactions,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error(
      "Failed to fetch transactions:",
      error,
    );

    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to fetch transactions",
        details:
          error?.message || "Unknown error",
      },
      {
        status: 500,
      },
    );
  }
}

// ======================================================
// CREATE EXPENSE
// ======================================================

export async function POST(request) {
  try {
    const user = await requireUser();

    const body = await request.json();

    const {
      amount,
      accountId,
      categoryId,
      note,
      date,
    } = body;

    // --------------------------------------------------
    // VALIDATE AMOUNT
    // --------------------------------------------------

    if (
      amount === undefined ||
      amount === null ||
      amount === "" ||
      Number(amount) <= 0
    ) {
      return NextResponse.json(
        {
          error: "Amount must be greater than 0.",
        },
        {
          status: 400,
        },
      );
    }

    const expenseAmount = Number(amount);

    // --------------------------------------------------
    // VALIDATE ACCOUNT
    // --------------------------------------------------

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

    // --------------------------------------------------
    // VALIDATE CATEGORY
    // --------------------------------------------------

    if (!categoryId) {
      return NextResponse.json(
        {
          error: "Category is required.",
        },
        {
          status: 400,
        },
      );
    }

    // ==================================================
    // FIND ACCOUNT BELONGING TO CURRENT USER
    // ==================================================

    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId: user.id,
      },

      include: {
        incomeAllocations: true,
        transactions: true,
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
    // FIND CATEGORY BELONGING TO CURRENT USER
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
        },
      );
    }

    // --------------------------------------------------
    // CALCULATE ALLOCATED MONEY
    // --------------------------------------------------

    const allocated =
      account.incomeAllocations.reduce(
        (total, allocation) => {
          return (
            total +
            Number(allocation.amount || 0)
          );
        },
        0,
      );

    // --------------------------------------------------
    // CALCULATE EXPENSES
    // --------------------------------------------------

    const expenses =
      account.transactions.reduce(
        (total, transaction) => {
          if (
            transaction.type === "EXPENSE" ||
            transaction.type ===
              "GOAL_CONTRIBUTION"
          ) {
            return (
              total +
              Number(transaction.amount || 0)
            );
          }

          return total;
        },
        0,
      );

    // --------------------------------------------------
    // CURRENT ACCOUNT BALANCE
    // --------------------------------------------------

    const availableBalance =
      allocated - expenses;

    // --------------------------------------------------
    // CHECK AVAILABLE MONEY
    // --------------------------------------------------

    if (
      expenseAmount >
      availableBalance
    ) {
      return NextResponse.json(
        {
          error: `Not enough money in this account. Available balance: ${availableBalance.toLocaleString()} birr.`,
        },
        {
          status: 400,
        },
      );
    }

    // ==================================================
    // CREATE EXPENSE FOR CURRENT USER
    // ==================================================

    const transaction =
      await prisma.transaction.create({
        data: {
          amount: String(expenseAmount),

          type: "EXPENSE",

          note:
            note?.trim() || null,

          date: date
            ? new Date(date)
            : new Date(),

          userId: user.id,

          accountId,

          categoryId,
        },

        include: {
          account: true,

          category: {
            include: {
              group: true,
            },
          },
        },
      });

    return NextResponse.json(
      transaction,
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Failed to create transaction:",
      error,
    );

    if (
      error?.message ===
      "UNAUTHORIZED"
    ) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    return NextResponse.json(
      {
        error:
          "Failed to create expense.",
        details:
          error?.message ||
          "Unknown error",
      },
      {
        status: 500,
      },
    );
  }
}