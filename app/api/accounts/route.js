import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

// ======================================================
// GET ALL ACCOUNTS
// ======================================================

export async function GET() {
  try {
    const user = await requireUser();

    const accounts = await prisma.account.findMany({
      where: {
        userId: user.id,
      },

      orderBy: {
        createdAt: "asc",
      },

      include: {
        incomeAllocations: true,
        transactions: true,
      },
    });

    const accountsWithBalance = accounts.map(
      (account) => {
        // ------------------------------------------------
        // TOTAL INCOME ALLOCATED TO THIS ACCOUNT
        // ------------------------------------------------

        const allocated =
          account.incomeAllocations.reduce(
            (total, allocation) => {
              return (
                total +
                Number(
                  allocation.amount || 0,
                )
              );
            },
            0,
          );

        // ------------------------------------------------
        // TOTAL MONEY RECEIVED FROM DEBT
        // ------------------------------------------------

        const debtReceived =
          account.transactions.reduce(
            (total, transaction) => {
              if (
                transaction.type ===
                "DEBT_RECEIVED"
              ) {
                return (
                  total +
                  Number(
                    transaction.amount || 0,
                  )
                );
              }

              return total;
            },
            0,
          );

        // ------------------------------------------------
        // TOTAL EXPENSES FROM THIS ACCOUNT
        // ------------------------------------------------

        const expenses =
          account.transactions.reduce(
            (total, transaction) => {
              if (
                transaction.type ===
                  "EXPENSE" ||
                transaction.type ===
                  "GOAL_CONTRIBUTION"
              ) {
                return (
                  total +
                  Number(
                    transaction.amount || 0,
                  )
                );
              }

              return total;
            },
            0,
          );

        // ------------------------------------------------
        // CURRENT ACCOUNT BALANCE
        // ------------------------------------------------

        const balance =
          allocated +
          debtReceived -
          expenses;

        return {
          id: account.id,

          name: account.name,

          type: account.type,

          allocated,

          debtReceived,

          expenses,

          balance,

          createdAt:
            account.createdAt,

          updatedAt:
            account.updatedAt,
        };
      },
    );

    return NextResponse.json(
      accountsWithBalance,
    );
  } catch (error) {
    console.error(
      "Failed to fetch accounts:",
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
          "Failed to fetch accounts.",
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

// ======================================================
// CREATE ACCOUNT
// ======================================================

export async function POST(request) {
  try {
    const user = await requireUser();

    const body =
      await request.json();

    const name =
      body.name?.trim();

    const type =
      body.type?.trim() ||
      null;

    // --------------------------------------------------
    // VALIDATE NAME
    // --------------------------------------------------

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Account name is required.",
        },
        {
          status: 400,
        },
      );
    }

    // --------------------------------------------------
    // CREATE ACCOUNT FOR CURRENT USER
    // --------------------------------------------------

    const account =
      await prisma.account.create({
        data: {
          name,

          type,

          userId: user.id,
        },
      });

    return NextResponse.json(
      {
        id: account.id,

        name: account.name,

        type: account.type,

        allocated: 0,

        debtReceived: 0,

        expenses: 0,

        balance: 0,

        createdAt:
          account.createdAt,

        updatedAt:
          account.updatedAt,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Failed to create account:",
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
          "Failed to create account.",
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