/**
 * Combobox — searchable dropdown.
 * Accessible, keyboard navigable, no external library dependency.
 */
"use client";

import {
  useState, useRef, useEffect, useCallback, type KeyboardEvent,
} from "react";

interface ComboboxProps<T extends string> {
  options:     readonly T[];
  value:       T | "";
  onChange:    (value: T) => void;
  placeholder?: string;
  label?:      string;
  error?:      string;
  id?:         string;
}

export function Combobox<T extends string>({
  options,
  value,
  onChange,
  placeholder = "Search…",
  label,
  error,
  id = "combobox",
}: ComboboxProps<T>) {
  const [query,       setQuery]       = useState(value);
  const [open,        setOpen]        = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.toLowerCase())
  );

  // Sync internal query when external value changes
  useEffect(() => { setQuery(value); }, [value]);

  const select = useCallback((option: T) => {
    onChange(option);
    setQuery(option);
    setOpen(false);
    inputRef.current?.blur();
  }, [onChange]);

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = filtered[highlighted];
      if (chosen) select(chosen as T);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest(`#${id}-wrap`)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [id]);

  return (
    <div id={`${id}-wrap`} style={{ position: "relative" }}>
      {label && (
        <label htmlFor={id} style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={`${id}-list`}
        autoComplete="off"
        value={query}
        placeholder={placeholder}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlighted(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        style={{
          width: "100%", padding: "10px 12px", borderRadius: 8,
          border: error ? "1.5px solid #e53e3e" : "1.5px solid #ccc",
          fontSize: 14, outline: "none",
        }}
      />
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          style={{
            position: "absolute", zIndex: 50, width: "100%",
            background: "#fff", border: "1px solid #ccc", borderRadius: 8,
            maxHeight: 220, overflowY: "auto", margin: 0, padding: 0,
            listStyle: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          {filtered.map((option, i) => (
            <li
              key={option}
              role="option"
              aria-selected={option === value}
              onClick={() => select(option as T)}
              style={{
                padding: "10px 14px", cursor: "pointer", fontSize: 14,
                background: i === highlighted ? "#f0f4ff" : "transparent",
                fontWeight: option === value ? 600 : 400,
              }}
              onMouseEnter={() => setHighlighted(i)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <span style={{ color: "#e53e3e", fontSize: 12, marginTop: 4, display: "block" }}>
          {error}
        </span>
      )}
    </div>
  );
}
