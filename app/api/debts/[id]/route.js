import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

// ======================================================
// GET ONE DEBT
// ======================================================

export async function GET(request, { params }) {
  try {
    const user = await requireUser();

    const { id } = await params;

    const debt = await prisma.debt.findFirst({
      where: {
        id,
        userId: user.id,
      },

      include: {
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

    const originalAmount = Number(
      debt.originalAmount || 0,
    );

    const totalPaid = debt.payments.reduce(
      (total, payment) => {
        return (
          total +
          Number(payment.amount || 0)
        );
      },
      0,
    );

    const totalReceived = debt.received.reduce(
      (total, received) => {
        return (
          total +
          Number(received.amount || 0)
        );
      },
      0,
    );

    const remaining = Math.max(
      originalAmount - totalPaid,
      0,
    );

    const remainingToReceive = Math.max(
      originalAmount - totalReceived,
      0,
    );

    return NextResponse.json({
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

      status:
        remaining <= 0
          ? "PAID"
          : debt.status,

      totalPaid,

      remaining,

      totalReceived,

      remainingToReceive,

      createdAt: debt.createdAt,

      updatedAt: debt.updatedAt,

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

          account:
            payment.account,

          createdAt:
            payment.createdAt,
        }),
      ),

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

          account:
            received.account,

          createdAt:
            received.createdAt,
        }),
      ),
    });
  } catch (error) {
    console.error(
      "Failed to fetch debt:",
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
          "Failed to fetch debt.",
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
// UPDATE DEBT
// ======================================================

export async function PUT(request, { params }) {
  try {
    const user = await requireUser();

    const { id } = await params;

    const body =
      await request.json();

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

    const dueDate =
      body.dueDate
        ? new Date(
            body.dueDate,
          )
        : null;

    const note =
      body.note?.trim() ||
      null;

    // ==================================================
    // FIND DEBT
    // ==================================================

    const debt =
      await prisma.debt.findFirst({
        where: {
          id,
          userId: user.id,
        },

        include: {
          payments: true,
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
    // TOTAL PAID
    // ==================================================

    const totalPaid =
      debt.payments.reduce(
        (total, payment) => {
          return (
            total +
            Number(
              payment.amount || 0,
            )
          );
        },
        0,
      );

    // ==================================================
    // CANNOT LOWER DEBT BELOW PAID AMOUNT
    // ==================================================

    if (
      originalAmount <
      totalPaid
    ) {
      return NextResponse.json(
        {
          error: `Original amount cannot be less than the ${totalPaid.toLocaleString()} birr already paid.`,
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
      minimumPayment !==
        null &&
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
    // VALIDATE DATE
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
    // STATUS
    // ==================================================

    const remaining =
      Math.max(
        originalAmount -
          totalPaid,
        0,
      );

    const status =
      remaining <= 0
        ? "PAID"
        : "ACTIVE";

    // ==================================================
    // UPDATE
    // ==================================================

    const updatedDebt =
      await prisma.debt.update({
        where: {
          id: debt.id,
        },

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

          status,
        },
      });

    return NextResponse.json({
      id: updatedDebt.id,

      name:
        updatedDebt.name,

      originalAmount:
        Number(
          updatedDebt.originalAmount,
        ),

      minimumPayment:
        updatedDebt.minimumPayment !==
        null
          ? Number(
              updatedDebt.minimumPayment,
            )
          : null,

      priority:
        updatedDebt.priority,

      dueDate:
        updatedDebt.dueDate,

      note:
        updatedDebt.note,

      status:
        updatedDebt.status,

      totalPaid,

      remaining,

      createdAt:
        updatedDebt.createdAt,

      updatedAt:
        updatedDebt.updatedAt,
    });
  } catch (error) {
    console.error(
      "Failed to update debt:",
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
          "Failed to update debt.",
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
// DELETE DEBT
//
// A debt can ALWAYS be deleted.
//
// The API deliberately does not block deletion when
// payment or received history exists.
//
// The frontend should warn the user before deletion.
// ======================================================

export async function DELETE(
  request,
  { params },
) {
  try {
    const user =
      await requireUser();

    const { id } =
      await params;

    // ==================================================
    // FIND DEBT BELONGING TO CURRENT USER
    // ==================================================

    const debt =
      await prisma.debt.findFirst({
        where: {
          id,
          userId: user.id,
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
    // DELETE
    //
    // DebtPayment and DebtReceived use onDelete:
    // Cascade in the Prisma schema, so their records
    // are removed together with the debt.
    //
    // Their related Transaction records must be handled
    // separately because the Transaction relation does
    // not currently have onDelete: Cascade.
    // ==================================================

    await prisma.$transaction(
      async (tx) => {
        // ------------------------------------------------
        // DELETE TRANSACTIONS CONNECTED TO PAYMENTS
        // ------------------------------------------------

        if (
          debt.payments.length >
          0
        ) {
          await tx.transaction.deleteMany(
            {
              where: {
                debtPaymentId: {
                  in: debt.payments.map(
                    (payment) =>
                      payment.id,
                  ),
                },
              },
            },
          );
        }

        // ------------------------------------------------
        // DELETE TRANSACTIONS CONNECTED
        // TO RECEIVED MONEY
        // ------------------------------------------------

        if (
          debt.received.length >
          0
        ) {
          await tx.transaction.deleteMany(
            {
              where: {
                debtReceivedId: {
                  in: debt.received.map(
                    (received) =>
                      received.id,
                  ),
                },
              },
            },
          );
        }

        // ------------------------------------------------
        // DELETE DEBT
        //
        // This also cascades to:
        //
        // DebtPayment
        // DebtReceived
        // ------------------------------------------------

        await tx.debt.delete({
          where: {
            id: debt.id,
          },
        });
      },
    );

    return NextResponse.json({
      success: true,

      message:
        "Debt deleted successfully.",

      deleted: {
        id: debt.id,

        name: debt.name,

        paymentCount:
          debt.payments.length,

        receivedCount:
          debt.received.length,
      },
    });
  } catch (error) {
    console.error(
      "Failed to delete debt:",
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
          "Failed to delete debt.",
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
