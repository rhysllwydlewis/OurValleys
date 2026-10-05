"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import styles from "./search-suggest-input.module.css";

type Suggestion = {
  kind: "business" | "category" | "place";
  label: string;
  detail?: string;
  href: string;
};

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "role" | "onChange" | "value"
> & { name: string; defaultValue?: string };

const MIN_LENGTH = 2;
const DEBOUNCE_MS = 200;
const KIND_LABEL = {
  business: "Business",
  category: "Category",
  place: "Place",
};

/**
 * Search input with an ARIA combobox of suggestions. Without JavaScript it is
 * a plain input, so the surrounding form still submits normally. The list is
 * portalled and fixed-positioned so glass containers with overflow hidden or
 * backdrop filters cannot clip it.
 */
export function SearchSuggestInput({
  defaultValue = "",
  ...inputProps
}: Props) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [box, setBox] = useState<{
    left: number;
    top: number;
    width: number;
  }>();

  useEffect(() => {
    const text = value.trim();
    if (text.length < MIN_LENGTH) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search/suggest?q=${encodeURIComponent(text)}`,
          { signal: controller.signal },
        );
        if (!response.ok) return;
        const data = (await response.json()) as { suggestions?: Suggestion[] };
        setSuggestions(data.suggestions ?? []);
        setActive(-1);
      } catch {
        // Aborted or offline: the plain form still works.
      }
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  const visible =
    open && value.trim().length >= MIN_LENGTH && suggestions.length > 0;

  useEffect(() => {
    if (!visible) return;
    function place() {
      const rect = inputRef.current?.getBoundingClientRect();
      if (rect)
        setBox({ left: rect.left, top: rect.bottom + 6, width: rect.width });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [visible]);

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    setValue(event.target.value);
    setOpen(true);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      // Closes the list first; browsers would otherwise also clear a search input.
      if (visible) event.preventDefault();
      setOpen(false);
      setActive(-1);
      return;
    }
    if (!visible) {
      if (event.key === "ArrowDown" && suggestions.length > 0) {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Enter" && active >= 0) {
      const chosen = suggestions[active];
      if (chosen) {
        event.preventDefault();
        go(chosen);
      }
    }
  }

  function go(suggestion: Suggestion) {
    setOpen(false);
    router.push(suggestion.href as Route);
  }

  return (
    <>
      <input
        {...inputProps}
        ref={inputRef}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        role="combobox"
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          visible && active >= 0 ? `${listId}-${active}` : undefined
        }
      />
      {visible && box && typeof document !== "undefined"
        ? createPortal(
            <ul
              id={listId}
              role="listbox"
              aria-label="Search suggestions"
              className={styles.list}
              style={{ left: box.left, top: box.top, width: box.width }}
            >
              {suggestions.map((suggestion, index) => (
                <li
                  key={`${suggestion.kind}-${suggestion.href}`}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  className={styles.option}
                  data-active={index === active || undefined}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    go(suggestion);
                  }}
                >
                  <span className={styles.label}>{suggestion.label}</span>
                  <span className={styles.detail}>
                    {KIND_LABEL[suggestion.kind]}
                    {suggestion.kind === "business" && suggestion.detail
                      ? ` · ${suggestion.detail}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </>
  );
}
