"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import styles from "../admin.module.css";

export function UserSearchForm({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    router.push(
      (trimmed
        ? `/admin/users?q=${encodeURIComponent(trimmed)}`
        : "/admin/users") as Route,
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.spaced}>
      <div className={styles.formGrid}>
        <label htmlFor="user-search">Search by name or email</label>
        <input
          id="user-search"
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="e.g. owner@cwm-coil.example"
        />
      </div>
      <div className={styles.actionsRow}>
        <button className="button" type="submit">
          Search
        </button>
      </div>
    </form>
  );
}
