"use client";

import DeleteError from "@/components/DeleteError";
import { useEffect, useState } from "react";

export default function CategoriesPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupName, setGroupName] = useState("");
  const [deleteError, setDeleteError] = useState({});
  const [categoryName, setCategoryName] = useState("");
  const [categoryGroupId, setCategoryGroupId] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  function openEditCategory(category) {
    setOpenMenuId(null);
    setEditingCategory(category);
  }

  function openEditGroup(group) {
    setOpenMenuId(null);
    setEditingGroup(group);
  }
  async function loadGroups() {
    try {
      setError("");

      const response = await fetch("/api/category-groups");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load categories");
      }

      setGroups(Array.isArray(data) ? data : []);

      if (data.length > 0) {
        setCategoryGroupId((currentId) => {
          const stillExists = data.some((group) => group.id === currentId);

          return stillExists ? currentId : data[0].id;
        });
      } else {
        setCategoryGroupId("");
      }
    } catch (error) {
      
      setError(error.message);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGroups();
  }, []);

  async function handleAddGroup(event) {
    event.preventDefault();

    if (!groupName.trim()) {
      setError("Group name is required.");
      return;
    }

    try {
      setError("");

      const response = await fetch("/api/category-groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: groupName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create group");
      }

      setGroupName("");

      await loadGroups();

      setCategoryGroupId(data.id);
    } catch (error) {
      
      setError(error.message);
    }
  }

  async function handleAddCategory(event) {
    event.preventDefault();

    if (!categoryName.trim()) {
      setError("Category name is required.");
      return;
    }

    if (!categoryGroupId) {
      setError("Create a group first.");
      return;
    }

    try {
      setError("");

      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: categoryName,
          groupId: categoryGroupId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create category");
      }

      setCategoryName("");

      await loadGroups();
    } catch (error) {
      
      setError(error.message);
    }
  }

  async function handleDeleteGroup(group) {
    const confirmed = window.confirm(
      `Delete "${group.name}" and all categories inside it?`,
    );

    if (!confirmed) {
      return;
    }

    setDeleteError((previous) => ({
      ...previous,
      [`group-${group.id}`]: "",
    }));

    setDeletingId(`group-${group.id}`);

    try {
      const response = await fetch(`/api/category-groups/${group.id}`, {
        method: "DELETE",
      });

      const text = await response.text();

      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setDeleteError((previous) => ({
          ...previous,
          [`group-${group.id}`]: "Unable to process the server response.",
        }));
        return;
      }

      if (!response.ok) {
        setDeleteError((previous) => ({
          ...previous,
          [`group-${group.id}`]:
            data.error || "This category group cannot be deleted.",
        }));
        return;
      }

      await loadGroups();
    } catch (error) {
      

      setDeleteError((previous) => ({
        ...previous,
        [`group-${group.id}`]:
          "Something went wrong while deleting the category group.",
      }));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteCategory(category) {
    const confirmed = window.confirm(`Delete "${category.name}"?`);

    if (!confirmed) {
      return;
    }

    setDeleteError((previous) => ({
      ...previous,
      [category.id]: "",
    }));

    setDeletingId(`category-${category.id}`);

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
      });

      const text = await response.text();

      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setDeleteError((previous) => ({
          ...previous,
          [category.id]: "Unable to process the server response.",
        }));
        return;
      }

      if (!response.ok) {
        setDeleteError((previous) => ({
          ...previous,
          [category.id]: data.error || "This category cannot be deleted.",
        }));
        return;
      }

      await loadGroups();
    } catch (error) {
      

      setDeleteError((previous) => ({
        ...previous,
        [category.id]: "Something went wrong while deleting the category.",
      }));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6" onClick={() => setOpenMenuId(null)}>
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Categories</h1>

        <p className="mt-1 text-muted-foreground">
          Organize what your money is used for.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Add Group */}
        <section className="rounded-xl border bg-card p-6">
          <h2 className="mb-1 text-xl font-semibold">Add category group</h2>

          <p className="mb-5 text-sm text-muted-foreground">
            Examples: Essentials, Personal, Financial.
          </p>

          <form onSubmit={handleAddGroup} className="space-y-4">
            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Group name"
              className="w-full rounded-md border px-3 py-2"
            />

            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
            >
              Add group
            </button>
          </form>
        </section>

        {/* Add Category */}
        <section className="rounded-xl border bg-card p-6">
          <h2 className="mb-1 text-xl font-semibold">Add category</h2>

          <p className="mb-5 text-sm text-muted-foreground">
            Add a category inside one of your groups.
          </p>

          <form onSubmit={handleAddCategory} className="space-y-4">
            <input
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              placeholder="Category name"
              className="w-full rounded-md border px-3 py-2"
            />

            <select
              value={categoryGroupId}
              onChange={(event) => setCategoryGroupId(event.target.value)}
              className="w-full rounded-md border px-3 py-2"
            >
              <option value="">Select a group</option>

              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={groups.length === 0}
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
            >
              Add category
            </button>
          </form>
        </section>
      </div>

      {/* Categories */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">Your categories</h2>

        {loading ? (
          <p>Loading...</p>
        ) : groups.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <p className="font-medium">No category groups yet</p>

            <p className="mt-1 text-sm text-muted-foreground">
              Create a group to start organizing your spending.
            </p>
          </div>
        ) : (
         <div className="grid gap-10 md:grid-cols-2">
            {groups.map((group) => (
              <div key={group.id} className="rounded-xl border bg-card p-5">
                <DeleteError message={deleteError[`group-${group.id}`]} />
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{group.name}</h3>

                  <div className="relative">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();

                        setOpenMenuId(
                          openMenuId === `group-${group.id}`
                            ? null
                            : `group-${group.id}`,
                        );
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
                      aria-label="Group options"
                    >
                      ⋮
                    </button>

                    {openMenuId === `group-${group.id}` && (
                      <div
                        onClick={(event) => event.stopPropagation()}
                        className="absolute right-0 top-10 z-20 w-32 overflow-hidden rounded-lg border bg-background shadow-lg"
                      >
                        <button
                          onClick={() => openEditGroup(group)}
                          className="block w-full px-4 py-2 text-left text-sm hover:bg-muted"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDeleteGroup(group)}
                          disabled={deletingId === `group-${group.id}` || loading}
                          className="block w-full px-4 py-2 text-left text-sm text-destructive hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === `group-${group.id}`
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {group.categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No categories in this group yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {group.categories.map((category) => (
                      <div
                        key={category.id}
                        className="rounded-lg border px-4 py-3"
                      >
                        <DeleteError message={deleteError[category.id]} />

                        <div className="flex items-center justify-between ">
                          <span>{category.name}</span>

                          <div className="relative">
                            <button
                              onClick={(event) => {
                                event.stopPropagation();

                                setOpenMenuId(
                                  openMenuId === `category-${category.id}`
                                    ? null
                                    : `category-${category.id}`,
                                );
                              }}
                              className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
                              aria-label="Category options"
                            >
                              ⋮
                            </button>

                            {openMenuId === `category-${category.id}` && (
                              <div
                                onClick={(event) => event.stopPropagation()}
                                className="absolute right-0 top-10 z-20 w-32 overflow-hidden rounded-lg border bg-background shadow-lg"
                              >
                                <button
                                  onClick={() => openEditCategory(category)}
                                  className="block w-full px-4 py-2 text-left text-sm hover:bg-muted"
                                >
                                  Edit
                                </button>

                                <button
                                  onClick={() => handleDeleteCategory(category)}
                                  disabled={deletingId === `${category.id}`}
                                  className="block w-full px-4 py-2 text-left text-sm text-destructive hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {deletingId === `${category.id}`
                                    ? "Deleting..."
                                    : "Delete"}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
      {editingCategory && (
        <EditCategoryModal
          category={editingCategory}
          groups={groups}
          onClose={() => setEditingCategory(null)}
          onSaved={async () => {
            setEditingCategory(null);
            await loadGroups();
          }}
        />
      )}

      {editingGroup && (
        <EditGroupModal
          group={editingGroup}
          onClose={() => setEditingGroup(null)}
          onSaved={async () => {
            setEditingGroup(null);
            await loadGroups();
          }}
        />
      )}
    </div>
  );
}
function EditCategoryModal({ category, groups, onClose, onSaved }) {
  const [name, setName] = useState(category.name);
  const [groupId, setGroupId] = useState(category.groupId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }

    if (!groupId) {
      setError("Category group is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(`/api/categories/${category.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          groupId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update category");
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
            <h2 className="text-xl font-semibold">Edit category</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Update the category details.
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
            <label className="mb-1 block text-sm font-medium">
              Category name
            </label>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border px-3 py-2"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Group</label>

            <select
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
              className="w-full rounded-md border px-3 py-2"
            >
              <option value="">Select a group</option>

              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-md border px-4 py-2 text-sm"
          >
            Cancel
          </button>

          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
function EditGroupModal({ group, onClose, onSaved }) {
  const [name, setName] = useState(group.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(`/api/category-groups/${group.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update group");
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
            <h2 className="text-xl font-semibold">Edit category group</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Update the group name.
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

        <div>
          <label className="mb-1 block text-sm font-medium">Group name</label>

          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-md border px-3 py-2"
            autoFocus
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-md border px-4 py-2 text-sm"
          >
            Cancel
          </button>

          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
