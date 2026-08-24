"use client";

import { useEffect, useState } from "react";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [groups, setGroups] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingTransaction, setSavingTransaction] = useState(false);
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deletingTransaction, setDeletingTransaction] = useState(null);
  const [filterAccountId, setFilterAccountId] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterGroupId, setFilterGroupId] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    accountId: "",
    categoryId: "",
    startDate: "",
    endDate: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalTransactions: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  // --------------------------------------------------
  // LOAD DATA
  // --------------------------------------------------

  async function loadData(page = 1) {
    try {
      setLoading(true);
      setError("");

      const [transactionsResponse, accountsResponse, groupsResponse] =
        await Promise.all([
          fetch(`/api/transactions?page=${page}&limit=${pagination.limit}`),
          fetch("/api/accounts"),
          fetch("/api/category-groups"),
        ]);

      const transactionsData = await transactionsResponse.json();
      const accountsData = await accountsResponse.json();
      const groupsData = await groupsResponse.json();

      if (!transactionsResponse.ok) {
        throw new Error(
          transactionsData.error || "Failed to load transactions",
        );
      }

      if (!accountsResponse.ok) {
        throw new Error(accountsData.error || "Failed to load accounts");
      }

      if (!groupsResponse.ok) {
        throw new Error(groupsData.error || "Failed to load categories");
      }

      setTransactions(
        Array.isArray(transactionsData.transactions)
          ? transactionsData.transactions
          : [],
      );

      setPagination(transactionsData.pagination || {});

      setAccounts(Array.isArray(accountsData) ? accountsData : []);

      setGroups(Array.isArray(groupsData) ? groupsData : []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // --------------------------------------------------
  // ADD EXPENSE
  // --------------------------------------------------

  async function addTransaction(event) {
    event.preventDefault();

    try {
      setSavingTransaction(true);
      setError("");

      if (!amount || Number(amount) <= 0) {
        setError("Amount must be greater than 0.");
        return;
      }

      if (!accountId) {
        setError("Account is required.");
        return;
      }

      if (!categoryId) {
        setError("Category is required.");
        return;
      }

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          type: "EXPENSE",
          accountId,
          categoryId,
          note,
          date,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to add expense");
        return;
      }

      // Clear form after successful transaction
      setAmount("");
      setCategoryId("");
      setNote("");

      // Reload transactions and account balances
      await loadData();
    } catch (error) {
      setError(error.message || "Failed to add expense");
    } finally {
      setSavingTransaction(false);
    }
  }

  // --------------------------------------------------
  // MENU ACTIONS
  // --------------------------------------------------

  function openEdit(transaction) {
    setOpenMenuId(null);
    setEditingTransaction(transaction);
  }

  function openDelete(transaction) {
    setOpenMenuId(null);
    setDeletingTransaction(transaction);
  }

  // --------------------------------------------------
  // CATEGORIES
  // --------------------------------------------------

  const categories = groups.flatMap((group) => group.categories || []);
  const filteredTransactions = transactions.filter((transaction) => {
    if (filters.accountId && transaction.accountId !== filters.accountId) {
      return false;
    }

    if (filters.categoryId && transaction.categoryId !== filters.categoryId) {
      return false;
    }

    const transactionDate = new Date(transaction.date);
    transactionDate.setHours(0, 0, 0, 0);

    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0);

      if (transactionDate < startDate) {
        return false;
      }
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);

      if (transactionDate > endDate) {
        return false;
      }
    }

    return true;
  });
  function goToPage(page) {
    if (page < 1 || page > pagination.totalPages) {
      return;
    }

    loadData(page);
  }
  return (
    <div className="mx-auto max-w-6xl p-6" onClick={() => setOpenMenuId(null)}>
      {/* --------------------------------------------------
            HEADER
        -------------------------------------------------- */}

      <header className="mb-8">
        <h1 className="text-3xl font-bold">Transactions</h1>

        <p className="mt-1 text-muted-foreground">
          Record and manage your expenses.
        </p>
      </header>

      {/* --------------------------------------------------
            ERROR
        -------------------------------------------------- */}

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* --------------------------------------------------
            ADD EXPENSE
        -------------------------------------------------- */}

      <section className="mb-8 rounded-xl border p-6">
        <h2 className="mb-5 text-xl font-semibold">Add expense</h2>

        <form onSubmit={addTransaction} className="grid gap-4 md:grid-cols-2">
          {/* Amount */}

          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="rounded-md border px-3 py-2"
          />

          {/* Account */}

          <AccountSelect
            value={accountId}
            onChange={setAccountId}
            accounts={accounts}
          />

          {/* Category */}

          <CategorySelect
            value={categoryId}
            onChange={setCategoryId}
            categories={categories}
          />

          {/* Date */}

          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-md border px-3 py-2"
          />

          {/* Note */}

          <input
            type="text"
            placeholder="Note (optional)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="rounded-md border px-3 py-2 md:col-span-2"
          />

          {/* Submit */}

          <button
            type="submit"
            disabled={savingTransaction}
            className="rounded-md cursor-pointer bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50 md:col-span-2"
          >
            {savingTransaction ? "Saving transaction..." : "Add expense"}
          </button>
        </form>
      </section>

      {/* --------------------------------------------------
            TRANSACTIONS LIST
        -------------------------------------------------- */}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Recent transactions</h2>

            <p className="text-sm text-muted-foreground">
              {filteredTransactions.length} transaction
              {filteredTransactions.length !== 1 ? "s" : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setShowFilters((previous) => !previous);
            }}
            className="rounded-md cursor-pointer border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Filter
          </button>
        </div>
        {showFilters && (
          <div
            className="relative z-30 mb-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute right-0 top-0 w-full max-w-md rounded-xl border bg-background p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Filter transactions</h3>

                  <p className="text-sm text-muted-foreground">
                    Narrow down your expenses.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  className="text-xl cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Account */}
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Account
                  </label>

                  <select
                    value={filters.accountId}
                    onChange={(event) =>
                      setFilters((previous) => ({
                        ...previous,
                        accountId: event.target.value,
                      }))
                    }
                    className="w-full rounded-md border px-3 py-2"
                  >
                    <option value="">All accounts</option>

                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Category
                  </label>

                  <select
                    value={filters.categoryId}
                    onChange={(event) =>
                      setFilters((previous) => ({
                        ...previous,
                        categoryId: event.target.value,
                      }))
                    }
                    className="w-full rounded-md border px-3 py-2"
                  >
                    <option value="">All categories</option>

                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      From
                    </label>

                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(event) =>
                        setFilters((previous) => ({
                          ...previous,
                          startDate: event.target.value,
                        }))
                      }
                      className="w-full rounded-md border px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">To</label>

                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(event) =>
                        setFilters((previous) => ({
                          ...previous,
                          endDate: event.target.value,
                        }))
                      }
                      className="w-full rounded-md border px-3 py-2"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFilters({
                        accountId: "",
                        categoryId: "",
                        startDate: "",
                        endDate: "",
                      })
                    }
                    className="rounded-md cursor-pointer border px-4 py-2 text-sm"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {loading ? (
          <p>Loading...</p>
        ) : filteredTransactions.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            {transactions.length === 0
              ? "No expenses yet."
              : "No expenses match your filters."}
          </div>
        ) : (
          <div className="overflow-visible rounded-xl border">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between border-b px-5 py-4 last:border-b-0"
                onClick={(event) => event.stopPropagation()}
              >
                {/* Transaction information */}

                <div className="min-w-0">
                  <p className="font-medium">
                    {transaction.type === "DEBT_RECEIVED"
                      ? "Debt received"
                      : transaction.category?.name || "Expense"}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {transaction.account.name}

                    {transaction.note && ` • ${transaction.note}`}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(transaction.date).toLocaleDateString()}
                  </p>
                </div>

                {/* Amount + menu */}

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        transaction.type === "INCOME" ||
                        transaction.type === "DEBT_RECEIVED"
                          ? "text-green-600"
                          : "text-destructive"
                      }`}
                    >
                      {transaction.type === "INCOME" ||
                      transaction.type === "DEBT_RECEIVED"
                        ? "+"
                        : "-"}
                      {Number(transaction.amount).toLocaleString()}{" "}
                      <span className="text-xs text-gray-500">birr</span>
                    </p>
                  </div>

                  {/* Three dots */}

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId(
                          openMenuId === transaction.id ? null : transaction.id,
                        )
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-md cursor-pointer hover:bg-muted"
                      aria-label="Transaction options"
                    >
                      ⋮
                    </button>

                    {openMenuId === transaction.id && (
                      <div className="absolute right-0 top-10 z-20 w-32 overflow-hidden rounded-lg border bg-background shadow-lg">
                        <button
                          type="button"
                          onClick={() => openEdit(transaction)}
                          className="block cursor-pointer w-full px-4 py-2 text-left text-sm hover:bg-muted"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => openDelete(transaction)}
                          className="block w-full px-4 py-2 text-left text-sm cursor-pointer text-destructive hover:bg-muted"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      {!loading && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-card px-4 py-3">
          <button
            type="button"
            onClick={() => goToPage(pagination.page - 1)}
            disabled={!pagination.hasPreviousPage}
            className="rounded-md border cursor-pointer px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>

          <div className="text-sm text-muted-foreground">
            Page{" "}
            <span className="font-medium text-foreground">
              {pagination.page}
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground">
              {pagination.totalPages}
            </span>
          </div>

          <button
            type="button"
            onClick={() => goToPage(pagination.page + 1)}
            disabled={!pagination.hasNextPage}
            className="rounded-md border cursor-pointer px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
      {/* --------------------------------------------------
            EDIT MODAL
        -------------------------------------------------- */}

      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          accounts={accounts}
          categories={categories}
          onClose={() => setEditingTransaction(null)}
          onSaved={async () => {
            setEditingTransaction(null);
            await loadData();
          }}
        />
      )}

      {/* --------------------------------------------------
            DELETE MODAL
        -------------------------------------------------- */}

      {deletingTransaction && (
        <DeleteTransactionModal
          transaction={deletingTransaction}
          onClose={() => setDeletingTransaction(null)}
          onDeleted={async () => {
            setDeletingTransaction(null);
            await loadData();
          }}
        />
      )}
    </div>
  );
}

// ======================================================
// EDIT TRANSACTION MODAL
// ======================================================

function EditTransactionModal({
  transaction,
  accounts,
  categories,
  onClose,
  onSaved,
}) {
  const [amount, setAmount] = useState(String(transaction.amount));

  const [accountId, setAccountId] = useState(transaction.accountId);

  const [categoryId, setCategoryId] = useState(transaction.categoryId || "");

  const [note, setNote] = useState(transaction.note || "");

  const [date, setDate] = useState(() => {
    const transactionDate = new Date(transaction.date);

    return transactionDate.toISOString().split("T")[0];
  });

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  // --------------------------------------------------
  // SAVE EDIT
  // --------------------------------------------------

  async function save() {
    if (!amount || Number(amount) <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }

    if (!accountId) {
      setError("Account is required.");
      return;
    }

    if (!categoryId) {
      setError("Category is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          type: "EXPENSE",
          accountId,
          categoryId,
          note,
          date,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update expense");
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
        {/* Header */}

        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">Edit expense</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Update the expense details.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-xl cursor-pointer text-muted-foreground"
          >
            ×
          </button>
        </div>

        {/* Error */}

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Amount */}

          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-full rounded-md border px-3 py-2"
            placeholder="Amount"
          />

          {/* Account */}

          <AccountSelect
            value={accountId}
            onChange={setAccountId}
            accounts={accounts}
          />

          {/* Category */}

          <CategorySelect
            value={categoryId}
            onChange={setCategoryId}
            categories={categories}
          />

          {/* Date */}

          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-full rounded-md border px-3 py-2"
          />

          {/* Note */}

          <input
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Note (optional)"
            className="w-full rounded-md border px-3 py-2"
          />
        </div>

        {/* Buttons */}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md cursor-pointer border px-4 py-2 text-sm"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-md bg-primary cursor-pointer px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ======================================================
// DELETE TRANSACTION MODAL
// ======================================================

function DeleteTransactionModal({ transaction, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");

  // --------------------------------------------------
  // DELETE
  // --------------------------------------------------

  async function deleteTransaction() {
    try {
      setDeleting(true);
      setError("");

      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete expense");
      }

      await onDeleted();
    } catch (error) {
      setError(error.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-background p-6 shadow-xl">
        <h2 className="text-xl font-semibold">Delete expense?</h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Are you sure you want to delete this{" "}
          {transaction.category?.name || "expense"} expense of{" "}
          <strong>
            {Number(transaction.amount).toLocaleString()}{" "}
            <span className="text-xs text-gray-500">birr</span>
          </strong>
          ?
        </p>

        {/* Error */}

        {error && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Buttons */}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-md cursor-pointer border px-4 py-2 text-sm"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={deleteTransaction}
            disabled={deleting}
            className="rounded-md bg-destructive cursor-pointer px-4 py-2 text-sm text-destructive-foreground disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
function CategorySelect({ value, onChange, categories }) {
  const [open, setOpen] = useState(false);

  const selectedCategory = categories.find((category) => category.id === value);

  function getAllocatedAccount(category) {
    const allocation = category.budgetAllocations?.[0];

    return allocation?.account?.name || "";
  }

  return (
    <div className="relative">
      {/* Selected value */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-md border cursor-pointer bg-background px-3 py-2 text-left"
      >
        <div className="flex min-w-0 items-center justify-between gap-4">
          {selectedCategory ? (
            <>
              <span className="truncate">{selectedCategory.name}</span>

              <span className="shrink-0 text-xs text-muted-foreground">
                {getAllocatedAccount(selectedCategory)}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">Select category</span>
          )}
        </div>

        {/* Dropdown chevron */}
        <svg
          className={`ml-3 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-md border bg-background shadow-lg">
          {categories.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No categories available
            </div>
          ) : (
            categories.map((category) => {
              const allocatedAccount = getAllocatedAccount(category);

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    onChange(category.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center  cursor-pointer justify-between gap-4 px-3 py-2 text-left hover:bg-muted"
                >
                  {/* Category */}
                  <span className="min-w-0 truncate">{category.name}</span>

                  {/* Allocated account */}
                  {allocatedAccount && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {allocatedAccount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function AccountSelect({ value, onChange, accounts }) {
  const [open, setOpen] = useState(false);

  const selectedAccount = accounts.find((account) => account.id === value);

  function formatBalance(account) {
    return `${Number(account.balance ?? 0).toLocaleString()} birr available`;
  }

  return (
    <div className="relative">
      {/* Selected value */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center cursor-pointer justify-between rounded-md border bg-background px-3 py-2 text-left"
      >
        <div className="flex min-w-0 items-center justify-between gap-4">
          {selectedAccount ? (
            <>
              {/* Account name */}
              <span className="truncate">{selectedAccount.name}</span>

              {/* Available balance */}
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatBalance(selectedAccount)}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">Select account</span>
          )}
        </div>

        {/* Dropdown chevron */}
        <svg
          className={`ml-3 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-md border bg-background shadow-lg">
          {accounts.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No accounts available
            </div>
          ) : (
            accounts.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => {
                  onChange(account.id);
                  setOpen(false);
                }}
                className="flex w-full items-center cursor-pointer justify-between gap-4 px-3 py-2 text-left hover:bg-muted"
              >
                {/* Account name */}
                <span className="min-w-0 truncate">{account.name}</span>

                {/* Available balance */}
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatBalance(account)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
