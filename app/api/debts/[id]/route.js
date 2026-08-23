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

          orderBy: {
            date: "desc",
          },
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
        }
      );
    }

    const originalAmount = Number(
      debt.originalAmount || 0
    );

    const totalPaid = debt.payments.reduce(
      (total, payment) =>
        total + Number(payment.amount || 0),
      0
    );

    const remaining = Math.max(
      originalAmount - totalPaid,
      0
    );

    return NextResponse.json({
      id: debt.id,

      name: debt.name,

      originalAmount,

      minimumPayment:
        debt.minimumPayment
          ? Number(
              debt.minimumPayment
            )
          : null,

      dueDate: debt.dueDate,

      note: debt.note,

      status:
        remaining <= 0
          ? "PAID"
          : debt.status,

      totalPaid,

      remaining,

      createdAt: debt.createdAt,

      updatedAt: debt.updatedAt,

      payments: debt.payments.map(
        (payment) => ({
          id: payment.id,

          amount: Number(
            payment.amount || 0
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
        })
      ),
    });
  } catch (error) {
    console.error(
      "Failed to fetch debt:",
      error
    );

    if (error?.message === "UNAUTHORIZED") {
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
        error: "Failed to fetch debt.",
        details:
          error?.message || "Unknown error",
      },
      {
        status: 500,
      }
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

    const body = await request.json();

    const name = body.name?.trim();

    const originalAmount = Number(
      body.originalAmount
    );

    const minimumPayment =
      body.minimumPayment !== undefined &&
      body.minimumPayment !== ""
        ? Number(body.minimumPayment)
        : null;

    const dueDate = body.dueDate
      ? new Date(body.dueDate)
      : null;

    const note =
      body.note?.trim() || null;

    // ==================================================
    // FIND DEBT BELONGING TO CURRENT USER
    // ==================================================

    const debt = await prisma.debt.findFirst({
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
          error: "Debt not found.",
        },
        {
          status: 404,
        }
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
        }
      );
    }

    // ==================================================
    // VALIDATE ORIGINAL AMOUNT
    // ==================================================

    if (
      !Number.isFinite(originalAmount) ||
      originalAmount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Original debt amount must be greater than 0.",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // CALCULATE TOTAL PAID
    // ==================================================

    const totalPaid =
      debt.payments.reduce(
        (total, payment) =>
          total +
          Number(
            payment.amount || 0
          ),
        0
      );

    // ==================================================
    // PREVENT ORIGINAL AMOUNT FROM
    // BEING LOWER THAN ALREADY PAID
    // ==================================================

    if (originalAmount < totalPaid) {
      return NextResponse.json(
        {
          error: `Original amount cannot be less than the ${totalPaid.toLocaleString()} birr already paid.`,
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // VALIDATE MINIMUM PAYMENT
    // ==================================================

    if (
      minimumPayment !== null &&
      (
        !Number.isFinite(
          minimumPayment
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
        }
      );
    }

    // ==================================================
    // VALIDATE DATE
    // ==================================================

    if (
      dueDate &&
      Number.isNaN(
        dueDate.getTime()
      )
    ) {
      return NextResponse.json(
        {
          error: "Invalid due date.",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // CALCULATE NEW STATUS
    // ==================================================

    const remaining = Math.max(
      originalAmount - totalPaid,
      0
    );

    const status =
      remaining <= 0
        ? "PAID"
        : "ACTIVE";

    // ==================================================
    // UPDATE ONLY CURRENT USER'S DEBT
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
              originalAmount
            ),

          minimumPayment:
            minimumPayment !== null
              ? String(
                  minimumPayment
                )
              : null,

          dueDate,

          note,

          status,
        },
      });

    return NextResponse.json({
      ...updatedDebt,

      originalAmount:
        Number(
          updatedDebt.originalAmount
        ),

      minimumPayment:
        updatedDebt.minimumPayment
          ? Number(
              updatedDebt.minimumPayment
            )
          : null,

      dueDate:
        updatedDebt.dueDate,

      note:
        updatedDebt.note,

      status:
        updatedDebt.status,

      totalPaid,

      remaining,
    });
  } catch (error) {
    console.error(
      "Failed to update debt:",
      error
    );

    if (error?.message === "UNAUTHORIZED") {
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
        error: "Failed to update debt.",
        details:
          error?.message || "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}

// ======================================================
// DELETE DEBT
// ======================================================

export async function DELETE(
  request,
  { params }
) {
  try {
    const user = await requireUser();

    const { id } = await params;

    // ==================================================
    // FIND DEBT BELONGING TO CURRENT USER
    // ==================================================

    const debt = await prisma.debt.findFirst({
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
          error: "Debt not found.",
        },
        {
          status: 404,
        }
      );
    }

    // ==================================================
    // PREVENT DELETING A DEBT WITH PAYMENTS
    // ==================================================

    if (debt.payments.length > 0) {
      return NextResponse.json(
        {
          error:
            "This debt has payment history and cannot be deleted.",
        },
        {
          status: 400,
        }
      );
    }

    await prisma.debt.delete({
      where: {
        id: debt.id,
      },
    });

    return NextResponse.json({
      success: true,

      message:
        "Debt deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Failed to delete debt:",
      error
    );

    if (error?.message === "UNAUTHORIZED") {
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
          "Failed to delete debt.",
        details:
          error?.message || "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}