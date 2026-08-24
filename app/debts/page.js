"use client";

import { useEffect, useState } from "react";

export default function DebtsPage() {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingDebtId, setDeletingDebtId] = useState(null);

  const [showAddDebt, setShowAddDebt] = useState(false);
  const [receiveDebt, setReceiveDebt] = useState(null);
  const [paymentDebt, setPaymentDebt] = useState(null);

  async function loadDebts() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/debts");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load debts");
      }

      setDebts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }
  async function deleteDebt(debt) {
    const hasPaymentHistory = debt.payments?.length > 0;

    const hasReceivedHistory = debt.received?.length > 0;

    let message =
      `Are you sure you want to delete "${debt.name}"?\n\n` +
      "This action cannot be undone.";

    if (hasPaymentHistory || hasReceivedHistory) {
      message += "\n\nWARNING: This debt has financial history.";

      if (hasPaymentHistory) {
        message += `\n• ${debt.payments.length} payment record(s) will be deleted.`;
      }

      if (hasReceivedHistory) {
        message += `\n• ${debt.received.length} received-money record(s) will be deleted.`;
      }

      message += "\n• The related transaction records will also be deleted.";
    }

    message +=
      "\n\nThe money that was already received or paid is NOT automatically returned to the account.";

    const confirmed = window.confirm(message);

    if (!confirmed) {
      return;
    }

    try {
      setDeletingDebtId(debt.id);
      setError("");

      const response = await fetch(`/api/debts/${debt.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete debt");
      }

      await loadDebts();
    } catch (error) {
      console.error(error);

      setError(error.message || "Failed to delete debt.");
    } finally {
      setDeletingDebtId(null);
    }
  }
  useEffect(() => {
    loadDebts();
  }, []);

  const totalOriginal = debts.reduce(
    (total, debt) => total + Number(debt.originalAmount || 0),
    0,
  );

  const totalPaid = debts.reduce(
    (total, debt) => total + Number(debt.totalPaid || 0),
    0,
  );

  const totalRemaining = debts.reduce(
    (total, debt) => total + Number(debt.remaining || 0),
    0,
  );

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      {/* ==================================================
          HEADER
      ================================================== */}

      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Debt Management</h1>

          <p className="mt-1 text-muted-foreground">
            Track what you owe and manage borrowed money and debt payments.
          </p>
        </div>

        <button
          onClick={() => {
            setError("");
            setShowAddDebt(true);
          }}
          className="rounded-md cursor-pointer bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Add debt
        </button>
      </header>

      {/* ==================================================
          ERROR
      ================================================== */}

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ==================================================
          SUMMARY
      ================================================== */}

      <section className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <SummaryCard label="Total debt" value={totalOriginal} />

        <SummaryCard label="Total paid" value={totalPaid} />

        <SummaryCard label="Remaining" value={totalRemaining} />
      </section>

      {/* ==================================================
          DEBTS
      ================================================== */}

      <section>
        <h2 className="mb-4 text-xl font-semibold">Your debts</h2>

        {loading ? (
          <p className="text-muted-foreground">Loading debts...</p>
        ) : debts.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <p className="font-medium">No debts yet</p>

            <p className="mt-1 text-sm text-muted-foreground">
              Add your first debt to start tracking it.
            </p>

            <button
              onClick={() => setShowAddDebt(true)}
              className="mt-4 cursor-pointer rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Add debt
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {debts.map((debt) => (
              <DebtCard
                key={debt.id}
                debt={debt}
                deleting={deletingDebtId === debt.id}
                onReceive={() => {
                  setError("");
                  setReceiveDebt(debt);
                }}
                onPay={() => {
                  setError("");
                  setPaymentDebt(debt);
                }}
                onDelete={() => deleteDebt(debt)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ==================================================
          ADD DEBT MODAL
      ================================================== */}

      {showAddDebt && (
        <AddDebtModal
          onClose={() => setShowAddDebt(false)}
          onSaved={async () => {
            setShowAddDebt(false);
            await loadDebts();
          }}
        />
      )}

      {/* ==================================================
          RECEIVE MONEY MODAL
      ================================================== */}

      {receiveDebt && (
        <ReceiveDebtModal
          debt={receiveDebt}
          onClose={() => setReceiveDebt(null)}
          onSaved={async () => {
            setReceiveDebt(null);
            await loadDebts();
          }}
        />
      )}

      {/* ==================================================
          PAYMENT MODAL
      ================================================== */}

      {paymentDebt && (
        <PaymentModal
          debt={paymentDebt}
          onClose={() => setPaymentDebt(null)}
          onSaved={async () => {
            setPaymentDebt(null);
            await loadDebts();
          }}
        />
      )}
    </div>
  );
}

// ======================================================
// SUMMARY CARD
// ======================================================

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>

      <p className="mt-2 text-2xl font-bold">
        {Number(value).toLocaleString()}{" "}
        <span className="text-xs text-gray-500">birr</span>
      </p>
    </div>
  );
}

// ======================================================
// DEBT CARD
// ======================================================
function DebtCard({ debt, deleting, onReceive, onPay, onDelete }) {
  const original = Number(debt.originalAmount || 0);

  const paid = Number(debt.totalPaid || 0);

  const remaining = Number(debt.remaining || 0);

  const priority = Number(debt.priority || 1);

  const percentage =
    original > 0 ? Math.min(Math.round((paid / original) * 100), 100) : 0;

  const isPaid = debt.status === "PAID" || remaining <= 0;

  return (
    <div className="rounded-xl border bg-card p-5">
      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold">{debt.name}</h3>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                isPaid
                  ? "bg-green-100 text-green-700"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isPaid ? "Paid" : "Active"}
            </span>

            {!isPaid && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                Priority {priority}
              </span>
            )}
          </div>

          {debt.note && (
            <p className="mt-1 text-sm text-muted-foreground">{debt.note}</p>
          )}

          {debt.dueDate && (
            <p className="mt-2 text-sm text-muted-foreground">
              Due {new Date(debt.dueDate).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* ==================================================
          ACTIONS
      ================================================== */}

      {!isPaid && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={onReceive}
            className="rounded-md cursor-pointer border px-4 py-2 text-sm font-medium"
          >
            Receive money
          </button>

          <button
            onClick={onPay}
            className="rounded-md cursor-pointer bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Make payment
          </button>
          <button
  onClick={onDelete}
  disabled={deleting}
  className="rounded-md  border cursor-pointer border-destructive/30 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
>
  {deleting ? "Deleting..." : "Delete debt"}
</button>
        </div>
      )}

      {/* ==================================================
          AMOUNTS
      ================================================== */}

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Original</p>

          <p className="mt-1 font-semibold">
            {original.toLocaleString()}{" "}
            <span className="text-xs text-gray-500">birr</span>
          </p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Paid</p>

          <p className="mt-1 font-semibold">
            {paid.toLocaleString()}{" "}
            <span className="text-xs text-gray-500">birr</span>
          </p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Remaining</p>

          <p className="mt-1 font-semibold">
            {remaining.toLocaleString()}{" "}
            <span className="text-xs text-gray-500">birr</span>
          </p>
        </div>
      </div>

      {/* ==================================================
          MINIMUM PAYMENT
      ================================================== */}

      {debt.minimumPayment && (
        <div className="mt-4">
          <p className="text-xs text-muted-foreground">Minimum payment</p>

          <p className="mt-1 text-sm font-medium">
            {Number(debt.minimumPayment).toLocaleString()}{" "}
            <span className="text-xs text-gray-500">birr</span>
          </p>
        </div>
      )}

      {/* ==================================================
          PROGRESS
      ================================================== */}

      <div className="mt-5">
        <div className="mb-2 flex justify-between text-xs">
          <span className="text-muted-foreground">Payment progress</span>

          <span className="font-medium">{percentage}%</span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{
              width: `${percentage}%`,
            }}
          />
        </div>
      </div>

      {/* ==================================================
          PAYMENT HISTORY
      ================================================== */}

      {debt.payments?.length > 0 && (
        <div className="mt-6 border-t pt-5">
          <h4 className="mb-3 text-sm font-semibold">Payment history</h4>

          <div className="space-y-2">
            {debt.payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between text-sm"
              >
                <div>
                  <p className="font-medium">
                    {Number(payment.amount).toLocaleString()}{" "}
                    <span className="text-xs text-gray-500">birr</span>
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {new Date(payment.date).toLocaleDateString()}
                    {" • "}
                    {payment.account?.name || "Unknown account"}
                  </p>
                </div>

                {payment.note && (
                  <span className="max-w-[40%] truncate text-xs text-muted-foreground">
                    {payment.note}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ======================================================
// ADD DEBT MODAL
// ======================================================

function AddDebtModal({ onClose, onSaved }) {
  const [name, setName] = useState("");

  const [originalAmount, setOriginalAmount] = useState("");

  const [minimumPayment, setMinimumPayment] = useState("");

  const [priority, setPriority] = useState("1");

  const [dueDate, setDueDate] = useState("");

  const [note, setNote] = useState("");

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  async function save() {
    if (!name.trim()) {
      setError("Debt name is required.");
      return;
    }

    if (!originalAmount || Number(originalAmount) <= 0) {
      setError("Original amount must be greater than 0.");
      return;
    }

    if (
      !priority ||
      !Number.isInteger(Number(priority)) ||
      Number(priority) < 1
    ) {
      setError("Priority must be a whole number greater than 0.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch("/api/debts", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name,
          originalAmount,
          minimumPayment,
          priority,
          dueDate,
          note,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create debt");
      }

      await onSaved();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">Add debt</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Enter the total amount you owe.
          </p>
        </div>

        <button
          onClick={onClose}
          disabled={saving}
          className="text-xl cursor-pointer text-muted-foreground"
        >
          ×
        </button>
      </div>

      {error && <ModalError message={error} />}

      <div className="space-y-4">
        <Field
          label="Debt name"
          type="text"
          placeholder="Example: Friend loan"
          value={name}
          onChange={setName}
        />

        <Field
          label="Original amount"
          type="number"
          placeholder="Amount"
          value={originalAmount}
          onChange={setOriginalAmount}
        />

        <Field
          label="Minimum payment (optional)"
          type="number"
          placeholder="Amount"
          value={minimumPayment}
          onChange={setMinimumPayment}
        />

        <Field
          label="Priority"
          type="number"
          placeholder="1"
          value={priority}
          onChange={setPriority}
        />

        <p className="-mt-2 text-xs text-muted-foreground">
          Lower numbers are paid first. Priority 1 comes before Priority 2.
        </p>

        <Field
          label="Due date (optional)"
          type="date"
          value={dueDate}
          onChange={setDueDate}
        />

        <Field
          label="Note (optional)"
          type="text"
          placeholder="Optional note"
          value={note}
          onChange={setNote}
        />
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={onClose}
          disabled={saving}
          className="rounded-md cursor-pointer border px-4 py-2 text-sm"
        >
          Cancel
        </button>

        <button
          onClick={save}
          disabled={saving}
          className="rounded-md cursor-pointer bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Saving..." : "Add debt"}
        </button>
      </div>
    </Modal>
  );
}

// ======================================================
// RECEIVE DEBT MODAL
// ======================================================

function ReceiveDebtModal({ debt, onClose, onSaved }) {
  const [accounts, setAccounts] = useState([]);

  const [accountId, setAccountId] = useState("");

  const [amount, setAmount] = useState("");

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const [note, setNote] = useState("");

  const [loadingAccounts, setLoadingAccounts] = useState(true);

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
        setLoadingAccounts(false);
      }
    }

    loadAccounts();
  }, []);

  async function receive() {
    if (!accountId) {
      setError("Please select the account where you received the money.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError("Received amount must be greater than 0.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(`/api/debts/${debt.id}/receive`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          accountId,
          amount,
          date,
          note,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to record borrowed money");
      }

      await onSaved();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal>
      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">Receive borrowed money</h2>

          <p className="mt-1 text-sm text-muted-foreground">{debt.name}</p>
        </div>

        <button
          onClick={onClose}
          disabled={saving}
          className="text-xl cursor-pointer text-muted-foreground"
        >
          ×
        </button>
      </div>

      {/* ==================================================
          INFORMATION
      ================================================== */}

      <div className="mb-5 rounded-lg bg-muted p-4">
        <p className="text-sm text-muted-foreground">Debt recorded</p>

        <p className="mt-1 text-2xl font-bold">
          {Number(debt.originalAmount).toLocaleString()}{" "}
          <span className="text-xs text-gray-500">birr</span>
        </p>

        <p className="mt-2 text-xs text-muted-foreground">
          This will add the received amount to the selected account. It will not
          be counted as income.
        </p>
      </div>

      {error && <ModalError message={error} />}

      {/* ==================================================
          ACCOUNTS
      ================================================== */}

      {loadingAccounts ? (
        <p className="text-sm text-muted-foreground">Loading accounts...</p>
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
            <label className="mb-1 block text-sm font-medium">
              Receive into
            </label>

            <select
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              className="w-full rounded-md border px-3 py-2"
            >
              <option value="">Select account</option>

              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} —{" "}
                  {Number(account.balance || 0).toLocaleString()} birr available
                </option>
              ))}
            </select>
          </div>

          <Field
            label="Amount received"
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={setAmount}
          />

          <Field
            label="Date received"
            type="date"
            value={date}
            onChange={setDate}
          />

          <Field
            label="Note (optional)"
            type="text"
            placeholder="What was the money for?"
            value={note}
            onChange={setNote}
          />
        </div>
      )}

      {/* ==================================================
          ACTIONS
      ================================================== */}

      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={onClose}
          disabled={saving}
          className="rounded-md cursor-pointer border px-4 py-2 text-sm"
        >
          Cancel
        </button>

        <button
          onClick={receive}
          disabled={saving || loadingAccounts || accounts.length === 0}
          className="rounded-md cursor-pointer bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Processing..." : "Record money received"}
        </button>
      </div>
    </Modal>
  );
}

// ======================================================
// PAYMENT MODAL
// ======================================================

function PaymentModal({ debt, onClose, onSaved }) {
  const [accounts, setAccounts] = useState([]);

  const [accountId, setAccountId] = useState("");

  const [amount, setAmount] = useState("");

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const [note, setNote] = useState("");

  const [loadingAccounts, setLoadingAccounts] = useState(true);

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
        setLoadingAccounts(false);
      }
    }

    loadAccounts();
  }, []);

  async function pay() {
    if (!accountId) {
      setError("Please select an account.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError("Payment amount must be greater than 0.");
      return;
    }

    if (Number(amount) > Number(debt.remaining)) {
      setError(`You only owe ${Number(debt.remaining).toLocaleString()} birr.`);
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(`/api/debts/${debt.id}/payments`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          accountId,
          amount,
          date,
          note,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to make payment");
      }

      await onSaved();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal>
      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">Make debt payment</h2>

          <p className="mt-1 text-sm text-muted-foreground">{debt.name}</p>
        </div>

        <button
          onClick={onClose}
          disabled={saving}
          className="text-xl cursor-pointer text-muted-foreground"
        >
          ×
        </button>
      </div>

      {/* ==================================================
          REMAINING
      ================================================== */}

      <div className="mb-5 rounded-lg bg-muted p-4">
        <p className="text-sm text-muted-foreground">Remaining debt</p>

        <p className="mt-1 text-2xl font-bold">
          {Number(debt.remaining).toLocaleString()}{" "}
          <span className="text-xs text-gray-500">birr</span>
        </p>
      </div>

      {error && <ModalError message={error} />}

      {/* ==================================================
          ACCOUNTS
      ================================================== */}

      {loadingAccounts ? (
        <p className="text-sm text-muted-foreground">Loading accounts...</p>
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
                  {account.name} —{" "}
                  {Number(account.balance || 0).toLocaleString()} birr available
                </option>
              ))}
            </select>
          </div>

          <Field
            label="Payment amount"
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={setAmount}
          />

          <Field
            label="Payment date"
            type="date"
            value={date}
            onChange={setDate}
          />

          <Field
            label="Note (optional)"
            type="text"
            placeholder="Optional note"
            value={note}
            onChange={setNote}
          />
        </div>
      )}

      {/* ==================================================
          ACTIONS
      ================================================== */}

      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={onClose}
          disabled={saving}
          className="rounded-md cursor-pointer border px-4 py-2 text-sm"
        >
          Cancel
        </button>

        <button
          onClick={pay}
          disabled={saving || loadingAccounts || accounts.length === 0}
          className="rounded-md cursor-pointer bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Processing..." : "Make payment"}
        </button>
      </div>
    </Modal>
  );
}

// ======================================================
// FIELD
// ======================================================

function Field({ label, type, placeholder, value, onChange }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>

      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border px-3 py-2"
      />
    </div>
  );
}

// ======================================================
// MODAL
// ======================================================

function Modal({ children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-background p-6 shadow-xl">
        {children}
      </div>
    </div>
  );
}

// ======================================================
// MODAL ERROR
// ======================================================

function ModalError({ message }) {
  return (
    <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      {message}
    </div>
  );
}
