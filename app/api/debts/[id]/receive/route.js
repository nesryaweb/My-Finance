import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

// ======================================================
// RECEIVE BORROWED MONEY
//
// This does NOT create Income.
//
// It creates:
//
// 1. DebtReceived
// 2. DEBT_RECEIVED Transaction
//
// The transaction increases the selected account balance.
//
// Example:
//
// Debt:
// Friend loan — 10,000 birr
//
// Received:
// Cash — 10,000 birr
//
// Account balance:
// +10,000 birr
//
// Income:
// unchanged
// ======================================================

export async function POST(request, { params }) {
  try {
    const user = await requireUser();

    const { id: debtId } = await params;

    const body =
      await request.json();

    const accountId =
      body.accountId;

    const amount =
      Number(body.amount);

    const note =
      body.note?.trim() ||
      null;

    const date =
      body.date
        ? new Date(body.date)
        : new Date();

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
    // VALIDATE AMOUNT
    // ==================================================

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Received amount must be greater than 0.",
        },
        {
          status: 400,
        },
      );
    }

    // ==================================================
    // VALIDATE DATE
    // ==================================================

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid date.",
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
    //
    // Load:
    // - payments
    // - received money
    // ==================================================

    const debt =
      await prisma.debt.findFirst({
        where: {
          id: debtId,

          userId:
            user.id,
        },

        include: {
          payments: true,

          received: true,
        },
      });

    if (!debt) {
      return NextResponse.json(
        {
          error:
            "Debt not found.",
        },
        {
          status: 404,
        },
      );
    }

    // ==================================================
    // CALCULATE ORIGINAL DEBT
    // ==================================================

    const originalAmount =
      Number(
        debt.originalAmount ||
          0,
      );

    // ==================================================
    // CALCULATE TOTAL ALREADY RECEIVED
    // ==================================================

    const totalReceived =
      debt.received.reduce(
        (
          total,
          received,
        ) => {
          return (
            total +
            Number(
              received.amount ||
                0,
            )
          );
        },
        0,
      );

    // ==================================================
    // CALCULATE REMAINING AMOUNT TO RECEIVE
    // ==================================================

    const remainingToReceive =
      Math.max(
        originalAmount -
          totalReceived,
        0,
      );

    // ==================================================
    // CHECK IF FULL AMOUNT WAS RECEIVED
    // ==================================================

    if (
      remainingToReceive <=
      0
    ) {
      return NextResponse.json(
        {
          error:
            "The full borrowed amount has already been received.",
        },
        {
          status: 400,
        },
      );
    }

    // ==================================================
    // PREVENT OVER-RECEIVING
    // ==================================================

    if (
      amount >
      remainingToReceive
    ) {
      return NextResponse.json(
        {
          error:
            `You can only receive ${remainingToReceive.toLocaleString()} birr more for this debt.`,
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
    // ==================================================

    const account =
      await prisma.account.findFirst({
        where: {
          id: accountId,

          userId:
            user.id,
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
    // CREATE RECEIVED RECORD
    // + TRANSACTION
    //
    // Both must succeed together.
    // ==================================================

    const result =
      await prisma.$transaction(
        async (tx) => {
          // --------------------------------------------
          // CREATE DEBT RECEIVED
          // --------------------------------------------

          const received =
            await tx.debtReceived.create({
              data: {
                amount:
                  String(
                    amount,
                  ),

                date,

                note,

                debtId,

                accountId,
              },
            });

          // --------------------------------------------
          // CREATE ACCOUNT TRANSACTION
          //
          // This increases the account balance.
          //
          // It is NOT income.
          // --------------------------------------------

          const transaction =
            await tx.transaction.create({
              data: {
                amount:
                  String(
                    amount,
                  ),

                type:
                  "DEBT_RECEIVED",

                note:
                  note
                    ? `Debt received: ${debt.name} — ${note}`
                    : `Debt received: ${debt.name}`,

                date,

                userId:
                  user.id,

                accountId,

                debtReceivedId:
                  received.id,
              },
            });

          return {
            received,

            transaction,
          };
        },
      );

    // ==================================================
    // NEW TOTAL RECEIVED
    // ==================================================

    const newTotalReceived =
      totalReceived +
      amount;

    const newRemainingToReceive =
      Math.max(
        originalAmount -
          newTotalReceived,
        0,
      );

    // ==================================================
    // TOTAL PAID
    // ==================================================

    const totalPaid =
      debt.payments.reduce(
        (
          total,
          payment,
        ) => {
          return (
            total +
            Number(
              payment.amount ||
                0,
            )
          );
        },
        0,
      );

    // ==================================================
    // REMAINING DEBT
    // ==================================================

    const remainingDebt =
      Math.max(
        originalAmount -
          totalPaid,
        0,
      );

    // ==================================================
    // STATUS
    // ==================================================

    const status =
      remainingDebt <= 0
        ? "PAID"
        : debt.status;

    // ==================================================
    // RESPONSE
    // ==================================================

    return NextResponse.json(
      {
        received: {
          id:
            result.received.id,

          amount:
            Number(
              result.received
                .amount,
            ),

          date:
            result.received
              .date,

          note:
            result.received
              .note,

          debtId:
            result.received
              .debtId,

          accountId:
            result.received
              .accountId,
        },

        transaction: {
          id:
            result.transaction
              .id,

          amount:
            Number(
              result.transaction
                .amount,
            ),

          type:
            result.transaction
              .type,

          note:
            result.transaction
              .note,

          date:
            result.transaction
              .date,

          accountId:
            result.transaction
              .accountId,

          debtReceivedId:
            result.transaction
              .debtReceivedId,
        },

        debt: {
          id:
            debt.id,

          name:
            debt.name,

          originalAmount,

          totalReceived:
            newTotalReceived,

          remainingToReceive:
            newRemainingToReceive,

          totalPaid,

          remaining:
            remainingDebt,

          status,
        },

        account: {
          id:
            account.id,

          name:
            account.name,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Failed to record received debt:",
      error,
    );

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

    return NextResponse.json(
      {
        error:
          "Failed to record received debt.",

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