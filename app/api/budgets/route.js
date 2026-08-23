import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export async function GET(request) {
  try {
    const user = await requireUser();

    const { searchParams } = new URL(request.url);

    const month = Number(searchParams.get("month"));
    const year = Number(searchParams.get("year"));

    if (!month || !year) {
      return NextResponse.json(
        {
          error: "Month and year are required",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // GET ONLY THE CURRENT USER'S BUDGET
    // ==================================================

    const budget = await prisma.budget.findFirst({
      where: {
        month,
        year,
        userId: user.id,
      },
      include: {
        allocations: {
          include: {
            category: true,
            account: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    return NextResponse.json(budget);
  } catch (error) {
    console.error("Failed to fetch budget:", error);

    if (error.message === "UNAUTHORIZED") {
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
        error: "Failed to fetch budget",
        details: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

// ======================================================
// CREATE / GET CURRENT USER'S BUDGET
// ======================================================

export async function POST(request) {
  try {
    const user = await requireUser();

    const body = await request.json();

    const month = Number(body.month);
    const year = Number(body.year);

    if (!month || !year) {
      return NextResponse.json(
        {
          error: "Month and year are required",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // CHECK IF THIS USER ALREADY HAS THIS BUDGET
    // ==================================================

    const existingBudget = await prisma.budget.findFirst({
      where: {
        month,
        year,
        userId: user.id,
      },
    });

    if (existingBudget) {
      const budget = await prisma.budget.findUnique({
        where: {
          id: existingBudget.id,
        },
        include: {
          allocations: {
            include: {
              category: true,
              account: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      return NextResponse.json(budget);
    }

    // ==================================================
    // CREATE BUDGET FOR CURRENT USER
    // ==================================================

    const budget = await prisma.budget.create({
      data: {
        month,
        year,
        userId: user.id,
      },
      include: {
        allocations: {
          include: {
            category: true,
            account: true,
          },
        },
      },
    });

    return NextResponse.json(budget, {
      status: 201,
    });
  } catch (error) {
    console.error("Failed to create budget:", error);

    if (error.message === "UNAUTHORIZED") {
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
        error: "Failed to create budget",
        details: error.message,
      },
      {
        status: 500,
      }
    );
  }
} 