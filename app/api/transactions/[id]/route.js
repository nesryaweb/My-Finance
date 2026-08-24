import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

// ======================================================
// UPDATE TRANSACTION
// ======================================================

export async function PATCH(
  request,
  { params },
) {
  try {
    const user = await requireUser();

    const { id } = await params;

    const body =
      await request.json();

    const {
      amount,
      type,
      note,
      date,
      accountId,
      categoryId,
    } = body;

    // ==================================================
    // VALIDATE AMOUNT
    // ==================================================

    if (
      amount === undefined ||
      amount === null ||
      amount === "" ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Amount must be greater than 0.",
        },
        {
          status: 400,
        },
      );
    }

    // ==================================================
    // VALIDATE TYPE
    // ==================================================

    if (
      type !== "INCOME" &&
      type !== "EXPENSE"
    ) {
      return NextResponse.json(
        {
          error:
            "Transaction type must be INCOME or EXPENSE.",
        },
        {
          status: 400,
        },
      );
    }

    // ==================================================
    // VALIDATE ACCOUNT
    // ==================================================

    if (!accountId) {
      return NextResponse.json(
        {
          error:
            "Account is required.",
        },
        {
          status: 400,
        },
      );
    }

    // ==================================================
    // VALIDATE CATEGORY
    // ==================================================

    if (
      type === "EXPENSE" &&
      !categoryId
    ) {
      return NextResponse.json(
        {
          error:
            "Category is required for an expense.",
        },
        {
          status: 400,
        },
      );
    }

    // ==================================================
    // FIND EXISTING TRANSACTION
    //
    // IMPORTANT:
    // Only the current user's transaction can be edited.
    // ==================================================

    const existingTransaction =
      await prisma.transaction.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

    if (!existingTransaction) {
      return NextResponse.json(
        {
          error:
            "Transaction not found.",
        },
        {
          status: 404,
        },
      );
    }

    // ==================================================
    // FIND NEW ACCOUNT
    // ==================================================

    const account =
      await prisma.account.findFirst({
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
          error:
            "Account not found.",
        },
        {
          status: 404,
        },
      );
    }

    // ==================================================
    // ACCOUNT ALLOCATED MONEY
    // ==================================================

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

    // ==================================================
    // ACCOUNT INCOME
    //
    // Ignore the transaction being edited.
    // ==================================================

    const income =
      account.transactions.reduce(
        (
          total,
          currentTransaction,
        ) => {
          if (
            currentTransaction.id ===
            id
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
                  0,
              )
            );
          }

          return total;
        },
        0,
      );

    // ==================================================
    // DEBT MONEY RECEIVED
    //
    // IMPORTANT:
    // DEBT_RECEIVED is available money even though
    // it is NOT classified as income.
    //
    // Ignore the transaction being edited.
    // ==================================================

    const debtReceived =
      account.transactions.reduce(
        (
          total,
          currentTransaction,
        ) => {
          if (
            currentTransaction.id ===
            id
          ) {
            return total;
          }

          if (
            currentTransaction.type ===
            "DEBT_RECEIVED"
          ) {
            return (
              total +
              Number(
                currentTransaction.amount ||
                  0,
              )
            );
          }

          return total;
        },
        0,
      );

    // ==================================================
    // ACCOUNT EXPENSES
    //
    // Ignore the transaction being edited.
    // ==================================================

    const expenses =
      account.transactions.reduce(
        (
          total,
          currentTransaction,
        ) => {
          if (
            currentTransaction.id ===
            id
          ) {
            return total;
          }

          if (
            currentTransaction.type ===
              "EXPENSE" ||
            currentTransaction.type ===
              "GOAL_CONTRIBUTION"
          ) {
            return (
              total +
              Number(
                currentTransaction.amount ||
                  0,
              )
            );
          }

          return total;
        },
        0,
      );

    // ==================================================
    // AVAILABLE BALANCE
    // ==================================================

    const availableBalance =
      allocated +
      income +
      debtReceived -
      expenses;

    // ==================================================
    // CHECK EXPENSE BALANCE
    // ==================================================

    if (
      type === "EXPENSE" &&
      Number(amount) >
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
    // CATEGORY
    // ==================================================

    const finalCategoryId =
      type === "EXPENSE"
        ? categoryId
        : null;

    // ==================================================
    // UPDATE TRANSACTION
    // ==================================================

    const updatedTransaction =
      await prisma.transaction.update({
        where: {
          id,
        },

        data: {
          amount:
            String(amount),

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
      updatedTransaction,
    );
  } catch (error) {
    console.error(
      "Failed to update transaction:",
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
          "Failed to update transaction.",
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
// DELETE TRANSACTION
// ======================================================

export async function DELETE(
  request,
  { params },
) {
  try {
    const user = await requireUser();

    const { id } = await params;

    // ==================================================
    // FIND TRANSACTION BELONGING TO CURRENT USER
    // ==================================================

    const transaction =
      await prisma.transaction.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

    if (!transaction) {
      return NextResponse.json(
        {
          error:
            "Transaction not found.",
        },
        {
          status: 404,
        },
      );
    }

    // ==================================================
    // DELETE
    // ==================================================

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
          "Failed to delete transaction.",
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