import type { Translator } from "@/lib/i18n/translate";
import styles from "./demo-code-form.module.css";

/**
 * The demo code on the sign-in page (see `src/lib/demo-access.ts`). Before
 * the code is entered it is a quiet disclosure with one field; afterwards it
 * is a line saying the demo accounts are shown here, with a way to hide them
 * again. Both are plain forms posting to server actions, so they work
 * without scripts.
 */
export function DemoCodeForm({
  t,
  shown,
  outcome,
  next,
  unlockAction,
  lockAction,
}: {
  t: Translator;
  /** Whether this device is already unlocked. */
  shown: boolean;
  outcome: "wrong" | "wait" | "unlocked" | null;
  /** Where the visitor was heading, carried through the round trip. */
  next: string;
  unlockAction: (formData: FormData) => Promise<void>;
  lockAction: (formData: FormData) => Promise<void>;
}) {
  if (shown) {
    return (
      <form action={lockAction} className={styles.unlocked}>
        <input type="hidden" name="next" value={next} />
        <p role={outcome === "unlocked" ? "status" : undefined}>
          {t("auth.demoCode.unlocked")}
        </p>
        <button type="submit">{t("auth.demoCode.hide")}</button>
      </form>
    );
  }

  const problem =
    outcome === "wrong"
      ? t("auth.demoCode.wrong")
      : outcome === "wait"
        ? t("auth.demoCode.wait")
        : null;

  return (
    <details className={styles.code} open={Boolean(problem)}>
      <summary>{t("auth.demoCode.summary")}</summary>
      <form action={unlockAction} className={styles.form}>
        <input type="hidden" name="next" value={next} />
        <label htmlFor="demo-code">{t("auth.demoCode.label")}</label>
        <div className={styles.row}>
          <input
            id="demo-code"
            name="demoCode"
            type="password"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            required
            maxLength={200}
            aria-describedby={
              problem ? "demo-code-hint demo-code-problem" : "demo-code-hint"
            }
            aria-invalid={problem ? true : undefined}
          />
          <button type="submit">{t("auth.demoCode.submit")}</button>
        </div>
        <p id="demo-code-hint" className={styles.hint}>
          {t("auth.demoCode.hint")}
        </p>
        {problem ? (
          <p id="demo-code-problem" className={styles.problem} role="alert">
            {problem}
          </p>
        ) : null}
      </form>
    </details>
  );
}
