import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      amount,
      type,
      note,
      date,
      accountId,
      categoryId,
    } = body;

    // --------------------------------------------------
    // VALIDATE AMOUNT
    // --------------------------------------------------

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json(
        {
          error: "Amount must be greater than 0",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // VALIDATE TYPE
    // --------------------------------------------------

    if (
      type !== "INCOME" &&
      type !== "EXPENSE"
    ) {
      return NextResponse.json(
        {
          error:
            "Transaction type must be INCOME or EXPENSE",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // VALIDATE ACCOUNT
    // --------------------------------------------------

    if (!accountId) {
      return NextResponse.json(
        {
          error: "Account is required",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // EXPENSE CATEGORY
    // --------------------------------------------------

    if (
      type === "EXPENSE" &&
      !categoryId
    ) {
      return NextResponse.json(
        {
          error:
            "Category is required for an expense",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // FIND EXISTING TRANSACTION
    // --------------------------------------------------

    const existingTransaction =
      await prisma.transaction.findUnique({
        where: {
          id,
        },
      });

    if (!existingTransaction) {
      return NextResponse.json(
        {
          error: "Transaction not found",
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // FIND NEW ACCOUNT
    // --------------------------------------------------

    const account =
      await prisma.account.findUnique({
        where: {
          id: accountId,
        },
        include: {
          incomeAllocations: true,
          transactions: true,
        },
      });

    if (!account) {
      return NextResponse.json(
        {
          error: "Account not found",
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // ACCOUNT STARTING / ALLOCATED MONEY
    // --------------------------------------------------

    const allocated =
      account.incomeAllocations.reduce(
        (total, allocation) => {
          return (
            total +
            Number(
              allocation.amount || 0
            )
          );
        },
        0
      );

    // --------------------------------------------------
    // ACCOUNT INCOME
    // --------------------------------------------------

    const income =
      account.transactions.reduce(
        (
          total,
          currentTransaction
        ) => {
          // Ignore the transaction being edited
          if (
            currentTransaction.id === id
          ) {
            return total;
          }

          if (
            currentTransaction.type ===
            "INCOME"
          ) {
            return (
              total +
              Number(
                currentTransaction.amount ||
                  0
              )
            );
          }

          return total;
        },
        0
      );

    // --------------------------------------------------
    // ACCOUNT EXPENSES
    // --------------------------------------------------

    const expenses =
      account.transactions.reduce(
        (
          total,
          currentTransaction
        ) => {
          // Ignore the transaction being edited
          if (
            currentTransaction.id === id
          ) {
            return total;
          }

          if (
            currentTransaction.type ===
            "EXPENSE"
          ) {
            return (
              total +
              Number(
                currentTransaction.amount ||
                  0
              )
            );
          }

          return total;
        },
        0
      );

    // --------------------------------------------------
    // AVAILABLE BALANCE
    // --------------------------------------------------

    const availableBalance =
      allocated +
      income -
      expenses;

    // --------------------------------------------------
    // CHECK EXPENSE BALANCE
    // --------------------------------------------------

    if (
      type === "EXPENSE" &&
      Number(amount) >
        availableBalance
    ) {
      return NextResponse.json(
        {
          error: `Not enough money in this account. Available balance: ${availableBalance.toLocaleString()} birr.`,
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // CATEGORY
    // --------------------------------------------------

    const finalCategoryId =
      type === "EXPENSE"
        ? categoryId
        : null;

    // --------------------------------------------------
    // UPDATE TRANSACTION
    // --------------------------------------------------

    const updatedTransaction =
      await prisma.transaction.update({
        where: {
          id,
        },

        data: {
          amount: String(amount),

          type,

          note:
            note?.trim() || null,

          date: date
            ? new Date(date)
            : existingTransaction.date,

          accountId,

          categoryId:
            finalCategoryId,
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
      updatedTransaction
    );
  } catch (error) {
    console.error(
      "Failed to update transaction:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to update transaction",
        details: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  request,
  { params }
) {
  try {
    const { id } = await params;

    const transaction =
      await prisma.transaction.findUnique({
        where: {
          id,
        },
      });

    if (!transaction) {
      return NextResponse.json(
        {
          error:
            "Transaction not found",
        },
        {
          status: 404,
        }
      );
    }

    await prisma.transaction.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Failed to delete transaction:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete transaction",
        details: error.message,
      },
      {
        status: 500,
      }
    );
  }
}