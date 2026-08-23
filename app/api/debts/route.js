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

    const formattedDebts = debts.map((debt) => {
      const originalAmount = Number(
        debt.originalAmount || 0
      );

      const totalPaid = debt.payments.reduce(
        (total, payment) => {
          return total + Number(payment.amount || 0);
        },
        0
      );

      const remaining = Math.max(
        originalAmount - totalPaid,
        0
      );

      return {
        id: debt.id,

        name: debt.name,

        originalAmount,

        minimumPayment: debt.minimumPayment
          ? Number(debt.minimumPayment)
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

        createdAt: debt.createdAt,

        updatedAt: debt.updatedAt,

        payments: debt.payments.map((payment) => ({
          id: payment.id,

          amount: Number(
            payment.amount || 0
          ),

          date: payment.date,

          note: payment.note,

          accountId: payment.accountId,

          account: payment.account,

          createdAt: payment.createdAt,
        })),
      };
    });

    return NextResponse.json(formattedDebts);
  } catch (error) {
    console.error(
      "Failed to fetch debts:",
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
        error: "Failed to fetch debts",
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
// CREATE DEBT
// ======================================================

export async function POST(request) {
  try {
    const user = await requireUser();

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

    const priority =
      body.priority !== undefined &&
      body.priority !== ""
        ? Number(body.priority)
        : 1;

    const note =
      body.note?.trim() || null;

    const dueDate = body.dueDate
      ? new Date(body.dueDate)
      : null;

    // ==================================================
    // VALIDATE NAME
    // ==================================================

    if (!name) {
      return NextResponse.json(
        {
          error: "Debt name is required.",
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
    // VALIDATE MINIMUM PAYMENT
    // ==================================================

    if (
      minimumPayment !== null &&
      (
        !Number.isFinite(minimumPayment) ||
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
    // VALIDATE PRIORITY
    // ==================================================

    if (
      !Number.isInteger(priority) ||
      priority < 1
    ) {
      return NextResponse.json(
        {
          error:
            "Priority must be a whole number greater than 0.",
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
      Number.isNaN(dueDate.getTime())
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
    // CREATE DEBT FOR CURRENT USER
    // ==================================================

    const debt = await prisma.debt.create({
      data: {
        name,

        originalAmount: String(
          originalAmount
        ),

        minimumPayment:
          minimumPayment !== null
            ? String(minimumPayment)
            : null,

        priority,

        dueDate,

        note,

        status: "ACTIVE",

        userId: user.id,
      },
    });

    // ==================================================
    // RETURN FORMATTED DEBT
    // ==================================================

    return NextResponse.json(
      {
        id: debt.id,

        name: debt.name,

        originalAmount: Number(
          debt.originalAmount
        ),

        minimumPayment:
          debt.minimumPayment
            ? Number(
                debt.minimumPayment
              )
            : null,

        dueDate: debt.dueDate,

        note: debt.note,

        priority: debt.priority,

        status: debt.status,

        createdAt: debt.createdAt,

        updatedAt: debt.updatedAt,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Failed to create debt:",
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
        error: "Failed to create debt.",
        details:
          error?.message || "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}