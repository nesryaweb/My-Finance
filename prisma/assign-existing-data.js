const { prisma } = require("../lib/prisma");

const USER_ID = "cmt68wk4p0000pcviv3382fpz";

async function main() {
  console.log("Assigning existing data to user:", USER_ID);

  const accounts = await prisma.account.updateMany({
    where: {
      userId: null,
    },
    data: {
      userId: USER_ID,
    },
  });

  const categoryGroups = await prisma.categoryGroup.updateMany({
    where: {
      userId: null,
    },
    data: {
      userId: USER_ID,
    },
  });

  const budgets = await prisma.budget.updateMany({
    where: {
      userId: null,
    },
    data: {
      userId: USER_ID,
    },
  });

  const transactions = await prisma.transaction.updateMany({
    where: {
      userId: null,
    },
    data: {
      userId: USER_ID,
    },
  });

  const incomes = await prisma.income.updateMany({
    where: {
      userId: null,
    },
    data: {
      userId: USER_ID,
    },
  });

  const debts = await prisma.debt.updateMany({
    where: {
      userId: null,
    },
    data: {
      userId: USER_ID,
    },
  });

  const goals = await prisma.financialGoal.updateMany({
    where: {
      userId: null,
    },
    data: {
      userId: USER_ID,
    },
  });

  console.log("\nDone.\n");

  console.log("Accounts:", accounts.count);
  console.log("Category groups:", categoryGroups.count);
  console.log("Budgets:", budgets.count);
  console.log("Transactions:", transactions.count);
  console.log("Income:", incomes.count);
  console.log("Debts:", debts.count);
  console.log("Goals:", goals.count);
}

main()
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });