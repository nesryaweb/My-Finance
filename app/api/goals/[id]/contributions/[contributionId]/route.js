import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ======================================================
// UPDATE CONTRIBUTION
// ======================================================

export async function PATCH(request, { params }) {
  try {
    const { id: goalId, contributionId } = await params;

    const body = await request.json();

    const amount = Number(body.amount);
    const note = body.note?.trim() || null;
    const date = body.date ? new Date(body.date) : new Date();

    // --------------------------------------------------
    // VALIDATE AMOUNT
    // --------------------------------------------------

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          error: "Amount must be greater than 0.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // VALIDATE DATE
    // --------------------------------------------------

    if (Number.isNaN(date.getTime())) {
      return NextResponse.json(
        {
          error: "Invalid contribution date.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // FIND CONTRIBUTION
    // --------------------------------------------------

    const existingContribution = await prisma.goalContribution.findFirst({
      where: {
        id: contributionId,
        goalId,
      },
      include: {
        goal: {
          include: {
            contributions: true,
          },
        },
        account: {
          include: {
            incomeAllocations: true,
            transactions: true,
          },
        },
        transaction: true,
      },
    });

    if (!existingContribution) {
      return NextResponse.json(
        {
          error: "Contribution not found.",
        },
        { status: 404 },
      );
    }

    // --------------------------------------------------
    // CHECK GOAL
    // --------------------------------------------------

    if (existingContribution.goal.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error: "This goal is no longer active.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // CURRENT CONTRIBUTION
    // --------------------------------------------------

    const oldAmount = Number(existingContribution.amount);

    const difference = amount - oldAmount;

    // --------------------------------------------------
    // CALCULATE CURRENT SAVINGS
    //
    // Remove the old contribution from the calculation,
    // then add the new amount.
    // --------------------------------------------------

    const currentSaved =
      existingContribution.goal.contributions?.reduce(
        (total, contribution) => total + Number(contribution.amount || 0),
        0,
      ) || 0;

    const newSaved = currentSaved + difference;

    const targetAmount = Number(existingContribution.goal.targetAmount);

    // --------------------------------------------------
    // CHECK GOAL TARGET
    // --------------------------------------------------

    if (newSaved > targetAmount) {
      return NextResponse.json(
        {
          error: `Contribution would exceed the goal target. You only need ${Math.max(
            targetAmount - currentSaved,
            0,
          ).toLocaleString()} birr.`,
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // CHECK ACCOUNT BALANCE
    //
    // Only the difference matters.
    // --------------------------------------------------

    if (difference > 0) {
      const account = existingContribution.account;

      const allocated = account.incomeAllocations.reduce(
        (total, allocation) => total + Number(allocation.amount || 0),
        0,
      );

      const outgoing = account.transactions.reduce((total, transaction) => {
        if (
          transaction.type === "EXPENSE" ||
          transaction.type === "GOAL_CONTRIBUTION"
        ) {
          return total + Number(transaction.amount || 0);
        }

        return total;
      }, 0);

      // Add the old contribution back because
      // we're replacing it with the new amount.
      const availableBalance = allocated - outgoing + oldAmount;

      if (difference > availableBalance) {
        return NextResponse.json(
          {
            error: `Not enough money in this account. Available balance: ${availableBalance.toLocaleString()} birr.`,
          },
          { status: 400 },
        );
      }
    }

    // --------------------------------------------------
    // UPDATE EXISTING RECORDS
    // --------------------------------------------------

    const result = await prisma.$transaction(async (tx) => {
      // ----------------------------------------------
      // UPDATE TRANSACTION
      // ----------------------------------------------

      let transaction = null;

      if (existingContribution.transactionId) {
        transaction = await tx.transaction.update({
          where: {
            id: existingContribution.transactionId,
          },
          data: {
            amount: String(amount),
            note: note
              ? `Goal contribution: ${existingContribution.goal.name} — ${note}`
              : `Goal contribution: ${existingContribution.goal.name}`,
            date,
          },
        });
      }

      // ----------------------------------------------
      // UPDATE CONTRIBUTION
      // ----------------------------------------------

      const contribution = await tx.goalContribution.update({
        where: {
          id: contributionId,
        },
        data: {
          amount: String(amount),
          note,
          date,
        },
        include: {
          goal: true,
          account: true,
          transaction: true,
        },
      });

      // ----------------------------------------------
      // UPDATE GOAL STATUS
      // ----------------------------------------------

      if (newSaved >= targetAmount) {
        await tx.financialGoal.update({
          where: {
            id: goalId,
          },
          data: {
            status: "COMPLETED",
          },
        });
      } else {
        await tx.financialGoal.update({
          where: {
            id: goalId,
          },
          data: {
            status: "ACTIVE",
          },
        });
      }

      return {
        contribution,
        savedAmount: newSaved,
        remainingAmount: Math.max(targetAmount - newSaved, 0),
        progress:
          targetAmount > 0 ? Math.min((newSaved / targetAmount) * 100, 100) : 0,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to update goal contribution:", error);

    return NextResponse.json(
      {
        error: "Failed to update contribution.",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

// ======================================================
// DELETE CONTRIBUTION
// ======================================================

export async function DELETE(request, { params }) {
  try {
    const { id: goalId, contributionId } = await params;

    // --------------------------------------------------
    // FIND CONTRIBUTION
    // --------------------------------------------------

    const contribution = await prisma.goalContribution.findFirst({
      where: {
        id: contributionId,
        goalId,
      },
      include: {
        goal: true,
      },
    });

    if (!contribution) {
      return NextResponse.json(
        {
          error: "Contribution not found.",
        },
        { status: 404 },
      );
    }

    const amount = Number(contribution.amount);

    // --------------------------------------------------
    // CALCULATE NEW SAVINGS
    // --------------------------------------------------

    const goalContributions = await prisma.goalContribution.findMany({
      where: {
        goalId,
      },
    });

    const currentSaved = goalContributions.reduce(
      (total, item) => total + Number(item.amount || 0),
      0,
    );

    const newSaved = Math.max(currentSaved - amount, 0);

    // --------------------------------------------------
    // DELETE
    // --------------------------------------------------

    await prisma.$transaction(async (tx) => {
      // ----------------------------------------------
      // DELETE LINKED TRANSACTION
      // ----------------------------------------------

      if (contribution.transactionId) {
        await tx.transaction.delete({
          where: {
            id: contribution.transactionId,
          },
        });
      }

      // ----------------------------------------------
      // DELETE CONTRIBUTION
      // ----------------------------------------------

      await tx.goalContribution.delete({
        where: {
          id: contributionId,
        },
      });

      // ----------------------------------------------
      // REACTIVATE GOAL
      // ----------------------------------------------

      await tx.financialGoal.update({
        where: {
          id: goalId,
        },
        data: {
          status:
            newSaved >= Number(contribution.goal.targetAmount)
              ? "COMPLETED"
              : "ACTIVE",
        },
      });
    });

    return NextResponse.json({
      success: true,
      savedAmount: newSaved,
      remainingAmount: Math.max(
        Number(contribution.goal.targetAmount) - newSaved,
        0,
      ),
    });
  } catch (error) {
    console.error("Failed to delete goal contribution:", error);

    return NextResponse.json(
      {
        error: "Failed to delete contribution.",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
