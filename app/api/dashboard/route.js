import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();

    // ==================================================
    // CURRENT MONTH
    // ==================================================

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // ==================================================
    // ACCOUNTS
    // ==================================================

    const accounts = await prisma.account.findMany({
      orderBy: {
        createdAt: "asc",
      },

      include: {
        incomeAllocations: true,

        // Both normal expenses and goal contributions
        // reduce the actual money available in an account.
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
    // ALL INCOME
    // ==================================================

    const incomes = await prisma.income.findMany({
      include: {
        allocations: true,
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
    // Both take money out of an account.
    // ==================================================

    const allTransactions = await prisma.transaction.findMany({
      where: {
        type: {
          in: ["EXPENSE", "GOAL_CONTRIBUTION"],
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
      (total, income) => total + Number(income.amount || 0),
      0,
    );

    // ==================================================
    // ALL-TIME ALLOCATED INCOME
    // ==================================================

    const totalAllocated = incomes.reduce(
      (total, income) =>
        total +
        income.allocations.reduce(
          (allocationTotal, allocation) =>
            allocationTotal + Number(allocation.amount || 0),
          0,
        ),
      0,
    );

    // ==================================================
    // UNALLOCATED INCOME
    // ==================================================

    const unallocatedIncome = Math.max(totalIncome - totalAllocated, 0);

    // ==================================================
    // ALL-TIME NORMAL EXPENSES
    //
    // Only EXPENSE transactions count as expenses.
    // ==================================================

    const totalExpenses = allTransactions
      .filter((transaction) => transaction.type === "EXPENSE")
      .reduce(
        (total, transaction) => total + Number(transaction.amount || 0),
        0,
      );

    // ==================================================
    // ALL-TIME GOAL CONTRIBUTIONS
    //
    // Goal contributions are tracked separately.
    // ==================================================

    const totalGoalContributions = allTransactions
      .filter((transaction) => transaction.type === "GOAL_CONTRIBUTION")
      .reduce(
        (total, transaction) => total + Number(transaction.amount || 0),
        0,
      );

    // ==================================================
    // ACTUAL REMAINING MONEY
    //
    // Balance itself is NOT reduced.
    //
    // Balance:
    //     total income
    //
    // Remaining:
    //     income
    //     - expenses
    //     - goal contributions
    // ==================================================

    const remainingBalance = totalIncome - totalExpenses;

    // ==================================================
    // THIS MONTH'S INCOME
    // ==================================================

    const monthlyIncome = incomes.filter((income) => {
      const date = new Date(income.date);

      return date >= startOfMonth && date < startOfNextMonth;
    });

    const monthlyIncomeTotal = monthlyIncome.reduce(
      (total, income) => total + Number(income.amount || 0),
      0,
    );

    // ==================================================
    // THIS MONTH'S TRANSACTIONS
    // ==================================================

    const monthlyTransactions = allTransactions.filter((transaction) => {
      const date = new Date(transaction.date);

      return date >= startOfMonth && date < startOfNextMonth;
    });

    // ==================================================
    // THIS MONTH'S NORMAL EXPENSES
    // ==================================================

    const monthlyExpenses = monthlyTransactions.filter(
      (transaction) => transaction.type === "EXPENSE",
    );

    const monthlyExpensesTotal = monthlyExpenses.reduce(
      (total, transaction) => total + Number(transaction.amount || 0),
      0,
    );

    // ==================================================
    // THIS MONTH'S GOAL CONTRIBUTIONS
    // ==================================================

    const monthlyGoalContributions = monthlyTransactions.filter(
      (transaction) => transaction.type === "GOAL_CONTRIBUTION",
    );

    const monthlyGoalContributionsTotal = monthlyGoalContributions.reduce(
      (total, transaction) => total + Number(transaction.amount || 0),
      0,
    );

    // ==================================================
    // MONTHLY MONEY OUT
    //
    // Expenses + goal contributions
    // ==================================================

    const monthlyMoneyOut =
      monthlyExpensesTotal + monthlyGoalContributionsTotal;

    // ==================================================
    // MONTHLY NET
    //
    // Income - expenses - goal contributions
    // ==================================================

    const net = monthlyIncomeTotal - monthlyMoneyOut;

    // ==================================================
    // MONTHLY BUDGET EXPENSES
    //
    // Only normal expenses count toward the budget.
    //
    // Debt payments are excluded from budget spending.
    // Goal contributions are also excluded.
    // ==================================================

    const monthlyBudgetExpenses = monthlyExpenses.filter(
      (transaction) => !transaction.debtPaymentId,
    );

    const monthlyBudgetExpensesTotal = monthlyBudgetExpenses.reduce(
      (total, transaction) => total + Number(transaction.amount || 0),
      0,
    );

    // ==================================================
    // ACCOUNT BALANCES
    //
    // Allocated income
    // - normal expenses
    // - goal contributions
    // ==================================================

    const accountBalances = accounts.map((account) => {
      const allocated = account.incomeAllocations.reduce(
        (total, allocation) => total + Number(allocation.amount || 0),
        0,
      );

      const expenses = account.transactions.reduce(
        (total, transaction) => total + Number(transaction.amount || 0),
        0,
      );

      const normalExpenses = account.transactions
        .filter((transaction) => transaction.type === "EXPENSE")
        .reduce(
          (total, transaction) => total + Number(transaction.amount || 0),
          0,
        );

      const goalContributions = account.transactions
        .filter((transaction) => transaction.type === "GOAL_CONTRIBUTION")
        .reduce(
          (total, transaction) => total + Number(transaction.amount || 0),
          0,
        );

      const balance = allocated - expenses;

      return {
        id: account.id,

        name: account.name,

        type: account.type,

        allocated,

        // Normal expenses
        expenses: normalExpenses,

        // Goal money moved out
        goalContributions,

        // Actual available money
        balance,

        income: allocated,

        createdAt: account.createdAt,

        updatedAt: account.updatedAt,
      };
    });

    // ==================================================
    // SPENDING BY CATEGORY
    //
    // Goal contributions have no category.
    // ==================================================

    const categoryMap = {};

    monthlyBudgetExpenses
      .filter((transaction) => transaction.category)
      .forEach((transaction) => {
        const categoryId = transaction.category.id;

        if (!categoryMap[categoryId]) {
          categoryMap[categoryId] = {
            categoryId,

            category: transaction.category.name,

            amount: 0,
          };
        }

        categoryMap[categoryId].amount += Number(transaction.amount || 0);
      });

    const categorySpending = Object.values(categoryMap).sort(
      (a, b) => b.amount - a.amount,
    );

    // ==================================================
    // CURRENT MONTH BUDGET
    // ==================================================

    const budget = await prisma.budget.findUnique({
      where: {
        month_year: {
          month: now.getMonth() + 1,

          year: now.getFullYear(),
        },
      },

      include: {
        allocations: {
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
      totalBudgeted = budget.allocations.reduce(
        (total, allocation) => total + Number(allocation.amount || 0),
        0,
      );
    }

    // ==================================================
    // BUDGET REMAINING
    // ==================================================

    const totalBudgetRemaining = totalBudgeted - monthlyBudgetExpensesTotal;

    // ==================================================
    // BUDGET PERCENTAGE
    // ==================================================

    const budgetPercentage =
      totalBudgeted > 0
        ? Math.round((monthlyBudgetExpensesTotal / totalBudgeted) * 100)
        : 0;

    // ==================================================
    // BUDGET BY CATEGORY
    // ==================================================

    // ==================================================
    // BUDGET BY CATEGORY
    //
    // Keep every budget allocation visible.
    //
    // Also calculate whether the account currently has
    // enough available money to cover each allocation.
    //
    // Funding is calculated per account, in allocation order.
    // ==================================================

    // ==================================================
    // BUDGET BY CATEGORY
    //
    // Every budget allocation remains visible.
    //
    // Funding is calculated per account.
    // Allocations are sorted consistently before funding
    // is calculated so Prisma's return order does not matter.
    // ==================================================

    const budgetCategories = [];

    if (budget) {
      // --------------------------------------------------
      // GROUP ALLOCATIONS BY ACCOUNT
      // --------------------------------------------------

      const allocationsByAccount = {};

      budget.allocations.forEach((allocation) => {
        if (!allocationsByAccount[allocation.accountId]) {
          allocationsByAccount[allocation.accountId] = [];
        }

        allocationsByAccount[allocation.accountId].push(allocation);
      });

      // --------------------------------------------------
      // PROCESS EACH ACCOUNT SEPARATELY
      // --------------------------------------------------

      Object.entries(allocationsByAccount).forEach(
        ([accountId, allocations]) => {
          const account = accounts.find((item) => item.id === accountId);

          if (!account) {
            return;
          }

          const accountBalance = Number(
            accountBalances.find((item) => item.id === accountId)?.balance || 0,
          );

          let availableMoney = Math.max(accountBalance, 0);

          // ------------------------------------------------
          // SORT ALLOCATIONS
          //
          // Use category name so the result is deterministic.
          // Prisma order no longer controls funding.
          // ------------------------------------------------

          const sortedAllocations = [...allocations].sort((a, b) =>
            a.category.name.localeCompare(b.category.name),
          );

          // ------------------------------------------------
          // CALCULATE EACH ALLOCATION
          // ------------------------------------------------

          sortedAllocations.forEach((allocation) => {
            const spent = monthlyBudgetExpenses
              .filter(
                (transaction) =>
                  transaction.categoryId === allocation.categoryId &&
                  transaction.accountId === allocation.accountId,
              )
              .reduce(
                (total, transaction) => total + Number(transaction.amount || 0),
                0,
              );

            const budgeted = Number(allocation.amount || 0);

            const remaining = budgeted - spent;

            const percentage =
              budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0;

            // ------------------------------------------------
            // FUNDING
            // ------------------------------------------------

            const fundedAmount = Math.min(availableMoney, budgeted);

            const unfundedAmount = Math.max(budgeted - fundedAmount, 0);

            let fundingStatus = "NOT_FUNDED";

            if (fundedAmount >= budgeted) {
              fundingStatus = "FUNDED";
            } else if (fundedAmount > 0) {
              fundingStatus = "PARTIALLY_FUNDED";
            }

            // ------------------------------------------------
            // REDUCE AVAILABLE ACCOUNT MONEY
            // ------------------------------------------------

            availableMoney = Math.max(availableMoney - fundedAmount, 0);

            budgetCategories.push({
              categoryId: allocation.categoryId,

              category: allocation.category.name,

              accountId: allocation.accountId,

              account: allocation.account.name,

              budgeted,

              spent,

              remaining,

              percentage,

              // Funding information
              fundedAmount,

              unfundedAmount,

              fundingStatus,

              // Useful for debugging/display
              accountBalance,

              availableAfterFunding: availableMoney,
            });
          });
        },
      );
    }

    // ==================================================
    // RECENT TRANSACTIONS
    // ==================================================

    const recentTransactions = allTransactions
      .slice(0, 10)
      .map((transaction) => ({
        id: transaction.id,

        type: transaction.type,

        amount: Number(transaction.amount || 0),

        date: transaction.date,

        note: transaction.note,

        account: transaction.account?.name || "Unknown account",

        category: transaction.category?.name || null,

        goal: transaction.goalContribution?.goal?.name || null,

        debt: transaction.debtPayment?.debt?.name || null,
      }));

    // ==================================================
    // RESPONSE
    // ==================================================

    return NextResponse.json({
      month: now.getMonth() + 1,

      year: now.getFullYear(),

      // ==================================================
      // ALL-TIME TOTALS
      // ==================================================

      totals: {
        // ----------------------------------------------
        // BALANCE
        //
        // IMPORTANT:
        // This is TOTAL INCOME.
        // Expenses do NOT subtract from this value.
        // ----------------------------------------------

        balance: totalIncome,

        // ----------------------------------------------
        // TOTAL INCOME
        // ----------------------------------------------

        income: totalIncome,

        // ----------------------------------------------
        // TOTAL ALLOCATED
        // ----------------------------------------------

        allocated: totalAllocated,

        // ----------------------------------------------
        // UNALLOCATED
        // ----------------------------------------------

        unallocated: unallocatedIncome,

        // ----------------------------------------------
        // NORMAL EXPENSES ONLY
        // ----------------------------------------------

        expenses: totalExpenses,

        // ----------------------------------------------
        // GOAL CONTRIBUTIONS
        // ----------------------------------------------

        goalContributions: totalGoalContributions,

        // ----------------------------------------------
        // ACTUAL MONEY LEFT
        //
        // Income
        // - expenses
        // - goal contributions
        // ----------------------------------------------

        remaining: remainingBalance,

        // ----------------------------------------------
        // CURRENT MONTH NET
        // ----------------------------------------------

        net,
      },

      // ==================================================
      // MONTHLY
      // ==================================================

      monthly: {
        income: monthlyIncomeTotal,

        // Normal expenses only
        expenses: monthlyExpensesTotal,

        // Goal contributions separately
        goalContributions: monthlyGoalContributionsTotal,

        // Income - expenses - goal contributions
        net,
      },

      // ==================================================
      // BUDGET
      // ==================================================

      budget: budget
        ? {
            id: budget.id,

            month: budget.month,

            year: budget.year,

            totalBudgeted,

            // Normal budget spending only
            totalSpent: monthlyBudgetExpensesTotal,

            totalRemaining: totalBudgetRemaining,

            percentage: budgetPercentage,

            categories: budgetCategories,
          }
        : null,

      // ==================================================
      // ACCOUNTS
      // ==================================================

      accounts: accountBalances,

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
    console.error("Failed to fetch dashboard:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch dashboard",

        details: error?.message || "Unknown error",
      },
      {
        status: 500,
      },
    );
  }
}
