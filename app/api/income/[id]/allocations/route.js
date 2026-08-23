import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export async function POST(request, { params }) {
  try {
    const user = await requireUser();

    const { id: incomeId } = await params;

    const body = await request.json();

    const accountId = body.accountId;
    const amount = Number(body.amount);

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
      body.amount === undefined ||
      body.amount === null ||
      body.amount === "" ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error: "Allocation amount must be greater than 0.",
        },
        {
          status: 400,
        },
      );
    }

    // ==================================================
    // FIND USER'S INCOME
    // ==================================================

    const income = await prisma.income.findFirst({
      where: {
        id: incomeId,
        userId: user.id,
      },

      include: {
        allocations: true,
      },
    });

    if (!income) {
      return NextResponse.json(
        {
          error: "Income not found.",
        },
        {
          status: 404,
        },
      );
    }

    // ==================================================
    // FIND USER'S ACCOUNT
    // ==================================================

    const account = await prisma.account.findFirst({
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
        {
          status: 404,
        },
      );
    }

    // ==================================================
    // CALCULATE REMAINING INCOME
    // ==================================================

    const totalAllocated = income.allocations.reduce(
      (total, allocation) => {
        return total + Number(allocation.amount || 0);
      },
      0,
    );

    const incomeAmount = Number(income.amount || 0);

    const remaining = incomeAmount - totalAllocated;

    // ==================================================
    // PREVENT OVER-ALLOCATION
    // ==================================================

    if (amount > remaining) {
      return NextResponse.json(
        {
          error: `You only have ${remaining.toLocaleString()} birr left to allocate from this income.`,
        },
        {
          status: 400,
        },
      );
    }

    // ==================================================
    // CREATE OR UPDATE ALLOCATION
    // ==================================================

    const allocation = await prisma.$transaction(
      async (tx) => {
        const existingAllocation =
          await tx.incomeAllocation.findUnique({
            where: {
              incomeId_accountId: {
                incomeId,
                accountId,
              },
            },
          });

        if (existingAllocation) {
          return await tx.incomeAllocation.update({
            where: {
              id: existingAllocation.id,
            },

            data: {
              amount: String(
                Number(existingAllocation.amount || 0) +
                  amount,
              ),
            },

            include: {
              account: true,
              income: true,
            },
          });
        }

        return await tx.incomeAllocation.create({
          data: {
            amount: String(amount),
            incomeId,
            accountId,
          },

          include: {
            account: true,
            income: true,
          },
        });
      },
    );

    // ==================================================
    // RESPONSE
    // ==================================================

    return NextResponse.json(
      {
        id: allocation.id,

        amount: Number(
          allocation.amount || 0,
        ),

        incomeId: allocation.incomeId,

        accountId: allocation.accountId,

        account: allocation.account,

        income: allocation.income,

        totalAllocated:
          totalAllocated + amount,

        remaining:
          remaining - amount,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Failed to create income allocation:",
      error,
    );

    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    return NextResponse.json(
      {
        error:
          "Failed to create income allocation.",
        details:
          error?.message || "Unknown error",
      },
      {
        status: 500,
      },
    );
  }
}