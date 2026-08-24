"use client";

import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAllBudgetCategories, setShowAllBudgetCategories] = useState(false);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/dashboard");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load dashboard");
      }

      setData(result);
    } catch (error) {
      console.error(error);
      setError(error.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-6 pb-24 sm:px-6 md:pb-6">
        <p>Loading dashboard...</p>
      </main>
    );
  }

  // ==================================================
  // ERROR
  // ==================================================

  if (error) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      </main>
    );
  }

  // ==================================================
  // DATA
  // ==================================================

  const totals = data?.totals || {};
  const budget = data?.budget;
  const accounts = data?.accounts || [];
  const categorySpending = data?.categorySpending || [];
  const recentTransactions = data?.recentTransactions || [];

  return (
    <main className="mx-auto max-w-6xl p-1 sm:p-4 md:p-6">
      {/* ==================================================
            HEADER
        ================================================== */}

      <header className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        <p className="mt-1 text-muted-foreground">
          Here's what's happening with your money.
        </p>
      </header>

      {/* ==================================================
            TOTAL MONEY SUMMARY
        ================================================== */}

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <SummaryCard title="Total Balance" value={totals.balance} />

        <SummaryCard title="Allocated" value={totals.allocated} />

        <SummaryCard title="Expenses" value={totals.expenses} />

        <SummaryCard
          title="Remaining"
          value={totals.remaining}
          negative={Number(totals.remaining || 0) < 0}
        />
      </section>

      {/* ==================================================
            MONTHLY BUDGET
        ================================================== */}

      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Monthly Budget</h2>

          <p className="text-sm text-muted-foreground">
            {getMonthName(data?.month)} {data?.year}
          </p>
        </div>

        {!budget ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="font-medium">No budget created for this month.</p>

            <p className="mt-1 text-sm text-muted-foreground">
              Go to Budget to start planning your money.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-6">
            {/* Budget totals */}

            <div className="grid grid-cols-3 gap-5">
              <div>
                <p className="text-sm text-muted-foreground">Budgeted</p>

                <p className="mt-1 text-xl font-bold sm:text-2xl">
                  {formatMoney(budget.totalBudgeted)}{" "}
                  <span className="text-xs text-gray-500">birr</span>
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Spent</p>

                <p className="mt-1 text-xl font-bold sm:text-2xl">
                  {formatMoney(budget.totalSpent)}{" "}
                  <span className="text-xs text-gray-500">birr</span>
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>

                <p
                  className={`mt-1 text-xl font-bold sm:text-2xl ${
                    Number(budget.totalRemaining || 0) < 0
                      ? "text-destructive"
                      : ""
                  }`}
                >
                  {formatMoney(budget.totalRemaining)}{" "}
                  <span className="text-xs text-gray-500">birr</span>
                </p>
              </div>
            </div>

            {/* Overall budget progress */}

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Budget used</span>

                <span className="font-medium">
                  {Number(budget.percentage || 0)}%
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${
                    Number(budget.percentage || 0) > 100
                      ? "bg-destructive"
                      : "bg-primary"
                  }`}
                  style={{
                    width: `${Math.min(Number(budget.percentage || 0), 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Budget by category */}

            {budget.categories && budget.categories.length > 0 && (
              <div className="mt-8">
                <h3 className="mb-4 font-semibold">Budget by category</h3>

                <div className="grid grid-cols-2 gap-10">
                  {(showAllBudgetCategories
                    ? budget.categories
                    : budget.categories.slice(0, 3)
                  ).map((item) => (
                    <BudgetProgress
                      key={`${item.categoryId}-${item.accountId}`}
                      item={item}
                    />
                  ))}
                </div>

                {budget.categories.length > 3 && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowAllBudgetCategories((previous) => !previous)
                    }
                    className="mt-5 w-full cursor-pointer rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
                  >
                    {showAllBudgetCategories
                      ? "Show less"
                      : `Show ${budget.categories.length - 3} more`}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ==================================================
            ACCOUNTS
        ================================================== */}

      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Accounts</h2>

          <p className="text-sm text-muted-foreground">
            Money allocated to each account and what's left.
          </p>
        </div>

        {accounts.length === 0 ? (
          <EmptyState message="No accounts yet." />
        ) : (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        )}
      </section>

      {/* ==================================================
            LOWER SECTIONS
        ================================================== */}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* ==================================================
              SPENDING BY CATEGORY
          ================================================== */}

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Spending by category</h2>

            <p className="text-sm text-muted-foreground">
              Where your money is going this month.
            </p>
          </div>

          {categorySpending.length === 0 ? (
            <EmptyState message="No expenses this month." />
          ) : (
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-card sm:grid-cols-1">
              {categorySpending.map((item, index) => (
                <Card
                  key={item.categoryId}
                  className="grid grid-cols-4 items-center p-2 sm:grid-cols-8"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {index + 1}
                  </span>

                  <div className="col-span-3 flex flex-col gap-2 sm:col-span-7 sm:flex-row sm:justify-between sm:px-6">
                    <span className="font-medium">{item.category}</span>

                    <span className="font-semibold">
                      {formatMoney(item.amount)}{" "}
                      <span className="text-xs text-gray-500">birr</span>
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* ==================================================
              RECENT EXPENSES
          ================================================== */}

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Recent expenses</h2>

            <p className="text-sm text-muted-foreground">
              Your latest spending.
            </p>
          </div>

          {recentTransactions.length === 0 ? (
            <EmptyState message="No expenses yet." />
          ) : (
            <div className="grid grid-cols-2 gap-1 rounded-xl border bg-card sm:grid-cols-1">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex flex-col border-b px-5 py-4 last:border-b-0 sm:flex-row sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {transaction.category || "Expense"}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {transaction.account}

                      {transaction.note && ` • ${transaction.note}`}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(transaction.date)}
                    </p>
                  </div>

                  <p className="whitespace-nowrap text-right font-semibold text-destructive">
                    -{formatMoney(transaction.amount)}{" "}
                    <span className="text-xs text-gray-500">birr</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

// ==================================================
// SUMMARY CARD
// ==================================================

function SummaryCard({ title, value = 0, negative = false }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{title}</p>

      <p
        className={`mt-2 text-2xl font-bold ${
          negative ? "text-destructive" : ""
        }`}
      >
        {formatMoney(value)} <span className="text-xs text-gray-500">birr</span>
      </p>
    </div>
  );
}

// ==================================================
// ACCOUNT CARD
// ==================================================

function AccountCard({ account }) {
  const allocated = Number(account.allocated || 0);
  const expenses = Number(account.expenses || 0);
  const balance = Number(account.balance || 0);

  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-2">
      {/* Account name */}

      <div>
        <p className="text-xl font-semibold">{account.name}</p>

        {account.type && (
          <p className="mt-1 text-sm text-muted-foreground">{account.type}</p>
        )}
      </div>

      {/* Current balance */}

      <div className="flex justify-end gap-2 sm:flex-col">
        <div className="flex items-baseline gap-1">
          <p className="text-sm text-muted-foreground">Balance:</p>

          <p
            className={`text-xl font-bold sm:text-2xl ${
              balance < 0 ? "text-destructive" : ""
            }`}
          >
            {formatMoney(balance)}{" "}
            <span className="text-xs text-gray-500">birr</span>
          </p>
        </div>
      </div>

      {/* Account details */}

      <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div className="flex items-baseline justify-end gap-1 sm:flex-col">
          <p className="text-muted-foreground">Allocated:</p>

          <p className="font-medium">
            {formatMoney(allocated)}{" "}
            <span className="text-xs text-gray-500">birr</span>
          </p>
        </div>

        <div className="flex items-baseline justify-end gap-1 sm:flex-col">
          <p className="text-muted-foreground">Expenses:</p>

          <p className="font-medium">
            {formatMoney(expenses)}{" "}
            <span className="text-xs text-gray-500">birr</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ==================================================
// BUDGET PROGRESS
// ==================================================

function BudgetProgress({ item }) {
  const percentage = Math.min(Number(item.percentage || 0), 100);

  const spent = Number(item.spent || 0);
  const budgeted = Number(item.budgeted || 0);
  const remaining = Number(item.remaining || 0);

  const fundedAmount = Number(item.fundedAmount || 0);

  const unfundedAmount = Number(item.unfundedAmount || 0);

  const overBudget = spent > budgeted;

  let statusText = "Not funded";
  let statusClass = "bg-destructive/10 text-destructive";

  if (item.fundingStatus === "FUNDED") {
    statusText = "Funded";
    statusClass = "bg-green-100 text-green-700";
  }

  if (item.fundingStatus === "PARTIALLY_FUNDED") {
    statusText = "Partially funded";
    statusClass = "bg-yellow-100 text-yellow-700";
  }

  return (
    <div>
      {/* Header */}

      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{item.category}</p>

            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass}`}
            >
              {statusText}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">{item.account}</p>
        </div>

        <div className="text-right text-sm">
          <p className="font-medium">
            {formatMoney(spent)} / {formatMoney(budgeted)}{" "}
            <span className="text-xs text-gray-500">birr</span>
          </p>

          <p
            className={
              overBudget ? "text-destructive" : "text-muted-foreground"
            }
          >
            {formatMoney(remaining)}{" "}
            <span className="text-xs text-gray-500">birr</span> remaining
          </p>
        </div>
      </div>

      {/* Budget progress */}

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${
            overBudget ? "bg-destructive" : "bg-primary"
          }`}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      {/* Funding details */}

      <div className="mt-2 text-xs text-muted-foreground">
        {item.fundingStatus === "FUNDED" && (
          <span>{formatMoney(fundedAmount)} birr funded</span>
        )}

        {item.fundingStatus === "PARTIALLY_FUNDED" && (
          <span>
            {formatMoney(fundedAmount)} birr funded
            {" • "}
            {formatMoney(unfundedAmount)} birr not funded
          </span>
        )}

        {item.fundingStatus === "NOT_FUNDED" && (
          <span>{formatMoney(unfundedAmount)} birr not funded</span>
        )}
      </div>
    </div>
  );
}

// ==================================================
// EMPTY STATE
// ==================================================

function EmptyState({ message }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

// ==================================================
// FORMAT MONEY
// ==================================================

function formatMoney(value) {
  return Number(value || 0).toLocaleString();
}

// ==================================================
// FORMAT DATE
// ==================================================

function formatDate(date) {
  if (!date) {
    return "";
  }

  return new Date(date).toLocaleDateString();
}

// ==================================================
// MONTH NAME
// ==================================================

function getMonthName(month) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return months[Number(month) - 1] || "";
}
