import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

// ======================================================
// UPDATE ACCOUNT
// ======================================================

export async function PATCH(request, { params }) {
  try {
    const user = await requireUser();

    const { id } = await params;

    const body = await request.json();

    const name = body.name?.trim();
    const type = body.type?.trim() || null;

    // ==================================================
    // VALIDATE NAME
    // ==================================================

    if (!name) {
      return NextResponse.json(
        {
          error: "Account name is required.",
        },
        {
          status: 400,
        },
      );
    }

    // ==================================================
    // FIND ACCOUNT BELONGING TO CURRENT USER
    // ==================================================

    const account = await prisma.account.findFirst({
      where: {
        id,
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
    // UPDATE ACCOUNT
    // ==================================================

    const updatedAccount = await prisma.account.update({
      where: {
        id: account.id,
      },

      data: {
        name,
        type,
      },
    });

    // ==================================================
    // RESPONSE
    // ==================================================

    return NextResponse.json({
      id: updatedAccount.id,
      name: updatedAccount.name,
      type: updatedAccount.type,
      createdAt: updatedAccount.createdAt,
      updatedAt: updatedAccount.updatedAt,
    });
  } catch (error) {
    console.error("Failed to update account:", error);

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
        error: "Failed to update account.",
        details: error?.message || "Unknown error",
      },
      {
        status: 500,
      },
    );
  }
}

// ======================================================
// DELETE ACCOUNT
// ======================================================

export async function DELETE(request, { params }) {
  try {
    const user = await requireUser();

    const { id } = await params;

    // ==================================================
    // FIND ACCOUNT BELONGING TO CURRENT USER
    // ==================================================

    const account = await prisma.account.findFirst({
      where: {
        id,
        userId: user.id,
      },

      include: {
        transactions: {
          select: {
            id: true,
          },
          take: 1,
        },

        budgetAllocations: {
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    // ==================================================
    // ACCOUNT DOES NOT EXIST OR BELONG TO SOMEONE ELSE
    // ==================================================

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
    // PREVENT DELETE IF ACCOUNT HAS TRANSACTIONS
    // ==================================================

    if (account.transactions.length > 0) {
      return NextResponse.json(
        {
          error:
            "This account cannot be deleted because it is related to existing transactions.",
        },
        {
          status: 400,
        },
      );
    }

    // ==================================================
    // PREVENT DELETE IF ACCOUNT HAS BUDGET ALLOCATIONS
    // ==================================================

    if (account.budgetAllocations.length > 0) {
      return NextResponse.json(
        {
          error:
            "This account cannot be deleted because it is related to a budget.",
        },
        {
          status: 400,
        },
      );
    }

    // ==================================================
    // DELETE ACCOUNT
    // ==================================================

    await prisma.account.delete({
      where: {
        id: account.id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Failed to delete account:", error);

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
        error: "Failed to delete account.",
        details: error?.message || "Unknown error",
      },
      {
        status: 500,
      },
    );
  }
}
