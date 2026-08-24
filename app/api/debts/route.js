import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

// ======================================================
// GET ALL DEBTS
// ======================================================

export async function GET() {
  try {
    const user = await requireUser();

    const debts = await prisma.debt.findMany({
      where: {
        userId: user.id,
      },

      include: {
        // ------------------------------------------------
        // PAYMENTS
        // ------------------------------------------------

        payments: {
          include: {
            account: true,
          },

          orderBy: [
            {
              date: "desc",
            },
            {
              createdAt: "desc",
            },
          ],
        },

        // ------------------------------------------------
        // MONEY RECEIVED
        // ------------------------------------------------

        received: {
          include: {
            account: true,
          },

          orderBy: [
            {
              date: "desc",
            },
            {
              createdAt: "desc",
            },
          ],
        },
      },

      orderBy: [
        {
          priority: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    // ==================================================
    // FORMAT DEBTS
    // ==================================================

    const formattedDebts = debts.map((debt) => {
      const originalAmount = Number(
        debt.originalAmount || 0,
      );

      // ==================================================
      // TOTAL PAID
      // ==================================================

      const totalPaid = debt.payments.reduce(
        (total, payment) => {
          return (
            total +
            Number(payment.amount || 0)
          );
        },
        0,
      );

      // ==================================================
      // TOTAL RECEIVED
      // ==================================================

      const totalReceived = debt.received.reduce(
        (total, received) => {
          return (
            total +
            Number(received.amount || 0)
          );
        },
        0,
      );

      // ==================================================
      // REMAINING DEBT
      //
      // This is how much the user still owes.
      // ==================================================

      const remaining = Math.max(
        originalAmount - totalPaid,
        0,
      );

      // ==================================================
      // AMOUNT STILL TO RECEIVE
      //
      // Useful when a debt was recorded before all the
      // borrowed money was actually received.
      // ==================================================

      const remainingToReceive = Math.max(
        originalAmount - totalReceived,
        0,
      );

      // ==================================================
      // STATUS
      // ==================================================

      const status =
        remaining <= 0
          ? "PAID"
          : debt.status;

      return {
        id: debt.id,

        name: debt.name,

        originalAmount,

        minimumPayment:
          debt.minimumPayment !== null &&
          debt.minimumPayment !== undefined
            ? Number(
                debt.minimumPayment,
              )
            : null,

        dueDate: debt.dueDate,

        note: debt.note,

        priority: debt.priority,

        status,

        totalPaid,

        remaining,

        totalReceived,

        remainingToReceive,

        createdAt: debt.createdAt,

        updatedAt: debt.updatedAt,

        // ==================================================
        // PAYMENT HISTORY
        // ==================================================

        payments: debt.payments.map(
          (payment) => ({
            id: payment.id,

            amount: Number(
              payment.amount || 0,
            ),

            date: payment.date,

            note: payment.note,

            debtId: payment.debtId,

            accountId:
              payment.accountId,

            account: payment.account,

            createdAt:
              payment.createdAt,
          }),
        ),

        // ==================================================
        // MONEY RECEIVED HISTORY
        // ==================================================

        received: debt.received.map(
          (received) => ({
            id: received.id,

            amount: Number(
              received.amount || 0,
            ),

            date: received.date,

            note: received.note,

            debtId:
              received.debtId,

            accountId:
              received.accountId,

            account: received.account,

            createdAt:
              received.createdAt,
          }),
        ),
      };
    });

    return NextResponse.json(
      formattedDebts,
    );
  } catch (error) {
    console.error(
      "Failed to fetch debts:",
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
          "Failed to fetch debts.",
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
// CREATE DEBT
//
// Optional received money can be recorded at the same
// time as creating the debt.
//
// If receivedMoney is true:
//
// 1. Create Debt
// 2. Create DebtReceived
// 3. Create DEBT_RECEIVED Transaction
//
// All three happen inside one database transaction.
// ======================================================

export async function POST(request) {
  try {
    const user = await requireUser();

    const body =
      await request.json();

    // ==================================================
    // BASIC DATA
    // ==================================================

    const name =
      body.name?.trim();

    const originalAmount =
      Number(
        body.originalAmount,
      );

    const minimumPayment =
      body.minimumPayment !==
        undefined &&
      body.minimumPayment !== ""
        ? Number(
            body.minimumPayment,
          )
        : null;

    const priority =
      body.priority !==
        undefined &&
      body.priority !== ""
        ? Number(
            body.priority,
          )
        : 1;

    const note =
      body.note?.trim() ||
      null;

    const dueDate =
      body.dueDate
        ? new Date(
            body.dueDate,
          )
        : null;

    // ==================================================
    // RECEIVED MONEY
    // ==================================================

    const receivedMoney =
      body.receivedMoney === true;

    const accountId =
      body.accountId || null;

    const receivedAmount =
      body.receivedAmount !==
        undefined &&
      body.receivedAmount !== ""
        ? Number(
            body.receivedAmount,
          )
        : null;

    const receivedDate =
      body.receivedDate
        ? new Date(
            body.receivedDate,
          )
        : new Date();

    const receivedNote =
      body.receivedNote?.trim() ||
      null;

    // ==================================================
    // VALIDATE NAME
    // ==================================================

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Debt name is required.",
        },
        {
          status: 400,
        },
      );
    }

    // ==================================================
    // VALIDATE ORIGINAL AMOUNT
    // ==================================================

    if (
      !Number.isFinite(
        originalAmount,
      ) ||
      originalAmount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Original debt amount must be greater than 0.",
        },
        {
          status: 400,
        },
      );
    }

    // ==================================================
    // VALIDATE MINIMUM PAYMENT
    // ==================================================

    if (
      minimumPayment !== null &&
      (
        !Number.isFinite(
          minimumPayment,
        ) ||
        minimumPayment <= 0
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Minimum payment must be greater than 0.",
        },
        {
          status: 400,
        },
      );
    }

    // ==================================================
    // VALIDATE PRIORITY
    // ==================================================

    if (
      !Number.isInteger(
        priority,
      ) ||
      priority < 1
    ) {
      return NextResponse.json(
        {
          error:
            "Priority must be a whole number greater than 0.",
        },
        {
          status: 400,
        },
      );
    }

    // ==================================================
    // VALIDATE DUE DATE
    // ==================================================

    if (
      dueDate &&
      Number.isNaN(
        dueDate.getTime(),
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid due date.",
        },
        {
          status: 400,
        },
      );
    }

    // ==================================================
    // VALIDATE RECEIVED MONEY
    // ==================================================

    if (receivedMoney) {
      // ----------------------------------------------
      // ACCOUNT REQUIRED
      // ----------------------------------------------

      if (!accountId) {
        return NextResponse.json(
          {
            error:
              "Please select the account where the borrowed money was received.",
          },
          {
            status: 400,
          },
        );
      }

      // ----------------------------------------------
      // AMOUNT REQUIRED
      // ----------------------------------------------

      if (
        receivedAmount === null ||
        !Number.isFinite(
          receivedAmount,
        ) ||
        receivedAmount <= 0
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

      // ----------------------------------------------
      // CANNOT RECEIVE MORE THAN DEBT
      // ----------------------------------------------

      if (
        receivedAmount >
        originalAmount
      ) {
        return NextResponse.json(
          {
            error:
              "Received amount cannot be greater than the original debt amount.",
          },
          {
            status: 400,
          },
        );
      }

      // ----------------------------------------------
      // VALIDATE DATE
      // ----------------------------------------------

      if (
        Number.isNaN(
          receivedDate.getTime(),
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid received date.",
          },
          {
            status: 400,
          },
        );
      }
    }

    // ==================================================
    // CREATE DEBT
    // + OPTIONAL RECEIVED MONEY
    // ==================================================

    const result =
      await prisma.$transaction(
        async (tx) => {
          // --------------------------------------------
          // CREATE DEBT
          // --------------------------------------------

          const debt =
            await tx.debt.create({
              data: {
                name,

                originalAmount:
                  String(
                    originalAmount,
                  ),

                minimumPayment:
                  minimumPayment !==
                  null
                    ? String(
                        minimumPayment,
                      )
                    : null,

                priority,

                dueDate,

                note,

                status:
                  "ACTIVE",

                userId:
                  user.id,
              },
            });

          let received =
            null;

          let transaction =
            null;

          // --------------------------------------------
          // RECORD RECEIVED MONEY
          // --------------------------------------------

          if (receivedMoney) {
            // ------------------------------------------
            // VERIFY ACCOUNT
            // ------------------------------------------

            const account =
              await tx.account.findFirst({
                where: {
                  id: accountId,

                  userId:
                    user.id,
                },
              });

            if (!account) {
              throw new Error(
                "ACCOUNT_NOT_FOUND",
              );
            }

            // ------------------------------------------
            // CREATE DEBT RECEIVED
            // ------------------------------------------

            received =
              await tx.debtReceived.create({
                data: {
                  amount:
                    String(
                      receivedAmount,
                    ),

                  date:
                    receivedDate,

                  note:
                    receivedNote ||
                    `Borrowed money received: ${debt.name}`,

                  debtId:
                    debt.id,

                  accountId,
                },
              });

            // ------------------------------------------
            // CREATE TRANSACTION
            //
            // This increases account balance.
            //
            // It is NOT income.
            // ------------------------------------------

            transaction =
              await tx.transaction.create({
                data: {
                  amount:
                    String(
                      receivedAmount,
                    ),

                  type:
                    "DEBT_RECEIVED",

                  note:
                    receivedNote
                      ? `Debt received: ${debt.name} — ${receivedNote}`
                      : `Debt received: ${debt.name}`,

                  date:
                    receivedDate,

                  userId:
                    user.id,

                  accountId,

                  debtReceivedId:
                    received.id,
                },
              });
          }

          return {
            debt,

            received,

            transaction,
          };
        },
      );

    // ==================================================
    // RESPONSE
    // ==================================================

    return NextResponse.json(
      {
        debt: {
          id:
            result.debt.id,

          name:
            result.debt.name,

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

          dueDate:
            result.debt.dueDate,

          note:
            result.debt.note,

          priority:
            result.debt.priority,

          status:
            result.debt.status,

          totalPaid: 0,

          remaining:
            originalAmount,

          totalReceived:
            result.received
              ? Number(
                  result.received
                    .amount,
                )
              : 0,

          remainingToReceive:
            result.received
              ? Math.max(
                  originalAmount -
                    Number(
                      result.received
                        .amount,
                    ),
                  0,
                )
              : originalAmount,

          createdAt:
            result.debt
              .createdAt,

          updatedAt:
            result.debt
              .updatedAt,
        },

        received:
          result.received
            ? {
                id:
                  result.received
                    .id,

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
              }
            : null,

        transaction:
          result.transaction
            ? {
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
              }
            : null,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Failed to create debt:",
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

    if (
      error?.message ===
      "ACCOUNT_NOT_FOUND"
    ) {
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

    return NextResponse.json(
      {
        error:
          "Failed to create debt.",
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