import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export async function GET(request) {
  try {
    const user = await requireUser();

    const { searchParams } = new URL(request.url);

    const month = Number(searchParams.get("month"));
    const year = Number(searchParams.get("year"));

    if (!month || !year) {
      return NextResponse.json(
        {
          error: "Month and year are required",
        },
        {
          status: 400,
        }
      );
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // ==================================================
    // BUDGET
    // ==================================================

    const budget = await prisma.budget.findFirst({
      where: {
        month,
        year,
        userId: user.id,
      },

      include: {
        allocations: {
          include: {
            category: true,
            account: true,
          },

          orderBy: [
            {
              createdAt: "asc",
            },
            {
              id: "asc",
            },
          ],
        },
      },
    });

    if (!budget) {
      return NextResponse.json({
        budget: null,
        categories: [],
      });
    }

    // ==================================================
    // ACCOUNTS
    //
    // ONLY CURRENT USER'S ACCOUNTS
    // ==================================================

    const accounts = await prisma.account.findMany({
      where: {
        userId: user.id,
      },

      include: {
        incomeAllocations: true,

        transactions: {
          where: {
            type: {
              in: ["EXPENSE", "GOAL_CONTRIBUTION"],
            },
          },
        },
      },
    });

    // ==================================================
    // CALCULATE CURRENT AVAILABLE MONEY
    // FOR EACH ACCOUNT
    // ==================================================

    const accountBalances = new Map();

    for (const account of accounts) {
      // ------------------------------------------------
      // TOTAL INCOME ASSIGNED TO THIS ACCOUNT
      // ------------------------------------------------

      const allocatedIncome =
        account.incomeAllocations.reduce(
          (total, allocation) => {
            return (
              total +
              Number(allocation.amount || 0)
            );
          },
          0
        );

      // ------------------------------------------------
      // MONEY THAT HAS LEFT THIS ACCOUNT
      // ------------------------------------------------

      const moneyOut =
        account.transactions.reduce(
          (total, transaction) => {
            return (
              total +
              Number(transaction.amount || 0)
            );
          },
          0
        );

      const balance =
        allocatedIncome - moneyOut;

      accountBalances.set(
        account.id,
        Math.max(balance, 0)
      );
    }

    // ==================================================
    // THIS USER'S MONTHLY EXPENSES
    // ==================================================

    const transactions =
      await prisma.transaction.findMany({
        where: {
          userId: user.id,

          type: "EXPENSE",

          date: {
            gte: startDate,
            lt: endDate,
          },
        },

        include: {
          category: true,
          account: true,
        },
      });

    // ==================================================
    // CALCULATE BUDGET + FUNDING
    // ==================================================

    const categories =
      budget.allocations.map(
        (allocation) => {
          const budgeted =
            Number(
              allocation.amount || 0
            );

          // ==============================================
          // MONEY ALREADY SPENT FOR THIS CATEGORY
          // ==============================================

          const spent =
            transactions
              .filter(
                (transaction) =>
                  transaction.categoryId ===
                    allocation.categoryId &&
                  transaction.accountId ===
                    allocation.accountId
              )
              .reduce(
                (total, transaction) =>
                  total +
                  Number(
                    transaction.amount || 0
                  ),
                0
              );

          // ==============================================
          // CURRENT MONEY AVAILABLE IN THIS ACCOUNT
          // ==============================================

          const accountAvailable =
            accountBalances.get(
              allocation.accountId
            ) || 0;

          // ==============================================
          // FUND THIS BUDGET ALLOCATION
          // ==============================================

          const fundedAmount =
            Math.min(
              budgeted,
              accountAvailable
            );

          // ==============================================
          // AMOUNT STILL WITHOUT FUNDING
          // ==============================================

          const unfundedAmount =
            Math.max(
              budgeted -
                fundedAmount,
              0
            );

          // ==============================================
          // FUNDING STATUS
          // ==============================================

          let fundingStatus =
            "not_funded";

          if (
            budgeted > 0 &&
            fundedAmount >= budgeted
          ) {
            fundingStatus = "funded";
          } else if (
            fundedAmount > 0
          ) {
            fundingStatus =
              "partially_funded";
          }

          // ==============================================
          // REMOVE FUNDED MONEY FROM ACCOUNT
          // ==============================================

          accountBalances.set(
            allocation.accountId,

            Math.max(
              accountAvailable -
                fundedAmount,
              0
            )
          );

          // ==============================================
          // MONEY REMAINING AFTER ACTUAL SPENDING
          // ==============================================

          const available =
            budgeted - spent;

          // ==============================================
          // SPENDING PERCENTAGE
          // ==============================================

          const percentage =
            budgeted > 0
              ? Math.round(
                  (spent /
                    budgeted) *
                    100
                )
              : 0;

          // ==============================================
          // FUNDING PERCENTAGE
          // ==============================================

          const fundingPercentage =
            budgeted > 0
              ? Math.round(
                  (fundedAmount /
                    budgeted) *
                    100
                )
              : 0;

          // ==============================================
          // RETURN CATEGORY DATA
          // ==============================================

          return {
            id: allocation.id,

            categoryId:
              allocation.categoryId,

            categoryName:
              allocation.category.name,

            accountId:
              allocation.accountId,

            accountName:
              allocation.account.name,

            // Budget
            budgeted,

            // Spending
            spent,

            available,

            percentage,

            // Funding
            fundedAmount,

            unfundedAmount,

            fundingPercentage,

            fundingStatus,
          };
        }
      );

    // ==================================================
    // RESPONSE
    // ==================================================

    return NextResponse.json({
      budget,

      categories,
    });
  } catch (error) {
    console.error(
      "Failed to fetch budget summary:",
      error
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
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "Failed to fetch budget summary",

        details:
          error?.message ||
          "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}