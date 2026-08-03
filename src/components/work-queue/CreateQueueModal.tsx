"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, X } from "lucide-react";

type BasedOn = "customView" | "dateField" | "criteria";
type OwnedBy = "onlyMe" | "allUser" | "selectedUser";

interface CriteriaRow {
  id: string;
  field: string;
  operator: string;
  value: string;
}

export interface QueuePayload {
  module: string;
  basedOn: BasedOn;
  customView?: string;
  dateField?: string;
  dateComparator?: string;
  dateValue?: number;
  dateUnit?: string;
  criteria?: CriteriaRow[];
  viewName: string;
  ownedBy: OwnedBy;
  selectedUserId?: string;
}

/* ------------------------------------------------------------------ */
/* Static option lists — swap for API data when wiring this up        */
/* ------------------------------------------------------------------ */

const MODULES = ["Leads", "Contacts", "Deals", "Accounts"];

const CUSTOM_VIEWS: Record<string, string[]> = {
  Leads: ["All Leads", "My Leads", "Unassigned Leads"],
  Contacts: ["All Contacts", "My Contacts"],
  Deals: ["All Deals", "My Deals", "Open Deals"],
  Accounts: ["All Accounts"],
};

const DATE_FIELDS = [
  "Created Time",
  "Modified Time",
  "Last Activity Time",
  "Unsubscribed Time",
  "Date/Time 1",
  "Date 1",
  "Date of Appointment",
];

const DATE_COMPARATORS = [
  "Today",
  "Tomorrow",
  "This Week",
  "Next Week",
  "This Month",
  "Next Month",
  "In the Last",
  "Due In",
];

const DATE_UNITS = ["days", "weeks", "months"];

const CRITERIA_FIELDS = [
  "Annual Revenue",
  "Lead Score",
  "Industry",
  "Number of Employees",
];

const CRITERIA_OPERATORS = [">=", "<=", "=", "!=", ">", "<"];

const SAMPLE_USERS = [
  { id: "u1", name: "Sita Sharma" },
  { id: "u2", name: "Rajesh Koirala" },
  { id: "u3", name: "Anu Gurung" },
];

/* ------------------------------------------------------------------ */
/* Small building blocks                                              */
/* ------------------------------------------------------------------ */

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 py-2">
      <label className="w-36 shrink-0 pt-2 text-sm font-medium text-gray-600">
        {label}
      </label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function RequiredSelect({
  value,
  onChange,
  options,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-md border border-l-[3px] border-gray-300 border-l-red-500 bg-white px-3 py-1 pr-8 text-sm text-gray-800 outline-none focus:border-indigo-400"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
    </div>
  );
}

function PlainSelect({
  value,
  onChange,
  options,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-1 pr-8 text-sm text-gray-800 outline-none focus:border-indigo-400"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
    </div>
  );
}

function RequiredInput({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-md border border-l-[3px] border-gray-300 border-l-red-500 bg-white px-3 py-1 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-indigo-400 ${className}`}
    />
  );
}

function RadioOption<T extends string>({
  label,
  value,
  current,
  onSelect,
  name,
}: {
  label: string;
  value: T;
  current: T;
  onSelect: (v: T) => void;
  name: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
      <input
        type="radio"
        name={name}
        checked={current === value}
        onChange={() => onSelect(value)}
        className="h-4 w-4 accent-indigo-600"
      />
      {label}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Modal                                                              */
/* ------------------------------------------------------------------ */

export default function CreateQueueModal({
  open,
  onClose,
  onSave,
  onSuggestedQueues,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (payload: QueuePayload) => void;
  onSuggestedQueues?: () => void;
}) {
  const [module, setModule] = useState(MODULES[0]);
  const [basedOn, setBasedOn] = useState<BasedOn>("customView");

  const [customView, setCustomView] = useState(CUSTOM_VIEWS[MODULES[0]][0]);

  const [dateField, setDateField] = useState(DATE_FIELDS[0]);
  const [dateComparator, setDateComparator] = useState("Due In");
  const [dateValue, setDateValue] = useState(1);
  const [dateUnit, setDateUnit] = useState(DATE_UNITS[0]);

  const [criteria, setCriteria] = useState<CriteriaRow[]>([
    { id: "1", field: CRITERIA_FIELDS[0], operator: ">=", value: "" },
  ]);

  const [viewName, setViewName] = useState(CUSTOM_VIEWS[MODULES[0]][0]);
  const [viewNameTouched, setViewNameTouched] = useState(false);

  const [ownedBy, setOwnedBy] = useState<OwnedBy>("onlyMe");
  const [selectedUserId, setSelectedUserId] = useState(SAMPLE_USERS[0].id);

  if (!open) return null;

  /* ---- derived / cross-field behavior, mirrors the real app ---- */

  function handleModuleChange(next: string) {
    setModule(next);
    const firstView = CUSTOM_VIEWS[next]?.[0] ?? "";
    setCustomView(firstView);
    if (basedOn === "customView" && !viewNameTouched) setViewName(firstView);
  }

  function handleCustomViewChange(next: string) {
    setCustomView(next);
    if (!viewNameTouched) setViewName(next);
  }

  function handleBasedOnChange(next: BasedOn) {
    setBasedOn(next);
    if (viewNameTouched) return;
    if (next === "customView") setViewName(customView);
    else setViewName("");
  }

  function handleViewNameChange(next: string) {
    setViewNameTouched(true);
    setViewName(next);
  }

  function addCriteriaRow() {
    setCriteria((rows) => [
      ...rows,
      {
        id: `${Date.now()}`,
        field: CRITERIA_FIELDS[0],
        operator: ">=",
        value: "",
      },
    ]);
  }

  function removeCriteriaRow(id: string) {
    setCriteria((rows) => rows.filter((r) => r.id !== id));
  }

  function updateCriteriaRow(id: string, patch: Partial<CriteriaRow>) {
    setCriteria((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  }

  const needsDateAmount =
    dateComparator === "In the Last" || dateComparator === "Due In";

  const isValid =
    viewName.trim().length > 0 &&
    (basedOn !== "customView" || Boolean(customView)) &&
    (basedOn !== "criteria" ||
      criteria.every((r) => r.value.trim().length > 0)) &&
    (ownedBy !== "selectedUser" || Boolean(selectedUserId));

  function handleSave() {
    if (!isValid) return;

    const payload: QueuePayload = { module, basedOn, viewName, ownedBy };

    if (basedOn === "customView") {
      payload.customView = customView;
    }
    if (basedOn === "dateField") {
      payload.dateField = dateField;
      payload.dateComparator = dateComparator;
      if (needsDateAmount) {
        payload.dateValue = dateValue;
        payload.dateUnit = dateUnit;
      }
    }
    if (basedOn === "criteria") {
      payload.criteria = criteria;
    }
    if (ownedBy === "selectedUser") {
      payload.selectedUserId = selectedUserId;
    }

    onSave(payload);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Create New Queue
          </h2>
          <div className="flex items-center gap-4">
            {onSuggestedQueues && (
              <button
                type="button"
                onClick={onSuggestedQueues}
                className="flex items-center gap-0.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Suggested Queues
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {/* Select module */}
          <FieldRow label="Select module">
            <RequiredSelect
              value={module}
              onChange={handleModuleChange}
              options={MODULES}
            />
          </FieldRow>

          {/* Based On */}
          <FieldRow label="Based On">
            <div className="flex items-center gap-2 pt-2">
              <RadioOption
                name="basedOn"
                label="Custom View"
                value="customView"
                current={basedOn}
                onSelect={handleBasedOnChange}
              />
              <RadioOption
                name="basedOn"
                label="Date Field"
                value="dateField"
                current={basedOn}
                onSelect={handleBasedOnChange}
              />
              <RadioOption
                name="basedOn"
                label="Criteria"
                value="criteria"
                current={basedOn}
                onSelect={handleBasedOnChange}
              />
            </div>
          </FieldRow>

          {/* --- Custom View branch --- */}
          {basedOn === "customView" && (
            <FieldRow label="Custom View">
              <RequiredSelect
                value={customView}
                onChange={handleCustomViewChange}
                options={CUSTOM_VIEWS[module] ?? []}
              />
            </FieldRow>
          )}

          {/* --- Date Field branch --- */}
          {basedOn === "dateField" && (
            <FieldRow label="Date field">
              <div className="flex flex-wrap items-center gap-1">
                <RequiredSelect
                  value={dateField}
                  onChange={setDateField}
                  options={DATE_FIELDS}
                  className="min-w-[9.5rem] flex-1"
                />
                <RequiredSelect
                  value={dateComparator}
                  onChange={setDateComparator}
                  options={DATE_COMPARATORS}
                  className="min-w-[7.5rem] flex-1"
                />
                {needsDateAmount && (
                  <>
                    <input
                      type="number"
                      min={1}
                      value={dateValue}
                      onChange={(e) =>
                        setDateValue(Math.max(1, Number(e.target.value)))
                      }
                      className="w-16 rounded-md border border-gray-300 px-2 py-2 text-center text-sm outline-none focus:border-indigo-400"
                    />
                    <PlainSelect
                      value={dateUnit}
                      onChange={setDateUnit}
                      options={DATE_UNITS}
                      className="w-24"
                    />
                  </>
                )}
              </div>
            </FieldRow>
          )}

          {/* --- Criteria branch --- */}
          {basedOn === "criteria" && (
            <FieldRow label="Criteria">
              <div className="space-y-1">
                {criteria.map((row, i) => (
                  <div key={row.id} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-300 text-xs text-gray-500">
                      {i + 1}
                    </span>
                    <PlainSelect
                      value={row.field}
                      onChange={(v) => updateCriteriaRow(row.id, { field: v })}
                      options={CRITERIA_FIELDS}
                      className="min-w-[6rem] flex-1"
                    />
                    <PlainSelect
                      value={row.operator}
                      onChange={(v) =>
                        updateCriteriaRow(row.id, { operator: v })
                      }
                      options={CRITERIA_OPERATORS}
                      className="w-16"
                    />
                    <input
                      value={row.value}
                      onChange={(e) =>
                        updateCriteriaRow(row.id, { value: e.target.value })
                      }
                      placeholder="Value"
                      className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm outline-none focus:border-indigo-400"
                    />
                    {i === criteria.length - 1 ? (
                      <button
                        type="button"
                        aria-label="Add criteria"
                        onClick={addCriteriaRow}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-green-600 hover:bg-green-50"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-label="Remove criteria"
                        onClick={() => removeCriteriaRow(row.id)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </FieldRow>
          )}

          {/* View Name — required in every branch */}
          <FieldRow label="View Name">
            <RequiredInput
              value={viewName}
              onChange={handleViewNameChange}
              placeholder="Enter name"
            />
          </FieldRow>

          {/* Show records owned by */}
          <FieldRow label="Show records owned by">
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex items-center gap-2">
                <RadioOption
                  name="ownedBy"
                  label="Only Me"
                  value="onlyMe"
                  current={ownedBy}
                  onSelect={setOwnedBy}
                />
                <RadioOption
                  name="ownedBy"
                  label="All User"
                  value="allUser"
                  current={ownedBy}
                  onSelect={setOwnedBy}
                />
                <RadioOption
                  name="ownedBy"
                  label="Selected User"
                  value="selectedUser"
                  current={ownedBy}
                  onSelect={setOwnedBy}
                />
              </div>
              {ownedBy === "selectedUser" && (
                <PlainSelect
                  value={
                    SAMPLE_USERS.find((u) => u.id === selectedUserId)?.name ??
                    SAMPLE_USERS[0].name
                  }
                  onChange={(name) =>
                    setSelectedUserId(
                      SAMPLE_USERS.find((u) => u.name === name)?.id ??
                        SAMPLE_USERS[0].id,
                    )
                  }
                  options={SAMPLE_USERS.map((u) => u.name)}
                  className="mt-1 max-w-xs"
                />
              )}
            </div>
          </FieldRow>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isValid}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
