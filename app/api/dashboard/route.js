import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  try {
    // ==================================================
    // AUTHENTICATION
    // ==================================================

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const userId = session.user.id;

    const now = new Date();

    // ==================================================
    // CURRENT MONTH
    // ==================================================

    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    );

    const startOfNextMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1,
    );

    // ==================================================
    // ACCOUNTS
    //
    // ONLY THIS USER'S ACCOUNTS
    // ==================================================

    const accounts = await prisma.account.findMany({
      where: {
        userId,
      },

      orderBy: {
        createdAt: "asc",
      },

      include: {
        // ------------------------------------------------
        // INCOME ALLOCATIONS
        // ------------------------------------------------

        incomeAllocations: {
          where: {
            income: {
              userId,
            },
          },
        },

        // ------------------------------------------------
        // DEBT RECEIVED
        //
        // Borrowed money received into this account.
        // This is NOT income.
        // ------------------------------------------------

        debtReceived: {
          where: {
            debt: {
              userId,
            },
          },
        },

        // ------------------------------------------------
        // MONEY-OUT TRANSACTIONS
        //
        // EXPENSE includes normal expenses AND debt
        // payments.
        //
        // GOAL_CONTRIBUTION is kept separate because
        // it represents targeted savings.
        // ------------------------------------------------

        transactions: {
          where: {
            userId,

            type: {
              in: [
                "EXPENSE",
                "GOAL_CONTRIBUTION",
              ],
            },
          },
        },
      },
    });

    // ==================================================
    // ALL INCOME
    //
    // ONLY THIS USER'S INCOME
    // ==================================================

    const incomes = await prisma.income.findMany({
      where: {
        userId,
      },

      include: {
        allocations: {
          where: {
            account: {
              userId,
            },
          },
        },
      },

      orderBy: {
        date: "desc",
      },
    });

    // ==================================================
    // ALL MONEY-OUT TRANSACTIONS
    //
    // EXPENSE
    // GOAL_CONTRIBUTION
    //
    // Debt payments are EXPENSE transactions and are
    // therefore included.
    // ==================================================

    const allTransactions =
      await prisma.transaction.findMany({
        where: {
          userId,

          type: {
            in: [
              "EXPENSE",
              "GOAL_CONTRIBUTION",
            ],
          },

          account: {
            userId,
          },
        },

        include: {
          account: true,

          category: {
            include: {
              group: true,
            },
          },

          goalContribution: {
            include: {
              goal: true,
            },
          },

          debtPayment: {
            include: {
              debt: true,
            },
          },
        },

        orderBy: {
          date: "desc",
        },
      });

    // ==================================================
    // ALL-TIME INCOME
    // ==================================================

    const totalIncome = incomes.reduce(
      (total, income) =>
        total + Number(income.amount || 0),
      0,
    );

    // ==================================================
    // ALL-TIME ALLOCATED INCOME
    //
    // This is the total amount of actual income that
    // has been allocated into accounts.
    // ==================================================

    const totalAllocated = incomes.reduce(
      (total, income) =>
        total +
        income.allocations.reduce(
          (allocationTotal, allocation) =>
            allocationTotal +
            Number(allocation.amount || 0),
          0,
        ),
      0,
    );

    // ==================================================
    // ALL-TIME DEBT RECEIVED
    //
    // Borrowed money that has actually been received
    // into the user's accounts.
    // ==================================================

    const totalDebtReceived =
      accounts.reduce(
        (total, account) =>
          total +
          account.debtReceived.reduce(
            (accountTotal, received) =>
              accountTotal +
              Number(received.amount || 0),
            0,
          ),
        0,
      );

    // ==================================================
    // UNALLOCATED INCOME
    //
    // Income that has not yet been allocated to an
    // account.
    // ==================================================

    const unallocatedIncome = Math.max(
      totalIncome - totalAllocated,
      0,
    );

    // ==================================================
    // ALL-TIME EXPENSES
    //
    // ALL EXPENSE transactions count.
    //
    // This includes:
    // - Normal expenses
    // - Debt payments
    //
    // Goal contributions are NOT included here because
    // they are targeted savings.
    // ==================================================

    const totalExpenses =
      allTransactions
        .filter(
          (transaction) =>
            transaction.type === "EXPENSE",
        )
        .reduce(
          (total, transaction) =>
            total +
            Number(transaction.amount || 0),
          0,
        );

    // ==================================================
    // ALL-TIME GOAL CONTRIBUTIONS
    //
    // Kept separate from expenses.
    // ==================================================

    const totalGoalContributions =
      allTransactions
        .filter(
          (transaction) =>
            transaction.type ===
            "GOAL_CONTRIBUTION",
        )
        .reduce(
          (total, transaction) =>
            total +
            Number(transaction.amount || 0),
          0,
        );

    // ==================================================
    // DASHBOARD TOTAL BALANCE
    //
    // ALL MONEY RECEIVED
    //
    // Income
    // + debt received
    //
    // IMPORTANT:
    // Unallocated income is INCLUDED.
    //
    // This represents all money that has come into
    // the user's financial system.
    // ==================================================

    const totalBalance =
      totalIncome +
      totalDebtReceived;

    // ==================================================
    // DASHBOARD REMAINING
    //
    // Total balance
    // - expenses
    //
    // Goal contributions are intentionally NOT deducted
    // here because you requested:
    //
    // Remaining = Total Balance - Expenses
    // ==================================================

    const remaining =
      totalBalance -
      totalExpenses;

    // ==================================================
    // THIS MONTH'S INCOME
    // ==================================================

    const monthlyIncome =
      incomes.filter((income) => {
        const date = new Date(
          income.date,
        );

        return (
          date >= startOfMonth &&
          date < startOfNextMonth
        );
      });

    const monthlyIncomeTotal =
      monthlyIncome.reduce(
        (total, income) =>
          total +
          Number(income.amount || 0),
        0,
      );

    // ==================================================
    // THIS MONTH'S TRANSACTIONS
    // ==================================================

    const monthlyTransactions =
      allTransactions.filter(
        (transaction) => {
          const date = new Date(
            transaction.date,
          );

          return (
            date >= startOfMonth &&
            date < startOfNextMonth
          );
        },
      );

    // ==================================================
    // THIS MONTH'S EXPENSES
    // ==================================================

    const monthlyExpenses =
      monthlyTransactions.filter(
        (transaction) =>
          transaction.type === "EXPENSE",
      );

    const monthlyExpensesTotal =
      monthlyExpenses.reduce(
        (total, transaction) =>
          total +
          Number(transaction.amount || 0),
        0,
      );

    // ==================================================
    // THIS MONTH'S GOAL CONTRIBUTIONS
    // ==================================================

    const monthlyGoalContributions =
      monthlyTransactions.filter(
        (transaction) =>
          transaction.type ===
          "GOAL_CONTRIBUTION",
      );

    const monthlyGoalContributionsTotal =
      monthlyGoalContributions.reduce(
        (total, transaction) =>
          total +
          Number(transaction.amount || 0),
        0,
      );

    // ==================================================
    // MONTHLY DEBT PAYMENTS
    //
    // Debt payments are EXPENSE transactions but are
    // separated from normal spending.
    // ==================================================

    const monthlyDebtPayments =
      monthlyExpenses.filter(
        (transaction) =>
          transaction.debtPaymentId,
      );

    const monthlyDebtPaymentsTotal =
      monthlyDebtPayments.reduce(
        (total, transaction) =>
          total +
          Number(transaction.amount || 0),
        0,
      );

    // ==================================================
    // MONTHLY NORMAL SPENDING
    //
    // Excludes debt payments.
    // ==================================================

    const monthlyNormalExpenses =
      monthlyExpenses.filter(
        (transaction) =>
          !transaction.debtPaymentId,
      );

    const monthlyNormalExpensesTotal =
      monthlyNormalExpenses.reduce(
        (total, transaction) =>
          total +
          Number(transaction.amount || 0),
        0,
      );

    // ==================================================
    // SPENDING BY CATEGORY GROUP
    //
    // Debt payments are excluded because they have
    // their own category.
    // ==================================================

    const monthlyGroupSpending = {};

    monthlyNormalExpenses.forEach(
      (transaction) => {
        const groupName =
          transaction.category?.group?.name ||
          "Other";

        if (
          !monthlyGroupSpending[groupName]
        ) {
          monthlyGroupSpending[groupName] =
            0;
        }

        monthlyGroupSpending[groupName] +=
          Number(transaction.amount || 0);
      },
    );

    const spendingGroups =
      Object.entries(
        monthlyGroupSpending,
      )
        .map(([group, amount]) => ({
          group,
          amount,
        }))
        .sort(
          (a, b) =>
            b.amount - a.amount,
        );

    // ==================================================
    // MONTHLY AVAILABLE FOR SPENDING
    //
    // Monthly income
    // - debt payments
    // - targeted savings
    //
    // This is separate from the main dashboard totals.
    // ==================================================

    const availableForSpending =
      monthlyIncomeTotal -
      monthlyDebtPaymentsTotal -
      monthlyGoalContributionsTotal;

    // ==================================================
    // MONTHLY REMAINING
    //
    // Monthly income
    // - normal expenses
    // - debt payments
    // - targeted savings
    // ==================================================

    const monthlyRemaining =
      monthlyIncomeTotal -
      monthlyNormalExpensesTotal -
      monthlyDebtPaymentsTotal -
      monthlyGoalContributionsTotal;

    // ==================================================
    // MONTHLY MONEY OUT
    // ==================================================

    const monthlyMoneyOut =
      monthlyNormalExpensesTotal +
      monthlyDebtPaymentsTotal +
      monthlyGoalContributionsTotal;

    // ==================================================
    // MONTHLY NET
    // ==================================================

    const net =
      monthlyIncomeTotal -
      monthlyMoneyOut;

    // ==================================================
    // MONTHLY BUDGET EXPENSES
    //
    // Debt payments are excluded.
    // Goal contributions are excluded.
    // ==================================================

    const monthlyBudgetExpenses =
      monthlyExpenses.filter(
        (transaction) =>
          !transaction.debtPaymentId,
      );

    const monthlyBudgetExpensesTotal =
      monthlyBudgetExpenses.reduce(
        (total, transaction) =>
          total +
          Number(transaction.amount || 0),
        0,
      );

    // ==================================================
    // ACCOUNT BALANCES
    //
    // Income allocated
    // + debt received
    // - expenses
    // - goal contributions
    // ==================================================

    const accountBalances =
      accounts.map((account) => {
        // ----------------------------------------------
        // INCOME ALLOCATED TO ACCOUNT
        // ----------------------------------------------

        const allocated =
          account.incomeAllocations.reduce(
            (total, allocation) =>
              total +
              Number(
                allocation.amount || 0,
              ),
            0,
          );

        // ----------------------------------------------
        // DEBT RECEIVED INTO ACCOUNT
        // ----------------------------------------------

        const debtReceived =
          account.debtReceived.reduce(
            (total, received) =>
              total +
              Number(
                received.amount || 0,
              ),
            0,
          );

        // ----------------------------------------------
        // NORMAL EXPENSES
        // ----------------------------------------------

        const normalExpenses =
          account.transactions
            .filter(
              (transaction) =>
                transaction.type ===
                "EXPENSE",
            )
            .reduce(
              (total, transaction) =>
                total +
                Number(
                  transaction.amount || 0,
                ),
              0,
            );

        // ----------------------------------------------
        // GOAL CONTRIBUTIONS
        // ----------------------------------------------

        const goalContributions =
          account.transactions
            .filter(
              (transaction) =>
                transaction.type ===
                "GOAL_CONTRIBUTION",
            )
            .reduce(
              (total, transaction) =>
                total +
                Number(
                  transaction.amount || 0,
                ),
              0,
            );

        // ----------------------------------------------
        // TOTAL MONEY OUT
        // ----------------------------------------------

        const expenses =
          normalExpenses +
          goalContributions;

        // ----------------------------------------------
        // ACTUAL ACCOUNT BALANCE
        // ----------------------------------------------

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

          expenses:
            normalExpenses,

          goalContributions,

          balance,

          income: allocated,

          createdAt:
            account.createdAt,

          updatedAt:
            account.updatedAt,
        };
      });

    // ==================================================
    // SPENDING BY CATEGORY
    //
    // Goal contributions have no category.
    // Debt payments are excluded from budget spending.
    // ==================================================

    const categoryMap = {};

    monthlyBudgetExpenses
      .filter(
        (transaction) =>
          transaction.category,
      )
      .forEach(
        (transaction) => {
          const categoryId =
            transaction.category.id;

          if (
            !categoryMap[categoryId]
          ) {
            categoryMap[categoryId] = {
              categoryId,

              category:
                transaction.category.name,

              amount: 0,
            };
          }

          categoryMap[
            categoryId
          ].amount += Number(
            transaction.amount || 0,
          );
        },
      );

    const categorySpending =
      Object.values(
        categoryMap,
      ).sort(
        (a, b) =>
          b.amount - a.amount,
      );

    // ==================================================
    // CURRENT MONTH BUDGET
    // ==================================================

    const budget =
      await prisma.budget.findFirst({
        where: {
          userId,

          month:
            now.getMonth() + 1,

          year:
            now.getFullYear(),
        },

        include: {
          allocations: {
            where: {
              account: {
                userId,
              },

              category: {
                group: {
                  userId,
                },
              },
            },

            include: {
              category: true,

              account: true,
            },
          },
        },
      });

    // ==================================================
    // TOTAL BUDGETED
    // ==================================================

    let totalBudgeted = 0;

    if (budget) {
      totalBudgeted =
        budget.allocations.reduce(
          (total, allocation) =>
            total +
            Number(
              allocation.amount || 0,
            ),
          0,
        );
    }

    // ==================================================
    // BUDGET REMAINING
    // ==================================================

    const totalBudgetRemaining =
      totalBudgeted -
      monthlyBudgetExpensesTotal;

    // ==================================================
    // BUDGET PERCENTAGE
    // ==================================================

    const budgetPercentage =
      totalBudgeted > 0
        ? Math.round(
            (monthlyBudgetExpensesTotal /
              totalBudgeted) *
              100,
          )
        : 0;

    // ==================================================
    // BUDGET BY CATEGORY
    // ==================================================

    const budgetCategories = [];

    if (budget) {
      // ------------------------------------------------
      // GROUP ALLOCATIONS BY ACCOUNT
      // ------------------------------------------------

      const allocationsByAccount = {};

      budget.allocations.forEach(
        (allocation) => {
          if (
            !allocationsByAccount[
              allocation.accountId
            ]
          ) {
            allocationsByAccount[
              allocation.accountId
            ] = [];
          }

          allocationsByAccount[
            allocation.accountId
          ].push(allocation);
        },
      );

      // ------------------------------------------------
      // PROCESS EACH ACCOUNT
      // ------------------------------------------------

      Object.entries(
        allocationsByAccount,
      ).forEach(
        ([accountId, allocations]) => {
          const account =
            accounts.find(
              (item) =>
                item.id === accountId,
            );

          if (!account) {
            return;
          }

          const accountBalance =
            Number(
              accountBalances.find(
                (item) =>
                  item.id === accountId,
              )?.balance || 0,
            );

          let availableMoney =
            Math.max(
              accountBalance,
              0,
            );

          // ------------------------------------------------
          // SORT ALLOCATIONS
          // ------------------------------------------------

          const sortedAllocations =
            [...allocations].sort(
              (a, b) =>
                a.category.name.localeCompare(
                  b.category.name,
                ),
            );

          // ------------------------------------------------
          // CALCULATE EACH ALLOCATION
          // ------------------------------------------------

          sortedAllocations.forEach(
            (allocation) => {
              const spent =
                monthlyBudgetExpenses
                  .filter(
                    (transaction) =>
                      transaction.categoryId ===
                        allocation.categoryId &&
                      transaction.accountId ===
                        allocation.accountId,
                  )
                  .reduce(
                    (total, transaction) =>
                      total +
                      Number(
                        transaction.amount ||
                          0,
                      ),
                    0,
                  );

              const budgeted =
                Number(
                  allocation.amount || 0,
                );

              const remaining =
                budgeted - spent;

              const percentage =
                budgeted > 0
                  ? Math.round(
                      (spent /
                        budgeted) *
                        100,
                    )
                  : 0;

              // ------------------------------------------------
              // FUNDING
              // ------------------------------------------------

              const fundedAmount =
                Math.min(
                  availableMoney,
                  budgeted,
                );

              const unfundedAmount =
                Math.max(
                  budgeted -
                    fundedAmount,
                  0,
                );

              let fundingStatus =
                "NOT_FUNDED";

              if (
                fundedAmount >=
                budgeted
              ) {
                fundingStatus =
                  "FUNDED";
              } else if (
                fundedAmount > 0
              ) {
                fundingStatus =
                  "PARTIALLY_FUNDED";
              }

              // ------------------------------------------------
              // REDUCE AVAILABLE ACCOUNT MONEY
              // ------------------------------------------------

              availableMoney =
                Math.max(
                  availableMoney -
                    fundedAmount,
                  0,
                );

              budgetCategories.push({
                categoryId:
                  allocation.categoryId,

                category:
                  allocation.category.name,

                accountId:
                  allocation.accountId,

                account:
                  allocation.account.name,

                budgeted,

                spent,

                remaining,

                percentage,

                fundedAmount,

                unfundedAmount,

                fundingStatus,

                accountBalance,

                availableAfterFunding:
                  availableMoney,
              });
            },
          );
        },
      );
    }

    // ==================================================
    // RECENT TRANSACTIONS
    // ==================================================

    const recentTransactions =
      allTransactions
        .slice(0, 10)
        .map(
          (transaction) => ({
            id: transaction.id,

            type:
              transaction.type,

            amount: Number(
              transaction.amount || 0,
            ),

            date:
              transaction.date,

            note:
              transaction.note,

            account:
              transaction.account
                ?.name ||
              "Unknown account",

            category:
              transaction.category
                ?.name ||
              null,

            goal:
              transaction
                .goalContribution
                ?.goal?.name ||
              null,

            debt:
              transaction
                .debtPayment
                ?.debt?.name ||
              null,
          }),
        );

    // ==================================================
    // RESPONSE
    // ==================================================

    return NextResponse.json({
      month:
        now.getMonth() + 1,

      year:
        now.getFullYear(),

      // ==================================================
      // ALL-TIME TOTALS
      // ==================================================

      totals: {
        // ----------------------------------------------
        // ALL MONEY RECEIVED
        //
        // Income + debt received.
        //
        // IMPORTANT:
        // Includes unallocated income.
        // ----------------------------------------------

        balance:
          totalBalance,

        // ----------------------------------------------
        // INCOME ALLOCATED TO ACCOUNTS
        // ----------------------------------------------

        allocated:
          totalAllocated,

        // ----------------------------------------------
        // ALL EXPENSES
        //
        // Includes debt payments.
        // Does NOT include goal contributions.
        // ----------------------------------------------

        expenses:
          totalExpenses,

        // ----------------------------------------------
        // TOTAL BALANCE - EXPENSES
        // ----------------------------------------------

        remaining:
          remaining,

        // ----------------------------------------------
        // ADDITIONAL DATA
        // ----------------------------------------------

        income:
          totalIncome,

        debtReceived:
          totalDebtReceived,

        unallocated:
          unallocatedIncome,

        goalContributions:
          totalGoalContributions,

        net,
      },

      // ==================================================
      // MONTHLY
      // ==================================================

      monthly: {
        // Income received this month
        income:
          monthlyIncomeTotal,

        // Normal spending
        expenses:
          monthlyNormalExpensesTotal,

        // Debt payments
        debtPayments:
          monthlyDebtPaymentsTotal,

        // Targeted savings
        goalContributions:
          monthlyGoalContributionsTotal,

        // Everything that left money this month
        moneyOut:
          monthlyMoneyOut,

        // Money available for normal spending
        availableForSpending:
          availableForSpending,

        // Money left after everything this month
        remaining:
          monthlyRemaining,

        // Spending grouped by category group
        spendingGroups,

        net,
      },

      // ==================================================
      // BUDGET
      // ==================================================

      budget: budget
        ? {
            id:
              budget.id,

            month:
              budget.month,

            year:
              budget.year,

            totalBudgeted,

            totalSpent:
              monthlyBudgetExpensesTotal,

            totalRemaining:
              totalBudgetRemaining,

            percentage:
              budgetPercentage,

            categories:
              budgetCategories,
          }
        : null,

      // ==================================================
      // ACCOUNTS
      // ==================================================

      accounts:
        accountBalances,

      // ==================================================
      // CATEGORY SPENDING
      // ==================================================

      categorySpending,

      // ==================================================
      // RECENT TRANSACTIONS
      // ==================================================

      recentTransactions,
    });
  } catch (error) {
    console.error(
      "Failed to fetch dashboard:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to fetch dashboard",

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