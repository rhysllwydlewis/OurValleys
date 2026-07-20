"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type { AdminCategory } from "@/modules/reference-data/admin-categories";
import styles from "../admin.module.css";
import { createCategoryAction, updateCategoryAction } from "./actions";

function CategoryEditForm({
  category,
  onDone,
}: {
  category: AdminCategory;
  onDone: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(category.name);
  const [slug, setSlug] = useState(category.slug);
  const [description, setDescription] = useState(category.description);
  const [status, setStatus] = useState(category.status);
  const [sortOrder, setSortOrder] = useState(String(category.sortOrder));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await updateCategoryAction({
        id: category.id,
        name,
        slug,
        description,
        status,
        sortOrder: Number(sortOrder),
      });
      if (result.status === "updated") {
        router.refresh();
        onDone();
      } else if (result.status === "duplicate_slug") {
        setError("That slug is already in use.");
      } else {
        setError("Could not save. Check the fields and try again.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.formGrid}>
      <label htmlFor={`name-${category.id}`}>Name</label>
      <input
        id={`name-${category.id}`}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <label htmlFor={`slug-${category.id}`}>Slug</label>
      <input
        id={`slug-${category.id}`}
        value={slug}
        onChange={(event) => setSlug(event.target.value)}
      />
      <label htmlFor={`description-${category.id}`}>Description</label>
      <textarea
        id={`description-${category.id}`}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <label htmlFor={`status-${category.id}`}>Status</label>
      <select
        id={`status-${category.id}`}
        value={status}
        onChange={(event) => setStatus(event.target.value)}
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <label htmlFor={`sort-${category.id}`}>Sort order</label>
      <input
        id={`sort-${category.id}`}
        type="number"
        min={0}
        value={sortOrder}
        onChange={(event) => setSortOrder(event.target.value)}
      />
      {error ? <p className={styles.feedbackError}>{error}</p> : null}
      <div className={styles.actionsRow}>
        <button className="button primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button className="button" type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function CreateCategoryForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await createCategoryAction({
        name,
        slug,
        description,
        sortOrder: Number(sortOrder),
      });
      if (result.status === "created") {
        setName("");
        setSlug("");
        setDescription("");
        setSortOrder("0");
        router.refresh();
      } else if (result.status === "duplicate_slug") {
        setError("That slug is already in use.");
      } else {
        setError("Could not create the category. Check the fields.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.formGrid}>
      <label htmlFor="new-category-name">Name</label>
      <input
        id="new-category-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />
      <label htmlFor="new-category-slug">Slug</label>
      <input
        id="new-category-slug"
        value={slug}
        onChange={(event) => setSlug(event.target.value)}
        placeholder="e.g. home-heating"
        required
      />
      <label htmlFor="new-category-description">Description</label>
      <textarea
        id="new-category-description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        required
      />
      <label htmlFor="new-category-sort">Sort order</label>
      <input
        id="new-category-sort"
        type="number"
        min={0}
        value={sortOrder}
        onChange={(event) => setSortOrder(event.target.value)}
      />
      {error ? <p className={styles.feedbackError}>{error}</p> : null}
      <div className={styles.actionsRow}>
        <button className="button primary" type="submit" disabled={pending}>
          {pending ? "Creating…" : "Add category"}
        </button>
      </div>
    </form>
  );
}

export function CategoryManager({
  categories,
}: {
  categories: AdminCategory[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Sort</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((item) =>
              editingId === item.id ? (
                <tr key={item.id}>
                  <td colSpan={5}>
                    <CategoryEditForm
                      category={item}
                      onDone={() => setEditingId(null)}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.slug}</td>
                  <td>{item.status}</td>
                  <td>{item.sortOrder}</td>
                  <td>
                    <button
                      className="button"
                      type="button"
                      onClick={() => setEditingId(item.id)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      <div className={`${styles.card} ${styles.spaced}`}>
        <h3>Add a category</h3>
        <CreateCategoryForm />
      </div>
    </>
  );
}
