"use client";

import { useEffect, useState } from "react";

export default function IncomePage() {
  const [incomes, setIncomes] = useState([]);
  const [allocatingIncome, setAllocatingIncome] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const [saving, setSaving] = useState(false);
  const [deletingIncomeId, setDeletingIncomeId] = useState(null);

  async function loadIncome() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/income");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load income");
      }

      setIncomes(Array.isArray(data) ? data : []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }
  async function deleteIncome(incomeId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this income? All allocations belonging to this income will also be deleted.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingIncomeId(incomeId);
      setError("");

      const response = await fetch(`/api/income/${incomeId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete income");
      }

      await loadIncome();
    } catch (error) {
      console.error(error);

      setError(error.message || "Failed to delete income");
    } finally {
      setDeletingIncomeId(null);
    }
  }
  useEffect(() => {
    loadIncome();
  }, []);
  const totalIncome = incomes.reduce(
    (total, income) => total + Number(income.amount || 0),
    0,
  );

  const totalAllocated = incomes.reduce(
    (total, income) => total + Number(income.totalAllocated || 0),
    0,
  );

  const unallocatedIncome = totalIncome - totalAllocated;
  async function addIncome(event) {
    event.preventDefault();

    if (!amount || Number(amount) <= 0) {
      setError("Income amount must be greater than 0.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch("/api/income", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          note,
          date,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add income");
      }

      setAmount("");
      setNote("");

      await loadIncome();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Income</h1>

        <p className="mt-1 text-muted-foreground">
          Record money you receive and decide where it goes.
        </p>
      </header>
      <section className="mb-8 grid gap-4 grid-cols-2  md:grid-cols-3">
        <SummaryCard title="Total Income" value={totalIncome} />

        <SummaryCard title="Allocated Income" value={totalAllocated} />

        <SummaryCard title="Money Left" value={unallocatedIncome} />
      </section>
      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Add income */}
      <section className="mb-8 rounded-xl border bg-card p-6">
        <h2 className="mb-5 text-xl font-semibold">Add income</h2>

        <form onSubmit={addIncome} className="grid gap-4 md:grid-cols-2">
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="rounded-md border px-3 py-2"
          />

          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-md border px-3 py-2"
          />

          <input
            type="text"
            placeholder="Note (optional)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="rounded-md border px-3 py-2 md:col-span-2"
          />

          <button
            type="submit"
            disabled={saving}
            className="rounded-md cursor-pointer bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50 md:col-span-2"
          >
            {saving ? "Adding..." : "Add income"}
          </button>
        </form>
      </section>

      {/* Income list */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Income history</h2>

        {loading ? (
          <p>Loading...</p>
        ) : incomes.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            No income recorded yet.
          </div>
        ) : (
          <div className="grid gap-10 md:grid-cols-2">
            {incomes.map((income) => (
              <IncomeCard
                key={income.id}
                income={income}
                onAllocate={() => setAllocatingIncome(income)}
                onDelete={() => deleteIncome(income.id)}
                deleting={deletingIncomeId === income.id}
              />
            ))}
          </div>
        )}
      </section>
      {allocatingIncome && (
        <AllocateIncomeModal
          income={allocatingIncome}
          onClose={() => setAllocatingIncome(null)}
          onAllocated={async () => {
            setAllocatingIncome(null);
            await loadIncome();
          }}
        />
      )}
    </div>
  );
}

function IncomeCard({ income, onAllocate, onDelete, deleting }) {
  const amount = Number(income.amount);
  const allocated = Number(income.totalAllocated);
  const remaining = Number(income.remaining);

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">{income.note || "Income"}</h3>

          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(income.date).toLocaleDateString()}
          </p>
        </div>

        <p className="text-lg font-bold">
          {amount.toLocaleString()}{" "}
          <span className="text-xs text-gray-500">birr</span>
        </p>
      </div>

      <div className="mt-5 flex justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Allocated</p>

          <p className="mt-1 font-semibold">
            {allocated.toLocaleString()}{" "}
            <span className="text-xs text-gray-500">birr</span>
          </p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Available</p>

          <p className="mt-1 font-semibold">
            {remaining.toLocaleString()}{" "}
            <span className="text-xs text-gray-500">birr</span>
          </p>
        </div>
      </div>

      {income.allocations.length > 0 && (
        <div className="mt-5 border-t pt-4">
          <p className="mb-3 text-sm font-medium">Allocated to</p>

          <div className="space-y-2">
            {income.allocations.map((allocation) => (
              <div key={allocation.id} className="flex justify-between text-sm">
                <span>{allocation.account.name}</span>

                <span className="font-medium">
                  {Number(allocation.amount).toLocaleString()}{" "}
                  <span className="text-xs text-gray-500">birr</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-5 flex gap-2">
        {remaining > 0 && (
          <button
            onClick={onAllocate}
            disabled={deleting}
            className="flex-1 cursor-pointer  rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            Allocate income
          </button>
        )}

        <button
          onClick={onDelete}
          disabled={deleting}
          className="rounded-md cursor-pointer border border-destructive/30 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
function AllocateIncomeModal({ income, onClose, onAllocated }) {
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAccounts() {
      try {
        const response = await fetch("/api/accounts");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load accounts");
        }

        setAccounts(Array.isArray(data) ? data : []);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadAccounts();
  }, []);

  async function allocate() {
    if (!accountId) {
      setError("Please select an account.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }

    if (Number(amount) > Number(income.remaining)) {
      setError(
        `Only ${Number(income.remaining).toLocaleString()} birr is available.`,
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(`/api/income/${income.id}/allocations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId,
          amount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to allocate income");
      }

      await onAllocated();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Allocate income</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Decide how much of this income goes to an account.
          </p>
        </div>

        <div className="mb-5 rounded-lg bg-muted p-4">
          <p className="text-sm text-muted-foreground">Available income</p>

          <p className="mt-1 text-2xl font-bold">
            {Number(income.remaining).toLocaleString()}{" "}
            <span className="text-xs text-gray-500">birr</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <p>Loading accounts...</p>
        ) : accounts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-center">
            <p className="font-medium">No accounts available</p>

            <p className="mt-1 text-sm text-muted-foreground">
              Create an account first.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
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

            <div>
              <label className="mb-1 block text-sm font-medium">Amount</label>

              <input
                type="number"
                min="0"
                max={income.remaining}
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Amount"
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-md  cursor-pointer border px-4 py-2 text-sm"
          >
            Cancel
          </button>

          <button
            onClick={allocate}
            disabled={saving || loading || accounts.length === 0}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Allocating..." : "Allocate"}
          </button>
        </div>
      </div>
    </div>
  );
}
function SummaryCard({ title, value }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{title}</p>

      <p className="mt-2 text-2xl font-bold">
        {Number(value || 0).toLocaleString()}{" "}
        <span className="text-xs text-gray-500">birr</span>
      </p>
    </div>
  );
}
