"use client";

import { elevatedSelectClass } from "@/components/sales/CreateEntityForm";
import { useEffect, useRef, useState } from "react";

export default function RelatedRecordCombobox({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { kind: string; name: string }[];
  disabled?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // keep local query in sync if value changes externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered =
    query.trim() === ""
      ? options
      : options.filter((r) =>
          r.name.toLowerCase().includes(query.trim().toLowerCase()),
        );

  const MAX_RESULTS = 50; // avoid rendering hundreds of DOM nodes at once
  const visible = filtered.slice(0, MAX_RESULTS);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        className={elevatedSelectClass(false)}
        value={query}
        disabled={disabled}
        placeholder="Search record..."
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (e.target.value === "") onChange("");
        }}
        onFocus={() => setOpen(true)}
      />
      {open && visible.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white shadow-lg">
          {visible.map((r) => (
            <li
              key={`${r.kind}-${r.name}`}
              className="cursor-pointer px-3 py-2 text-sm "
              onClick={() => {
                onChange(r.name);
                setQuery(r.name);
                setOpen(false);
              }}
            >
              {r.name}
            </li>
          ))}
          {filtered.length > MAX_RESULTS && (
            <li className="px-3 py-2 text-xs text-gray-400">
              {filtered.length - MAX_RESULTS} more... keep typing to narrow down
            </li>
          )}
        </ul>
      )}
      {open && query.trim() !== "" && visible.length === 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm text-foreground/70 shadow-lg">
          No matches
        </div>
      )}
    </div>
  );
}
