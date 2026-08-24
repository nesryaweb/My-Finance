import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

// ======================================================
// GET ALL INCOME
// ======================================================

export async function GET() {
  try {
    const user = await requireUser();

    const income = await prisma.income.findMany({
      where: {
        userId: user.id,
      },

      orderBy: {
        date: "desc",
      },

      include: {
        allocations: {
          include: {
            account: true,
          },

          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    // ==================================================
    // FORMAT INCOME
    // ==================================================

    const formattedIncome = income.map((item) => {
      const amount = Number(item.amount || 0);

      const totalAllocated = item.allocations.reduce((total, allocation) => {
        return total + Number(allocation.amount || 0);
      }, 0);

      const remaining = Math.max(amount - totalAllocated, 0);

      return {
        id: item.id,

        amount,

        note: item.note,

        date: item.date,

        createdAt: item.createdAt,

        updatedAt: item.updatedAt,

        totalAllocated,

        remaining,

        allocations: item.allocations.map((allocation) => ({
          id: allocation.id,

          amount: Number(allocation.amount || 0),

          incomeId: allocation.incomeId,

          accountId: allocation.accountId,

          createdAt: allocation.createdAt,

          updatedAt: allocation.updatedAt,

          account: allocation.account,
        })),
      };
    });

    return NextResponse.json(formattedIncome);
  } catch (error) {
    console.error("Failed to fetch income:", error);

    if (error?.message === "UNAUTHORIZED") {
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
        error: "Failed to fetch income",
        details: error?.message || "Unknown error",
      },
      {
        status: 500,
      },
    );
  }
}

// ======================================================
// CREATE INCOME
// ======================================================

export async function POST(request) {
  try {
    const user = await requireUser();

    const body = await request.json();

    const amount = Number(body.amount);
    const note = body.note?.trim() || null;

    // --------------------------------------------------
    // DATE
    // --------------------------------------------------

    let date = new Date();

    if (body.date) {
      const parsedDate = new Date(body.date);

      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          {
            error: "Invalid date",
          },
          {
            status: 400,
          },
        );
      }

      date = parsedDate;
    }

    // --------------------------------------------------
    // VALIDATE AMOUNT
    // --------------------------------------------------

    if (Number.isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        {
          error: "Valid income amount is required",
        },
        {
          status: 400,
        },
      );
    }

    // --------------------------------------------------
    // CREATE INCOME FOR CURRENT USER
    // --------------------------------------------------

    const income = await prisma.income.create({
      data: {
        amount: String(amount),
        note,
        date,
        userId: user.id,
      },

      include: {
        allocations: {
          include: {
            account: true,
          },
        },
      },
    });

    return NextResponse.json(income, {
      status: 201,
    });
  } catch (error) {
    console.error("Failed to create income:", error);

    if (error?.message === "UNAUTHORIZED") {
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
        error: "Failed to create income",
        details: error?.message || "Unknown error",
      },
      {
        status: 500,
      },
    );
  }
}
