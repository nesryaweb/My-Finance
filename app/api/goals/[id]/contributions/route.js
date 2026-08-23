import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ======================================================
// ADD CONTRIBUTION TO GOAL
// ======================================================

export async function POST(request, { params }) {
  try {
    const { id: goalId } = await params;
const user = await requireUser();
    const body = await request.json();

    const { amount, accountId, note, date } = body;

    // --------------------------------------------------
    // VALIDATE AMOUNT
    // --------------------------------------------------

    if (
      amount === undefined ||
      amount === null ||
      amount === "" ||
      Number(amount) <= 0
    ) {
      return NextResponse.json(
        {
          error: "Amount must be greater than 0.",
        },
        {
          status: 400,
        },
      );
    }

    const contributionAmount = Number(amount);

    // --------------------------------------------------
    // VALIDATE ACCOUNT
    // --------------------------------------------------

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

    // --------------------------------------------------
    // FIND GOAL
    // --------------------------------------------------

  const goal = await prisma.financialGoal.findFirst({
  where: {
    id: goalId,
    userId: user.id,
  },
  include: {
    contributions: true,
  },
});

    if (!goal) {
      return NextResponse.json(
        {
          error: "Financial goal not found.",
        },
        {
          status: 404,
        },
      );
    }

    // --------------------------------------------------
    // CHECK GOAL STATUS
    // --------------------------------------------------

    if (goal.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error: "This goal is no longer active.",
        },
        {
          status: 400,
        },
      );
    }

    // --------------------------------------------------
    // CALCULATE CURRENT SAVINGS
    // --------------------------------------------------

    const currentSaved = goal.contributions.reduce((total, contribution) => {
      return total + Number(contribution.amount);
    }, 0);

    const remainingAmount = Number(goal.targetAmount) - currentSaved;

    // --------------------------------------------------
    // DON'T ALLOW CONTRIBUTION ABOVE TARGET
    // --------------------------------------------------

    if (contributionAmount > remainingAmount) {
      return NextResponse.json(
        {
          error: `This contribution is too large. You only need ${Math.max(
            remainingAmount,
            0,
          ).toLocaleString()} birr to reach this goal.`,
        },
        {
          status: 400,
        },
      );
    }

    // --------------------------------------------------
    // FIND ACCOUNT
    // --------------------------------------------------

    const account = await prisma.account.findFirst({
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

    // --------------------------------------------------
    // CALCULATE AVAILABLE ACCOUNT BALANCE
    // --------------------------------------------------

    const allocated = account.incomeAllocations.reduce((total, allocation) => {
      return total + Number(allocation.amount || 0);
    }, 0);

    const outgoingTransactions = account.transactions.reduce(
      (total, transaction) => {
        if (
          transaction.type === "EXPENSE" ||
          transaction.type === "GOAL_CONTRIBUTION"
        ) {
          return total + Number(transaction.amount || 0);
        }

        return total;
      },
      0,
    );

    const availableBalance = allocated - outgoingTransactions;

    // --------------------------------------------------
    // CHECK ACCOUNT BALANCE
    // --------------------------------------------------

    if (contributionAmount > availableBalance) {
      return NextResponse.json(
        {
          error: `Not enough money in this account. Available balance: ${availableBalance.toLocaleString()} birr.`,
        },
        {
          status: 400,
        },
      );
    }

    // --------------------------------------------------
    // CREATE CONTRIBUTION + TRANSACTION
    // --------------------------------------------------

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          amount: String(amount),
          type: "GOAL_CONTRIBUTION",
          note: note
            ? `Goal contribution: ${goal.name} — ${note}`
            : `Goal contribution: ${goal.name}`,
          date,
          accountId,
        },
      });

      const contribution = await tx.goalContribution.create({
        data: {
          amount: String(amount),
          date,
          note,
          goalId,
          accountId,
          transactionId: transaction.id,
        },
        include: {
          goal: true,
          account: true,
          transaction: true,
        },
      });

      return contribution;
    });

    // --------------------------------------------------
    // CALCULATE NEW PROGRESS
    // --------------------------------------------------

    const newSaved = currentSaved + contributionAmount;

    const targetAmount = Number(goal.targetAmount);

    const newRemaining = Math.max(targetAmount - newSaved, 0);

    const progress =
      targetAmount > 0 ? Math.min((newSaved / targetAmount) * 100, 100) : 0;

    // --------------------------------------------------
    // MARK GOAL COMPLETE
    // --------------------------------------------------

    if (newSaved >= targetAmount) {
      await prisma.financialGoal.update({
        where: {
          id: goalId,
        },
        data: {
          status: "COMPLETED",
        },
      });
    }

    return NextResponse.json(
      {
        contribution: result,
        savedAmount: newSaved,
        remainingAmount: newRemaining,
        progress,
        completed: newSaved >= targetAmount,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("Failed to add goal contribution:", error);

    return NextResponse.json(
      {
        error: "Failed to add goal contribution.",
        details: error.message,
      },
      {
        status: 500,
      },
    );
  }
}
