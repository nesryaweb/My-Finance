"use client";

import { useEffect, useState } from "react";

export default function BudgetPage() {
  const today = new Date();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [year, setYear] = useState(today.getFullYear());

  const [budget, setBudget] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [summary, setSummary] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  function openBudgetModal(category) {
    setSelectedCategory(category);
    setShowBudgetModal(true);
  }

  function closeBudgetModal() {
    setShowBudgetModal(false);
    setSelectedCategory(null);
  }
  async function createBudget() {
    try {
      setError("");

      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month,
          year,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create budget");
      }

      setBudget(data);

      await loadData();
    } catch (error) {
      setError(error.message);
    }
  }

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [
        budgetResponse,
        accountsResponse,
        groupsResponse,
        summaryResponse,
      ] = await Promise.all([
        fetch(`/api/budgets?month=${month}&year=${year}`),
        fetch("/api/accounts"),
        fetch("/api/category-groups"),
        fetch(`/api/budget-summary?month=${month}&year=${year}`),
      ]);

      const budgetData = await budgetResponse.json();

      const accountsData = await accountsResponse.json();

      const groupsData = await groupsResponse.json();

      const summaryData = await summaryResponse.json();

      if (!budgetResponse.ok) {
        throw new Error(budgetData.error || "Failed to load budget");
      }

      if (!accountsResponse.ok) {
        throw new Error(accountsData.error || "Failed to load accounts");
      }

      if (!groupsResponse.ok) {
        throw new Error(groupsData.error || "Failed to load categories");
      }

      if (!summaryResponse.ok) {
        throw new Error(summaryData.error || "Failed to load budget summary");
      }

      setBudget(budgetData);

      setAccounts(Array.isArray(accountsData) ? accountsData : []);

      setGroups(Array.isArray(groupsData) ? groupsData : []);

      setSummary(
        Array.isArray(summaryData.categories) ? summaryData.categories : [],
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [month, year]);

  function getCategoryAllocation(categoryId) {
    if (!budget?.allocations) {
      return null;
    }

    return budget.allocations.find(
      (allocation) => allocation.categoryId === categoryId,
    );
  }

  function getSummary(categoryId, accountId) {
    return summary.find(
      (item) => item.categoryId === categoryId && item.accountId === accountId,
    );
  }
  const totalBudgeted = (budget?.allocations || []).reduce(
    (total, allocation) => total + Number(allocation.amount || 0),
    0,
  );

  const totalSpent = (budget?.allocations || []).reduce((total, allocation) => {
    const item = getSummary(allocation.categoryId, allocation.accountId);

    return total + Number(item?.spent || 0);
  }, 0);

  const totalAvailable = totalBudgeted - totalSpent;

  const budgetPercentage =
    totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  const budgetProgressWidth = Math.min(budgetPercentage, 100);
  return (
    <div className="mx-auto max-w-f p-6">
      <header className="mb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Monthly Budget</h1>

            <p className="mt-1 text-muted-foreground">
              Plan your money for the month.
            </p>
          </div>

          <div className="flex gap-2">
            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className="rounded-md border px-3 py-2"
            >
              {[
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
              ].map((name, index) => (
                <option key={index + 1} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>

            <input
              type="number"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="w-28 rounded-md border px-3 py-2"
            />
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : !budget ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <h2 className="text-lg font-semibold">No budget for this month</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Create a budget for this month to start planning your money.
          </p>

          <button
            onClick={createBudget}
            className="mt-5 rounded-md bg-primary px-5 py-2 text-primary-foreground"
          >
            Create Budget
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Budget Summary */}
          <section className="grid gap-4  grid-cols-2 lg:grid-cols-4">
            {/* Total Budget */}
            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">Total Budget</p>

              <p className="mt-2 text-2xl font-bold">
                {totalBudgeted.toLocaleString()}{" "}
                <span className="text-xs text-gray-500">birr</span>
              </p>
            </div>

            {/* Total Spent */}
            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">Total Spent</p>

              <p className="mt-2 text-2xl font-bold">
                {totalSpent.toLocaleString()}{" "}
                <span className="text-xs text-gray-500">birr</span>
              </p>
            </div>

            {/* Remaining */}
            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">Remaining</p>

              <p
                className={`mt-2 text-2xl font-bold ${
                  totalAvailable < 0 ? "text-destructive" : ""
                }`}
              >
                {totalAvailable.toLocaleString()}{" "}
                <span className="text-xs text-gray-500">birr</span>
              </p>
            </div>

            {/* Budget Used */}
            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">Budget Used</p>

              <p
                className={`mt-2 text-2xl font-bold ${
                  totalSpent > totalBudgeted ? "text-destructive" : ""
                }`}
              >
                {Math.round(budgetPercentage)}%
              </p>

              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${
                    totalSpent > totalBudgeted ? "bg-destructive" : "bg-primary"
                  }`}
                  style={{
                    width: `${budgetProgressWidth}%`,
                  }}
                />
              </div>
            </div>
          </section>
          {groups.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center">
              <p className="font-medium">No categories yet</p>

              <p className="mt-1 text-sm text-muted-foreground">
                Create categories before planning your budget.
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <section
                key={group.id}
                className="overflow-hidden rounded-xl border bg-card"
              >
                <div className="border-b bg-muted/30 px-5 py-4">
                  <h2 className="font-semibold">{group.name}</h2>
                </div>

                <div className="divide-y">
                  {group.categories.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-muted-foreground">
                      No categories in this group.
                    </p>
                  ) : (
                    group.categories.map((category) => {
                      const allocation = getCategoryAllocation(category.id);

                      const summaryItem = allocation
                        ? getSummary(category.id, allocation.accountId)
                        : null;

                      const budgeted = Number(allocation?.amount || 0);
                      const spent = Number(summaryItem?.spent || 0);
                      const available = budgeted - spent;

                      const percentage =
                        budgeted > 0 ? (spent / budgeted) * 100 : 0;

                      const progressWidth = Math.min(percentage, 100);

                      const isOverspent = spent > budgeted;

                      // ==================================================
                      // FUNDING STATUS
                      // ==================================================

                      const fundingStatus = summaryItem?.fundingStatus || null;

                      const fundedAmount = Number(
                        summaryItem?.fundedAmount || 0,
                      );

                      const unfundedAmount = Number(
                        summaryItem?.unfundedAmount || 0,
                      );

                      const fundingPercentage =
                        budgeted > 0 ? (fundedAmount / budgeted) * 100 : 0;

                      const fundingProgressWidth = Math.min(
                        fundingPercentage,
                        100,
                      );

                      return (
                        <div key={category.id} className="px-5 py-5">
                          <div className="flex items-start justify-between gap-4">
                            {/* ==================================================
              CATEGORY INFORMATION
          ================================================== */}

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium">{category.name}</p>

                                {/* FUNDING STATUS */}

                                {allocation && fundingStatus === "funded" && (
                                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                    Funded
                                  </span>
                                )}

                                {allocation &&
                                  fundingStatus === "partially_funded" && (
                                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                                      Partially funded
                                    </span>
                                  )}

                                {allocation &&
                                  fundingStatus === "not_funded" && (
                                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                      Not funded
                                    </span>
                                  )}
                              </div>

                              {!allocation ? (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  Not budgeted yet
                                </p>
                              ) : (
                                <>
                                  {/* ==================================================
                    AMOUNTS
                ================================================== */}

                                  <div className="mt-3 grid grid-cols-2 gap-5 sm:grid-cols-4">
                                    {/* Budgeted */}

                                    <div>
                                      <p className="text-xs text-muted-foreground">
                                        Budgeted
                                      </p>

                                      <p className="mt-1 font-semibold">
                                        {budgeted.toLocaleString()}{" "}
                                        <span className="text-xs text-gray-500">
                                          birr
                                        </span>
                                      </p>
                                    </div>

                                    {/* Funded */}

                                    <div>
                                      <p className="text-xs text-muted-foreground">
                                        Funded
                                      </p>

                                      <p className="mt-1 font-semibold">
                                        {fundedAmount.toLocaleString()}{" "}
                                        <span className="text-xs text-gray-500">
                                          birr
                                        </span>
                                      </p>
                                    </div>

                                    {/* Spent */}

                                    <div>
                                      <p className="text-xs text-muted-foreground">
                                        Spent
                                      </p>

                                      <p className="mt-1 font-semibold">
                                        {spent.toLocaleString()}{" "}
                                        <span className="text-xs text-gray-500">
                                          birr
                                        </span>
                                      </p>
                                    </div>

                                    {/* Available */}

                                    <div>
                                      <p className="text-xs text-muted-foreground">
                                        Available
                                      </p>

                                      <p
                                        className={`mt-1 font-semibold ${
                                          available < 0
                                            ? "text-destructive"
                                            : ""
                                        }`}
                                      >
                                        {available.toLocaleString()}{" "}
                                        <span className="text-xs text-gray-500">
                                          birr
                                        </span>
                                      </p>
                                    </div>
                                  </div>

                                  {/* ==================================================
      

                                  {/* ==================================================
                    SPENDING PROGRESS
                ================================================== */}

                                  <div className="mt-5">
                                    <div className="mb-2 flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">
                                        {isOverspent
                                          ? "Over budget"
                                          : "Budget used"}
                                      </span>

                                      <span
                                        className={
                                          isOverspent
                                            ? "font-semibold text-destructive"
                                            : "font-medium"
                                        }
                                      >
                                        {Math.round(percentage)}%
                                      </span>
                                    </div>

                                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                                      <div
                                        className={`h-full rounded-full ${
                                          isOverspent
                                            ? "bg-destructive"
                                            : "bg-primary"
                                        }`}
                                        style={{
                                          width: `${progressWidth}%`,
                                        }}
                                      />
                                    </div>
                                  </div>

                                  {/* ==================================================
                    OVERSPENDING WARNING
                ================================================== */}

                                  {isOverspent && (
                                    <p className="mt-2 text-sm font-medium text-destructive">
                                      You are{" "}
                                      {Math.abs(available).toLocaleString()}{" "}
                                      <span className="text-xs text-gray-500">
                                        birr
                                      </span>{" "}
                                      over budget.
                                    </p>
                                  )}
                                </>
                              )}
                            </div>

                            {/* ==================================================
              ADD / EDIT BUDGET BUTTON
          ================================================== */}

                            <button
                              onClick={() => openBudgetModal(category)}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xl hover:bg-muted"
                              title={
                                allocation
                                  ? `Edit budget for ${category.name}`
                                  : `Add budget to ${category.name}`
                              }
                            >
                              {allocation ? "⋯" : "+"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            ))
          )}
        </div>
      )}

      {showBudgetModal && selectedCategory && (
        <BudgetModal
          category={selectedCategory}
          accounts={accounts}
          budgetId={budget.id}
          allocation={getCategoryAllocation(selectedCategory.id)}
          onClose={closeBudgetModal}
          onSaved={async () => {
            await loadData();
            closeBudgetModal();
          }}
        />
      )}
    </div>
  );
}

function BudgetCategoryRow({
  category,
  accounts,
  allocation,
  summary,
  budgetId,
  onSaved,
}) {
  const [amount, setAmount] = useState(
    allocation ? String(allocation.amount) : "",
  );

  const [accountId, setAccountId] = useState(allocation?.accountId || "");

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    setAmount(allocation ? String(allocation.amount) : "");

    setAccountId(allocation?.accountId || "");
  }, [allocation]);

  const summaryItem = allocation
    ? summary.find(
        (item) =>
          item.categoryId === allocation.categoryId &&
          item.accountId === allocation.accountId,
      )
    : null;

  async function saveAllocation() {
    if (!amount || Number(amount) < 0) {
      setError("Enter a valid amount.");
      return;
    }

    if (!accountId) {
      setError("Select an account.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch("/api/budget-allocations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          budgetId,
          categoryId: category.id,
          accountId,
          amount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save allocation");
      }

      await onSaved();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteAllocation() {
    if (!allocation) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(`/api/budget-allocations/${allocation.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete allocation");
      }

      setAmount("");
      setAccountId("");

      await onSaved();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  const budgeted = Number(allocation?.amount || 0);

  const spent = Number(summaryItem?.spent || 0);

  const available = budgeted - spent;

  return (
    <div className="px-5 py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="font-medium">{category.name}</p>

          {allocation && (
            <div className="mt-3 grid grid-cols-3 gap-5">
              <div>
                <p className="text-xs text-muted-foreground">Budgeted</p>

                <p className="mt-1 font-semibold">
                  {budgeted.toLocaleString()}{" "}
                  <span className="text-xs text-gray-500">birr</span>
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Spent</p>

                <p className="mt-1 font-semibold">
                  {spent.toLocaleString()}{" "}
                  <span className="text-xs text-gray-500">birr</span>
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Available</p>

                <p
                  className={`mt-1 font-semibold ${
                    available < 0 ? "text-destructive" : ""
                  }`}
                >
                  {available.toLocaleString()}{" "}
                  <span className="text-xs text-gray-500">birr</span>
                </p>
              </div>
            </div>
          )}

          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Amount"
            className="w-32 rounded-md border px-3 py-2 text-sm"
          />

          <select
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Select account</option>

            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>

          <button
            onClick={saveAllocation}
            disabled={saving}
            className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>

          {allocation && (
            <button
              onClick={deleteAllocation}
              disabled={saving}
              className="rounded-md border px-3 py-2 text-sm text-destructive disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BudgetModal({
  category,
  accounts,
  budgetId,
  allocation,
  onClose,
  onSaved,
}) {
  const [amount, setAmount] = useState(
    allocation ? String(allocation.amount) : "",
  );

  const [accountId, setAccountId] = useState(allocation?.accountId || "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveBudget() {
    if (!amount || Number(amount) < 0) {
      setError("Enter a valid amount.");
      return;
    }

    if (!accountId) {
      setError("Select an account.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch("/api/budget-allocations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          budgetId,
          categoryId: category.id,
          accountId,
          amount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save budget");
      }

      await onSaved();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteBudget() {
    if (!allocation) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(`/api/budget-allocations/${allocation.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete budget");
      }

      await onSaved();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              {allocation ? "Edit Budget" : "Add Budget"}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {category.name}
            </p>
          </div>

          <button onClick={onClose} className="text-xl text-muted-foreground">
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Amount</label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              autoFocus
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Account</label>

            <select
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              className="w-full rounded-md border px-3 py-2"
            >
              <option value="">Select account</option>

              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-between">
          <div>
            {allocation && (
              <button
                onClick={deleteBudget}
                disabled={saving}
                className="rounded-md px-4 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Cancel
            </button>

            <button
              onClick={saveBudget}
              disabled={saving}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Saving..." : allocation ? "Update" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
