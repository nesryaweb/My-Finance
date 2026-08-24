"use client";

import { useEffect, useState } from "react";

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [accounts, setAccounts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingGoal, setEditingGoal] = useState(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [deletingGoal, setDeletingGoal] = useState(null);
  const [editingContribution, setEditingContribution] = useState(null);

  const [deletingContribution, setDeletingContribution] = useState(null);
  // --------------------------------------------------
  // LOAD DATA
  // --------------------------------------------------

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [goalsResponse, accountsResponse] = await Promise.all([
        fetch("/api/goals"),
        fetch("/api/accounts"),
      ]);

      const goalsData = await goalsResponse.json();
      const accountsData = await accountsResponse.json();

      if (!goalsResponse.ok) {
        throw new Error(goalsData.error || "Failed to load goals");
      }

      if (!accountsResponse.ok) {
        throw new Error(accountsData.error || "Failed to load accounts");
      }

      setGoals(Array.isArray(goalsData) ? goalsData : []);

      setAccounts(Array.isArray(accountsData) ? accountsData : []);
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
  // DELETE
  // --------------------------------------------------

  async function deleteGoal() {
    if (!deletingGoal) return;

    try {
      setError("");

      const response = await fetch(`/api/goals/${deletingGoal.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete goal");
      }

      setDeletingGoal(null);

      await loadData();
    } catch (error) {
      setError(error.message);
    }
  }
  // --------------------------------------------------
  // UPDATE CONTRIBUTION
  // --------------------------------------------------

  async function updateContribution(contribution, amount, note, date) {
    try {
      setError("");

      const response = await fetch(
        `/api/goals/${contribution.goalId}/contributions/${contribution.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            note,
            date,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update contribution");
      }

      setEditingContribution(null);

      await loadData();
    } catch (error) {
      setError(error.message);
    }
  }

  // --------------------------------------------------
  // DELETE CONTRIBUTION
  // --------------------------------------------------

  async function deleteContribution(contribution) {
    try {
      setError("");

      const response = await fetch(
        `/api/goals/${contribution.goalId}/contributions/${contribution.id}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete contribution");
      }

      setDeletingContribution(null);

      await loadData();
    } catch (error) {
      setError(error.message);
    }
  }

  // --------------------------------------------------
  // FORMAT MONEY
  // --------------------------------------------------

  function formatMoney(amount) {
    return Number(amount || 0).toLocaleString();
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* --------------------------------------------------
          HEADER
      -------------------------------------------------- */}

      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Financial Goals</h1>

          <p className="mt-1 text-muted-foreground">
            Set goals and track the money you save toward them.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddGoal(true)}
          className="rounded-md cursor-pointer bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Add goal
        </button>
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
          GOALS
      -------------------------------------------------- */}

      {loading ? (
        <p>Loading...</p>
      ) : goals.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">No financial goals yet.</p>

          <p className="mt-1 text-sm text-muted-foreground">
            Create your first goal to start tracking your savings.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onContribute={() => setSelectedGoal(goal)}
              onDelete={() => setDeletingGoal(goal)}
              onEditContribution={(contribution) =>
                setEditingContribution(contribution)
              }
              onDeleteContribution={(contribution) =>
                setDeletingContribution(contribution)
              }
              onEdit={() => setEditingGoal(goal)}
              formatMoney={formatMoney}
            />
          ))}
        </div>
      )}

      {/* --------------------------------------------------
          ADD GOAL
      -------------------------------------------------- */}

      {showAddGoal && (
        <AddGoalModal
          onClose={() => setShowAddGoal(false)}
          onSaved={async () => {
            setShowAddGoal(false);
            await loadData();
          }}
        />
      )}

      {/* --------------------------------------------------
          CONTRIBUTION
      -------------------------------------------------- */}

      {selectedGoal && (
        <ContributionModal
          goal={selectedGoal}
          accounts={accounts}
          onClose={() => setSelectedGoal(null)}
          onSaved={async () => {
            setSelectedGoal(null);
            await loadData();
          }}
        />
      )}
      {editingGoal && (
  <EditGoalModal
    goal={editingGoal}
    onClose={() =>
      setEditingGoal(null)
    }
    onSaved={async () => {
      setEditingGoal(null);
      await loadData();
    }}
  />
)}
      {editingContribution && (
        <EditContributionModal
          contribution={editingContribution}
          onClose={() => setEditingContribution(null)}
          onSave={updateContribution}
        />
      )}
      {deletingContribution && (
        <DeleteContributionModal
          contribution={deletingContribution}
          onClose={() => setDeletingContribution(null)}
          onDelete={() => deleteContribution(deletingContribution)}
        />
      )}
      {/* --------------------------------------------------
          DELETE
      -------------------------------------------------- */}

      {deletingGoal && (
        <DeleteGoalModal
          goal={deletingGoal}
          onClose={() => setDeletingGoal(null)}
          onDelete={deleteGoal}
        />
      )}
    </div>
  );
}

// ======================================================
// GOAL CARD
// ======================================================

// ======================================================
// GOAL CARD
// ======================================================

function GoalCard({
  goal,
  onContribute,
  onDelete,
   onEdit,
  onEditContribution,
  onDeleteContribution,
  formatMoney,
}) {
  const [showHistory, setShowHistory] = useState(false);

  const contributions = goal.contributions || [];

  return (
    <section className="rounded-xl border bg-card p-6">
      {/* --------------------------------------------------
          HEADER
      -------------------------------------------------- */}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{goal.name}</h2>

          {goal.deadline && (
            <p className="mt-1 text-sm text-muted-foreground">
              Deadline: {new Date(goal.deadline).toLocaleDateString()}
            </p>
          )}
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            goal.status === "COMPLETED"
              ? "bg-green-100 text-green-700"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {goal.status === "COMPLETED" ? "Completed" : "Active"}
        </span>
      </div>

      {/* --------------------------------------------------
          AMOUNTS
      -------------------------------------------------- */}

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Target</p>

          <p className="mt-1 font-semibold">
            {formatMoney(goal.targetAmount)}
            <span className="ml-1 text-xs text-muted-foreground">birr</span>
          </p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Saved</p>

          <p className="mt-1 font-semibold">
            {formatMoney(goal.savedAmount)}
            <span className="ml-1 text-xs text-muted-foreground">birr</span>
          </p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Remaining</p>

          <p className="mt-1 font-semibold">
            {formatMoney(goal.remainingAmount)}
            <span className="ml-1 text-xs text-muted-foreground">birr</span>
          </p>
        </div>
      </div>

      {/* --------------------------------------------------
          PROGRESS
      -------------------------------------------------- */}

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>

          <span className="font-medium">{Math.round(goal.progress)}%</span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{
              width: `${goal.progress}%`,
            }}
          />
        </div>
      </div>

      {/* --------------------------------------------------
          CONTRIBUTION HISTORY TOGGLE
      -------------------------------------------------- */}

      {contributions.length > 0 && (
        <div className="mt-6 border-t pt-4">
          <button
            type="button"
            onClick={() => setShowHistory((current) => !current)}
            className="flex w-full cursor-pointer items-center justify-between text-sm font-medium"
          >
            <span>
              Contribution history
              <span className="ml-2 text-xs text-muted-foreground">
                ({contributions.length})
              </span>
            </span>

            <span className="text-muted-foreground">
              {showHistory ? "Hide" : "View"}
            </span>
          </button>

          {showHistory && (
            <div className="mt-4 space-y-3">
              {contributions.map((contribution) => (
                <div
                  key={contribution.id}
                  className="rounded-lg border bg-muted/30 p-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">
                        +{formatMoney(contribution.amount)} birr
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(contribution.date).toLocaleDateString()}
                      </p>
                    </div>

                    {contribution.account && (
                      <span className="text-right text-xs text-muted-foreground">
                        {contribution.account.name}
                      </span>
                    )}
                  </div>

                  {contribution.note && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {contribution.note}
                    </p>
                  )}
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onEditContribution({
                          ...contribution,
                          goalId: goal.id,
                        })
                      }
                      className="rounded-md cursor-pointer border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onDeleteContribution({
                          ...contribution,
                          goalId: goal.id,
                        })
                      }
                      className="rounded-md cursor-pointer border px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------
          ACTIONS
      -------------------------------------------------- */}

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-md cursor-pointer border px-4 py-2 text-sm hover:bg-muted"
        >
          Edit
        </button>

        {goal.status === "ACTIVE" && (
          <button
            type="button"
            onClick={onContribute}
            className="rounded-md cursor-pointer bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Add money
          </button>
        )}

        {goal.savedAmount === 0 && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md cursor-pointer border px-4 py-2 text-sm text-destructive"
          >
            Delete
          </button>
        )}
      </div>
    </section>
  );
}

// ======================================================
// ADD GOAL MODAL
// ======================================================

function AddGoalModal({ onClose, onSaved }) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!name.trim()) {
      setError("Goal name is required.");
      return;
    }

    if (!targetAmount || Number(targetAmount) <= 0) {
      setError("Target amount must be greater than 0.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch("/api/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          targetAmount,
          deadline,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create goal");
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
      <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
        <ModalHeader
          title="Add financial goal"
          description="Create a target you're working toward."
          onClose={onClose}
        />

        {error && <ErrorMessage message={error} />}

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Goal name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-md border px-3 py-2"
          />

          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Target amount"
            value={targetAmount}
            onChange={(event) => setTargetAmount(event.target.value)}
            className="w-full rounded-md border px-3 py-2"
          />

          <input
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            className="w-full rounded-md border px-3 py-2"
          />
        </div>

        <ModalActions
          onClose={onClose}
          onSave={save}
          saving={saving}
          saveText="Create goal"
        />
      </div>
    </Modal>
  );
}

// ======================================================
// CONTRIBUTION MODAL
// ======================================================

function ContributionModal({ goal, accounts, onClose, onSaved }) {
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!amount || Number(amount) <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }

    if (!accountId) {
      setError("Account is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(`/api/goals/${goal.id}/contributions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          accountId,
          note,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add contribution");
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
      <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
        <ModalHeader
          title={`Add money to ${goal.name}`}
          description={`Remaining: ${Number(
            goal.remainingAmount,
          ).toLocaleString()} birr`}
          onClose={onClose}
        />

        {error && <ErrorMessage message={error} />}

        <div className="space-y-4">
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-full rounded-md border px-3 py-2"
          />

          <select
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="">Select account</option>

            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} — {Number(account.balance ?? 0).toLocaleString()}{" "}
                birr available
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Note (optional)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="w-full rounded-md border px-3 py-2"
          />
        </div>

        <ModalActions
          onClose={onClose}
          onSave={save}
          saving={saving}
          saveText="Add money"
        />
      </div>
    </Modal>
  );
}

// ======================================================
// DELETE MODAL
// ======================================================

function DeleteGoalModal({ goal, onClose, onDelete }) {
  return (
    <Modal>
      <div className="w-full max-w-sm rounded-xl bg-background p-6 shadow-xl">
        <h2 className="text-xl font-semibold">Delete goal?</h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Are you sure you want to delete <strong>{goal.name}</strong>?
        </p>

        <ModalActions onClose={onClose} onSave={onDelete} saveText="Delete" />
      </div>
    </Modal>
  );
}

// ======================================================
// SHARED MODAL
// ======================================================

function Modal({ children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      {children}
    </div>
  );
}
// ======================================================
// EDIT CONTRIBUTION MODAL
// ======================================================

function EditContributionModal({ contribution, onClose, onSave }) {
  const [amount, setAmount] = useState(String(contribution.amount || ""));

  const [note, setNote] = useState(contribution.note || "");

  const [date, setDate] = useState(
    contribution.date
      ? new Date(contribution.date).toISOString().split("T")[0]
      : "",
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!amount || Number(amount) <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await onSave(contribution, amount, note, date);
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal>
      <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
        <ModalHeader
          title="Edit contribution"
          description={`Update the contribution for ${contribution.goal?.name || "this goal"}.`}
          onClose={onClose}
        />

        {error && <ErrorMessage message={error} />}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Amount</label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Date</label>

            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Note</label>

            <input
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Note (optional)"
              className="w-full rounded-md border px-3 py-2"
            />
          </div>
        </div>

        <ModalActions
          onClose={onClose}
          onSave={save}
          saving={saving}
          saveText="Save changes"
        />
      </div>
    </Modal>
  );
}

// ======================================================
// DELETE CONTRIBUTION MODAL
// ======================================================

function DeleteContributionModal({ contribution, onClose, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    try {
      setDeleting(true);
      await onDelete();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal>
      <div className="w-full max-w-sm rounded-xl bg-background p-6 shadow-xl">
        <h2 className="text-xl font-semibold">Delete contribution?</h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Are you sure you want to delete the{" "}
          <strong>{Number(contribution.amount).toLocaleString()} birr</strong>{" "}
          contribution?
          <br />
          The money will be returned to the account.
        </p>

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
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md cursor-pointer bg-destructive px-4 py-2 text-sm text-destructive-foreground disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete contribution"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
function ModalHeader({ title, description, onClose }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>

        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="text-xl cursor-pointer text-muted-foreground hover:text-foreground"
      >
        ×
      </button>
    </div>
  );
}

function ErrorMessage({ message }) {
  return (
    <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      {message}
    </div>
  );
}

function ModalActions({ onClose, onSave, saving = false, saveText = "Save" }) {
  return (
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
        onClick={onSave}
        disabled={saving}
        className="rounded-md cursor-pointer bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
      >
        {saving ? "Saving..." : saveText}
      </button>
    </div>
  );
}

// ======================================================
// EDIT GOAL MODAL
// ======================================================

function EditGoalModal({
  goal,
  onClose,
  onSaved,
}) {
  const [name, setName] = useState(
    goal.name || "",
  );

  const [targetAmount, setTargetAmount] =
    useState(
      String(goal.targetAmount || ""),
    );

  const [deadline, setDeadline] = useState(
    goal.deadline
      ? new Date(goal.deadline)
          .toISOString()
          .split("T")[0]
      : "",
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!name.trim()) {
      setError("Goal name is required.");
      return;
    }

    if (
      !targetAmount ||
      Number(targetAmount) <= 0
    ) {
      setError(
        "Target amount must be greater than 0.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        `/api/goals/${goal.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            targetAmount,
            deadline,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to update goal",
        );
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
      <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">

        <ModalHeader
          title="Edit financial goal"
          description="Update the details of your goal."
          onClose={onClose}
        />

        {error && (
          <ErrorMessage message={error} />
        )}

        <div className="space-y-4">

          <div>
            <label className="mb-1 block text-sm font-medium">
              Goal name
            </label>

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Target amount
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={targetAmount}
              onChange={(event) =>
                setTargetAmount(
                  event.target.value,
                )
              }
              className="w-full rounded-md border px-3 py-2"
            />

            {Number(goal.savedAmount || 0) > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Already saved:{" "}
                {Number(
                  goal.savedAmount,
                ).toLocaleString()}{" "}
                birr
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Deadline
            </label>

            <input
              type="date"
              value={deadline}
              onChange={(event) =>
                setDeadline(
                  event.target.value,
                )
              }
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

        </div>

        <ModalActions
          onClose={onClose}
          onSave={save}
          saving={saving}
          saveText="Save changes"
        />

      </div>
    </Modal>
  );
}