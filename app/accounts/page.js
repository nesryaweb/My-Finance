"use client";

import DeleteError from "@/components/DeleteError";
import { useEffect, useState } from "react";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [deleteError, setDeleteError] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  async function loadAccounts() {
    try {
      setError("");

      const response = await fetch("/api/accounts");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load accounts");
      }

      setAccounts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load accounts:", error);
      setError(error.message);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  function resetForm() {
    setName("");
    setType("");
    setEditingId(null);
  }
  function startEditing(account) {
    setEditingId(account.id);
    setName(account.name);
    setType(account.type || "");
  }
  function formatMoney(value) {
    return Number(value || 0).toLocaleString();
  }
  async function handleSubmit(event) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Account name is required.");
      return;
    }

    setError("");

    const url = editingId ? `/api/accounts/${editingId}` : "/api/accounts";

    const method = editingId ? "PATCH" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          type,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      resetForm();
      await loadAccounts();
    } catch (error) {
      setError(error.message);
    }
  }

  async function handleDelete(account) {
    const confirmed = window.confirm(
      `Delete "${account.name}"?\n\nThis cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeleteError((previous) => ({
      ...previous,
      [account.id]: "",
    }));

    setDeletingId(account.id);

    try {
      const response = await fetch(`/api/accounts/${account.id}`, {
        method: "DELETE",
      });

      const text = await response.text();

      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setDeleteError((previous) => ({
          ...previous,
          [account.id]: "Unable to process the server response.",
        }));
        return;
      }

      if (!response.ok) {
        setDeleteError((previous) => ({
          ...previous,
          [account.id]: data.error || "This account cannot be deleted.",
        }));
        return;
      }

      await loadAccounts();
    } catch (error) {
      console.error("Failed to delete account:", error);

      setDeleteError((previous) => ({
        ...previous,
        [account.id]: "Something went wrong while deleting the account.",
      }));
    } finally {
      setDeletingId(null);
    }
  }

  const totalBalance = accounts.reduce(
    (total, account) => total + Number(account.balance),
    0,
  );
  const totalAllocated = accounts.reduce(
    (total, account) =>
      total +
      Number(account.allocated || 0) +
      Number(account.debtReceived || 0),
    0,
  );

  const totalSpent = accounts.reduce(
    (total, account) => total + Number(account.expenses || 0),
    0,
  );

  const totalRemaining = totalAllocated - totalSpent;
  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 sm:px-6 md:pb-6"
      onClick={() => setOpenMenuId(null)}
    >
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Accounts</h1>

        <p className="mt-1 text-muted-foreground">
          Manage where your money is stored.
        </p>
      </header>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-10">
        {/* Total */}
        <section className="rounded-xl border sm:mb-10  sm:min-w-52 sm:w-52 w-full p-6">
          <h2 className="mb-4 text-lg font-semibold">Money Overview</h2>

          <div className="grid grid-cols-2 gap-5 sm:flex sm:flex-col">
            <div>
              <p className="text-sm text-muted-foreground">Total Received</p>

              <p className="mt-1 text-xl font-bold">
                {totalAllocated.toLocaleString()}{" "}
                <span className="text-xs text-gray-500">birr</span>
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Total Spent</p>

              <p className="mt-1 text-xl font-bold">
                {totalSpent.toLocaleString()}{" "}
                <span className="text-xs text-gray-500">birr</span>
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Money Remaining</p>

              <p
                className={`mt-1 text-2xl font-bold ${
                  totalRemaining < 0 ? "text-destructive" : ""
                }`}
              >
                {totalRemaining.toLocaleString()}{" "}
                <span className="text-xs text-gray-500">birr</span>
              </p>
            </div>
          </div>
        </section>

        {/* Form */}
        <section className="mb-10 rounded-xl w-full min-w-56 col-span-3 border bg-card p-6">
          <div className="mb-5">
            <h2 className="text-xl font-semibold">
              {editingId ? "Edit account" : "Add account"}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {editingId
                ? "Update the account information."
                : "Add a place where you keep your money."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Account name
              </label>

              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. CBE"
                className="w-full rounded-md border px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Type</label>

              <input
                value={type}
                onChange={(event) => setType(event.target.value)}
                placeholder="e.g. Bank, Cash, Mobile Money"
                className="w-full rounded-md border px-3 py-2"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-md cursor-pointer bg-primary px-4 py-2 text-primary-foreground"
              >
                {editingId ? "Save changes" : "Add account"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-md cursor-pointer border px-4 py-2"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>
      </div>

      {/* Accounts */}

      <section>
        <h2 className="mb-4 text-xl font-semibold">Your accounts</h2>

        {loading ? (
          <p>Loading...</p>
        ) : accounts.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <p className="font-medium">No accounts yet</p>

            <p className="mt-1 text-sm text-muted-foreground">
              Add your first account above.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {accounts.map((account) => (
              <div key={account.id} className="rounded-xl border bg-card p-5">
                {/* Delete error */}

                <DeleteError message={deleteError[account.id]} />

                {/* Account header */}

                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{account.name}</h3>

                    {account.type && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {account.type}
                      </p>
                    )}
                  </div>

                  {/* Account menu */}

                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();

                        setOpenMenuId(
                          openMenuId === account.id ? null : account.id,
                        );
                      }}
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md hover:bg-muted"
                      aria-label="Account options"
                    >
                      ⋮
                    </button>

                    {openMenuId === account.id && (
                      <div
                        onClick={(event) => event.stopPropagation()}
                        className="absolute right-0 top-10 z-20 w-32 overflow-hidden rounded-lg border bg-background shadow-lg"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            startEditing(account);
                          }}
                          className="block cursor-pointer w-full px-4 py-2 text-left text-sm hover:bg-muted"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            handleDelete(account);
                          }}
                          disabled={deletingId === account.id}
                          className="block cursor-pointer w-full px-4 py-2 text-left text-sm text-destructive hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === account.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Account money */}

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Had</p>

                    <p className="mt-1 font-medium">
                      {(
                        Number(account.allocated || 0) +
                        Number(account.debtReceived || 0)
                      ).toLocaleString()}{" "}
                      <span className="text-xs text-gray-500">birr</span>
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Spent</p>

                    <p className="mt-1 font-medium">
                      {Number(account.expenses || 0).toLocaleString()}{" "}
                      <span className="text-xs text-gray-500">birr</span>
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Available</p>

                    <p
                      className={`mt-1 font-semibold ${
                        Number(account.balance || 0) < 0
                          ? "text-destructive"
                          : ""
                      }`}
                    >
                      {Number(account.balance || 0).toLocaleString()}{" "}
                      <span className="text-xs text-gray-500">birr</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
