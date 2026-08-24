import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

// ======================================================
// PATCH RECEIVED BORROWED MONEY
//
// Updates:
// - DebtReceived
// - linked DEBT_RECEIVED Transaction
//
// The transaction is what affects the account balance.
// ======================================================

export async function PATCH(request, { params }) {
  try {
    const user = await requireUser();

    const { id: debtId, receivedId } = await params;

    const body = await request.json();

    const accountId = body.accountId;

    const amount = Number(body.amount);

    const note =
      body.note?.trim() || null;

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
        { status: 400 },
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
        { status: 400 },
      );
    }

    // ==================================================
    // VALIDATE DATE
    // ==================================================

    if (Number.isNaN(date.getTime())) {
      return NextResponse.json(
        {
          error: "Invalid date.",
        },
        { status: 400 },
      );
    }

    // ==================================================
    // FIND DEBT
    // ==================================================

    const debt = await prisma.debt.findFirst({
      where: {
        id: debtId,
        userId: user.id,
      },
    });

    if (!debt) {
      return NextResponse.json(
        {
          error: "Debt not found.",
        },
        { status: 404 },
      );
    }

    // ==================================================
    // FIND RECEIVED RECORD
    // ==================================================

    const received =
      await prisma.debtReceived.findFirst({
        where: {
          id: receivedId,
          debtId,
        },

        include: {
          transaction: true,
        },
      });

    if (!received) {
      return NextResponse.json(
        {
          error:
            "Received money record not found.",
        },
        { status: 404 },
      );
    }

    // ==================================================
    // CALCULATE OTHER RECEIVED MONEY
    //
    // We exclude the record currently being edited.
    // ==================================================

    const otherReceived =
      await prisma.debtReceived.findMany({
        where: {
          debtId,
          id: {
            not: receivedId,
          },
        },
      });

    const totalOtherReceived =
      otherReceived.reduce(
        (total, item) =>
          total + Number(item.amount || 0),
        0,
      );

    // ==================================================
    // PREVENT OVER-RECEIVING
    // ==================================================

    if (
      totalOtherReceived + amount >
      Number(debt.originalAmount)
    ) {
      const remaining =
        Math.max(
          Number(debt.originalAmount) -
            totalOtherReceived,
          0,
        );

      return NextResponse.json(
        {
          error:
            `You can only receive ${remaining.toLocaleString()} birr more for this debt.`,
        },
        { status: 400 },
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
      });

    if (!account) {
      return NextResponse.json(
        {
          error: "Account not found.",
        },
        { status: 404 },
      );
    }

    // ==================================================
    // UPDATE BOTH RECORDS
    // ==================================================

    const result =
      await prisma.$transaction(
        async (tx) => {
          const updatedReceived =
            await tx.debtReceived.update({
              where: {
                id: receivedId,
              },

              data: {
                amount: String(amount),
                date,
                note,
                accountId,
              },
            });

          let updatedTransaction = null;

          if (received.transaction) {
            updatedTransaction =
              await tx.transaction.update({
                where: {
                  id: received.transaction.id,
                },

                data: {
                  amount: String(amount),

                  date,

                  accountId,

                  note: note
                    ? `Debt received: ${debt.name} — ${note}`
                    : `Debt received: ${debt.name}`,
                },
              });
          } else {
            // ------------------------------------------------
            // Safety fallback:
            // If an old received record somehow has no
            // transaction, recreate it.
            // ------------------------------------------------

            updatedTransaction =
              await tx.transaction.create({
                data: {
                  amount: String(amount),

                  type: "DEBT_RECEIVED",

                  note: note
                    ? `Debt received: ${debt.name} — ${note}`
                    : `Debt received: ${debt.name}`,

                  date,

                  userId: user.id,

                  accountId,

                  debtReceivedId:
                    updatedReceived.id,
                },
              });
          }

          return {
            updatedReceived,
            updatedTransaction,
          };
        },
      );

    // ==================================================
    // RESPONSE
    // ==================================================

    return NextResponse.json({
      received: {
        id: result.updatedReceived.id,

        amount: Number(
          result.updatedReceived.amount,
        ),

        date:
          result.updatedReceived.date,

        note:
          result.updatedReceived.note,

        debtId:
          result.updatedReceived.debtId,

        accountId:
          result.updatedReceived.accountId,
      },

      transaction: {
        id:
          result.updatedTransaction.id,

        amount: Number(
          result.updatedTransaction.amount,
        ),

        type:
          result.updatedTransaction.type,

        date:
          result.updatedTransaction.date,

        note:
          result.updatedTransaction.note,

        accountId:
          result.updatedTransaction.accountId,

        debtReceivedId:
          result.updatedTransaction.debtReceivedId,
      },
    });
  } catch (error) {
    console.error(
      "Failed to update received debt:",
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
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        error:
          "Failed to update received money.",
        details:
          error?.message ||
          "Unknown error",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// DELETE RECEIVED BORROWED MONEY
//
// Deletes:
// 1. Linked DEBT_RECEIVED transaction
// 2. DebtReceived record
//
// Because account balances are calculated from transactions,
// deleting the transaction removes the money from the
// account balance.
// ======================================================

export async function DELETE(
  request,
  { params },
) {
  try {
    const user = await requireUser();

    const {
      id: debtId,
      receivedId,
    } = await params;

    // ==================================================
    // VERIFY DEBT
    // ==================================================

    const debt =
      await prisma.debt.findFirst({
        where: {
          id: debtId,
          userId: user.id,
        },
      });

    if (!debt) {
      return NextResponse.json(
        {
          error: "Debt not found.",
        },
        { status: 404 },
      );
    }

    // ==================================================
    // FIND RECEIVED RECORD
    // ==================================================

    const received =
      await prisma.debtReceived.findFirst({
        where: {
          id: receivedId,
          debtId,
        },

        include: {
          transaction: true,
        },
      });

    if (!received) {
      return NextResponse.json(
        {
          error:
            "Received money record not found.",
        },
        { status: 404 },
      );
    }

    // ==================================================
    // DELETE BOTH
    // ==================================================

    await prisma.$transaction(
      async (tx) => {
        // ----------------------------------------------
        // DELETE TRANSACTION FIRST
        //
        // Transaction references DebtReceived.
        // ----------------------------------------------

        if (received.transaction) {
          await tx.transaction.delete({
            where: {
              id: received.transaction.id,
            },
          });
        }

        // ----------------------------------------------
        // DELETE RECEIVED RECORD
        // ----------------------------------------------

        await tx.debtReceived.delete({
          where: {
            id: receivedId,
          },
        });
      },
    );

    return NextResponse.json({
      success: true,

      message:
        "Received money deleted successfully.",

      deletedReceivedId:
        receivedId,

      deletedAmount: Number(
        received.amount,
      ),
    });
  } catch (error) {
    console.error(
      "Failed to delete received debt:",
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
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        error:
          "Failed to delete received money.",
        details:
          error?.message ||
          "Unknown error",
      },
      { status: 500 },
    );
  }
}