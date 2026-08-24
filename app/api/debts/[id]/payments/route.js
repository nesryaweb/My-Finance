import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export async function POST(request, { params }) {
  try {
    const user = await requireUser();

    const { id: debtId } = await params;

    const body = await request.json();

    const accountId = body.accountId;
    const amount = Number(body.amount);
    const note = body.note?.trim() || null;

    const date = body.date
      ? new Date(body.date)
      : new Date();

    // ==================================================
    // VALIDATE ACCOUNT
    // ==================================================

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

    // ==================================================
    // VALIDATE AMOUNT
    // ==================================================

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Payment amount must be greater than 0.",
        },
        {
          status: 400,
        },
      );
    }

    // ==================================================
    // VALIDATE DATE
    // ==================================================

    if (Number.isNaN(date.getTime())) {
      return NextResponse.json(
        {
          error: "Invalid payment date.",
        },
        {
          status: 400,
        },
      );
    }

    // ==================================================
    // FIND DEBT
    //
    // The debt must belong to the current user.
    // ==================================================

    const debt = await prisma.debt.findFirst({
      where: {
        id: debtId,
        userId: user.id,
      },

      include: {
        payments: true,
      },
    });

    if (!debt) {
      return NextResponse.json(
        {
          error: "Debt not found.",
        },
        {
          status: 404,
        },
      );
    }

    // ==================================================
    // CALCULATE CURRENT DEBT BALANCE
    // ==================================================

    const originalAmount =
      Number(debt.originalAmount || 0);

    const totalPaid =
      debt.payments.reduce(
        (total, payment) => {
          return (
            total +
            Number(payment.amount || 0)
          );
        },
        0,
      );

    const remainingDebt = Math.max(
      originalAmount - totalPaid,
      0,
    );

    // ==================================================
    // CHECK IF ALREADY PAID
    // ==================================================

    if (remainingDebt <= 0) {
      return NextResponse.json(
        {
          error:
            "This debt has already been paid.",
        },
        {
          status: 400,
        },
      );
    }

    // ==================================================
    // PREVENT OVERPAYMENT
    // ==================================================

    if (amount > remainingDebt) {
      return NextResponse.json(
        {
          error: `Payment cannot be greater than the remaining debt of ${remainingDebt.toLocaleString()} birr.`,
        },
        {
          status: 400,
        },
      );
    }

    // ==================================================
    // FIND ACCOUNT
    //
    // The account must belong to the current user.
    //
    // We load:
    //
    // 1. Income allocations
    // 2. Account transactions
    //
    // Transactions include:
    //
    // - DEBT_RECEIVED
    // - EXPENSE
    // - GOAL_CONTRIBUTION
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
          error: "Account not found.",
        },
        {
          status: 404,
        },
      );
    }

    // ==================================================
    // CALCULATE MONEY ALLOCATED FROM INCOME
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
    // CALCULATE MONEY RECEIVED FROM DEBT
    //
    // Borrowed money is NOT income.
    //
    // However, it DOES increase the account balance.
    //
    // Example:
    //
    // Income allocated:   5,000
    // Debt received:      3,000
    //
    // Available before expenses:
    //                     8,000
    // ==================================================

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

    // ==================================================
    // CALCULATE MONEY SPENT
    //
    // These transaction types decrease the account
    // balance.
    //
    // EXPENSE:
    // Normal spending and debt payments.
    //
    // GOAL_CONTRIBUTION:
    // Money moved from the account into a financial goal.
    // ==================================================

    const outgoingTransactions =
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

    // ==================================================
    // CALCULATE AVAILABLE ACCOUNT BALANCE
    // ==================================================

    const availableBalance =
      allocated +
      debtReceived -
      outgoingTransactions;

    // ==================================================
    // CHECK ACCOUNT BALANCE
    // ==================================================

    if (amount > availableBalance) {
      return NextResponse.json(
        {
          error: `Not enough money in this account. Available balance: ${Math.max(
            availableBalance,
            0,
          ).toLocaleString()} birr.`,
        },
        {
          status: 400,
        },
      );
    }

    // ==================================================
    // CALCULATE NEW DEBT TOTALS
    // ==================================================

    const newTotalPaid =
      totalPaid + amount;

    const newRemaining =
      Math.max(
        originalAmount -
          newTotalPaid,
        0,
      );

    const newStatus =
      newRemaining <= 0
        ? "PAID"
        : "ACTIVE";

    // ==================================================
    // CREATE PAYMENT + TRANSACTION
    //
    // Both are created inside ONE transaction.
    //
    // If either operation fails:
    //
    // - DebtPayment is not saved
    // - Transaction is not saved
    // - Debt status is not changed
    //
    // This keeps the financial records synchronized.
    // ==================================================

    const result =
      await prisma.$transaction(
        async (tx) => {
          // --------------------------------------------
          // CREATE EXPENSE TRANSACTION
          //
          // Debt repayment is an expense from the
          // account's point of view.
          //
          // It is NOT income.
          // --------------------------------------------

          const transaction =
            await tx.transaction.create({
              data: {
                amount:
                  String(amount),

                type: "EXPENSE",

                note: note
                  ? `Debt payment: ${debt.name} — ${note}`
                  : `Debt payment: ${debt.name}`,

                date,

                userId:
                  user.id,

                accountId,
              },
            });

          // --------------------------------------------
          // CREATE DEBT PAYMENT
          // --------------------------------------------

          const payment =
            await tx.debtPayment.create({
              data: {
                amount:
                  String(amount),

                date,

                note,

                debtId,

                accountId,
              },

              include: {
                account: true,

                debt: true,

                transaction: true,
              },
            });

          // --------------------------------------------
          // CONNECT TRANSACTION TO PAYMENT
          // --------------------------------------------

          const updatedTransaction =
            await tx.transaction.update({
              where: {
                id: transaction.id,
              },

              data: {
                debtPaymentId:
                  payment.id,
              },
            });

          // --------------------------------------------
          // UPDATE DEBT STATUS
          // --------------------------------------------

          const updatedDebt =
            await tx.debt.update({
              where: {
                id: debtId,
              },

              data: {
                status:
                  newStatus,
              },
            });

          // --------------------------------------------
          // RETURN CREATED RECORDS
          // --------------------------------------------

          return {
            payment: {
              ...payment,

              transaction:
                updatedTransaction,
            },

            debt:
              updatedDebt,
          };
        },
      );

    // ==================================================
    // RESPONSE
    // ==================================================

    return NextResponse.json(
      {
        payment: {
          ...result.payment,

          amount: Number(
            result.payment.amount,
          ),
        },

        debt: {
          ...result.debt,

          originalAmount:
            Number(
              result.debt
                .originalAmount,
            ),

          minimumPayment:
            result.debt
              .minimumPayment !==
              null
              ? Number(
                  result.debt
                    .minimumPayment,
                )
              : null,

          totalPaid:
            newTotalPaid,

          remaining:
            newRemaining,

          status:
            newStatus,
        },

        account: {
          id:
            account.id,

          name:
            account.name,

          previousBalance:
            availableBalance,

          newBalance:
            availableBalance -
            amount,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Failed to create debt payment:",
      error,
    );

    // ==================================================
    // AUTHORIZATION ERROR
    // ==================================================

    if (
      error?.message ===
      "UNAUTHORIZED"
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    // ==================================================
    // GENERAL ERROR
    // ==================================================

    return NextResponse.json(
      {
        error:
          "Failed to create debt payment.",

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