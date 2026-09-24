"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { featureFlagEnvironments } from "@/modules/platform/feature-flag-environments";
import type { FeatureFlagRecord } from "@/modules/platform/feature-flags";
import styles from "../admin.module.css";
import { createFeatureFlagAction, updateFeatureFlagAction } from "./actions";

function EnvironmentCheckboxes({
  idPrefix,
  selected,
  onChange,
}: {
  idPrefix: string;
  selected: string[];
  onChange: (environments: string[]) => void;
}) {
  return (
    <div className={styles.actionsRow}>
      {featureFlagEnvironments.map((environment) => {
        const id = `${idPrefix}-env-${environment}`;
        const checked = selected.includes(environment);
        return (
          <label key={environment} htmlFor={id}>
            <input
              id={id}
              type="checkbox"
              checked={checked}
              onChange={(event) => {
                onChange(
                  event.target.checked
                    ? [...selected, environment]
                    : selected.filter((value) => value !== environment),
                );
              }}
            />{" "}
            {environment}
          </label>
        );
      })}
    </div>
  );
}

function FeatureFlagEditForm({
  flag,
  onDone,
}: {
  flag: FeatureFlagRecord;
  onDone: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(flag.name);
  const [description, setDescription] = useState(flag.description);
  const [enabled, setEnabled] = useState(flag.enabled);
  const [environments, setEnvironments] = useState<string[]>(flag.environments);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await updateFeatureFlagAction({
        id: flag.id,
        name,
        description,
        enabled,
        environments,
      });
      if (result.status === "updated") {
        router.refresh();
        onDone();
      } else if (result.status === "forbidden") {
        setError("You do not have permission to change feature flags.");
      } else {
        setError("Could not save. Check the fields and try again.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.formGrid}>
      <label htmlFor={`name-${flag.id}`}>Name</label>
      <input
        id={`name-${flag.id}`}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <label htmlFor={`description-${flag.id}`}>Description</label>
      <textarea
        id={`description-${flag.id}`}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <label htmlFor={`enabled-${flag.id}`}>Enabled</label>
      <input
        id={`enabled-${flag.id}`}
        type="checkbox"
        checked={enabled}
        onChange={(event) => setEnabled(event.target.checked)}
      />
      <span>Environments (leave empty for all)</span>
      <EnvironmentCheckboxes
        idPrefix={flag.id}
        selected={environments}
        onChange={setEnvironments}
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

function CreateFeatureFlagForm() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [environments, setEnvironments] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await createFeatureFlagAction({
        key,
        name,
        description,
        enabled,
        environments,
      });
      if (result.status === "created") {
        setKey("");
        setName("");
        setDescription("");
        setEnabled(false);
        setEnvironments([]);
        router.refresh();
      } else if (result.status === "duplicate_key") {
        setError("That key is already in use.");
      } else if (result.status === "forbidden") {
        setError("You do not have permission to create feature flags.");
      } else {
        setError("Could not create the flag. Check the fields.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.formGrid}>
      <label htmlFor="new-flag-key">Key</label>
      <input
        id="new-flag-key"
        value={key}
        onChange={(event) => setKey(event.target.value)}
        placeholder="e.g. site-wide-search"
        required
      />
      <label htmlFor="new-flag-name">Name</label>
      <input
        id="new-flag-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />
      <label htmlFor="new-flag-description">Description</label>
      <textarea
        id="new-flag-description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        required
      />
      <label htmlFor="new-flag-enabled">Enabled</label>
      <input
        id="new-flag-enabled"
        type="checkbox"
        checked={enabled}
        onChange={(event) => setEnabled(event.target.checked)}
      />
      <span>Environments (leave empty for all)</span>
      <EnvironmentCheckboxes
        idPrefix="new-flag"
        selected={environments}
        onChange={setEnvironments}
      />
      {error ? <p className={styles.feedbackError}>{error}</p> : null}
      <div className={styles.actionsRow}>
        <button className="button primary" type="submit" disabled={pending}>
          {pending ? "Creating…" : "Add flag"}
        </button>
      </div>
    </form>
  );
}

export function FeatureFlagManager({ flags }: { flags: FeatureFlagRecord[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Key</th>
              <th>Name</th>
              <th>Status</th>
              <th>Environments</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {flags.length === 0 ? (
              <tr>
                <td colSpan={5}>No feature flags yet.</td>
              </tr>
            ) : (
              flags.map((flag) =>
                editingId === flag.id ? (
                  <tr key={flag.id}>
                    <td colSpan={5}>
                      <FeatureFlagEditForm
                        flag={flag}
                        onDone={() => setEditingId(null)}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={flag.id}>
                    <td>{flag.key}</td>
                    <td>{flag.name}</td>
                    <td>
                      <span
                        className={`${styles.pill} ${flag.enabled ? styles.toneSuccess : styles.toneNeutral}`}
                      >
                        {flag.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    <td>
                      {flag.environments.length === 0
                        ? "All"
                        : flag.environments.join(", ")}
                    </td>
                    <td>
                      <button
                        className="button"
                        type="button"
                        onClick={() => setEditingId(flag.id)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </div>

      <div className={`${styles.card} ${styles.spaced}`}>
        <h3>Add a feature flag</h3>
        <CreateFeatureFlagForm />
      </div>
    </>
  );
}
