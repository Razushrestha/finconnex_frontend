"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileBarChart, Database, Calendar, User, Type } from "lucide-react";
import {
  REPORT_DATA_SOURCES,
  REPORT_DATE_RANGES,
  REPORT_OWNERS,
  REPORT_SCHEDULES,
  REPORT_TYPES,
  appendReportAudit,
  buildPreviewRows,
  formatReportDate,
  nextReportIds,
  upsertReport,
  type ReportSchedule,
  type ReportType,
} from "@/lib/reports/types";
import {
  CreateEntityFormShell,
  Field,
  InputShell,
  TextAreaShell,
  elevatedInputClass,
  elevatedSelectClass,
  elevatedTextareaClass,
} from "@/components/sales/CreateEntityForm";

interface Props {
  layoutId: string;
  redirect: boolean;
}

export function CreateReportForm({ layoutId: _l, redirect: _r }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<ReportType>("Lead");
  const [dataSource, setDataSource] = useState<string>(REPORT_DATA_SOURCES[0]);
  const [dateRange, setDateRange] = useState<string>(REPORT_DATE_RANGES[1]);
  const [filters, setFilters] = useState("");
  const [groupBy, setGroupBy] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [schedule, setSchedule] = useState<ReportSchedule>("None");
  const [createdBy, setCreatedBy] = useState<string>(REPORT_OWNERS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required";
    if (!type) next.type = "Type is required";
    if (!dataSource) next.dataSource = "Data source is required";
    if (!dateRange) next.dateRange = "Date range is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSave(createAnother: boolean) {
    if (!validate()) return;
    const ids = nextReportIds();
    const status = schedule === "None" ? "Ready" : "Scheduled";
    const created = upsertReport(
      appendReportAudit(
        {
          id: ids.id,
          reportId: ids.reportId,
          name: name.trim(),
          type,
          status,
          dataSource,
          dateRange,
          filters: filters.trim() || undefined,
          groupBy: groupBy.trim() || undefined,
          sortBy: sortBy.trim() || undefined,
          schedule,
          createdBy,
          createdAt: formatReportDate(),
          previewRows: buildPreviewRows(type),
          audit: [],
        },
        "Created",
        createdBy,
      ),
    );
    if (schedule !== "None") {
      upsertReport(
        appendReportAudit(created, `Scheduled ${schedule}`, createdBy),
      );
    }
    if (createAnother) {
      setName("");
      setFilters("");
      setErrors({});
      return;
    }
    router.push(`/reports/${created.id}`);
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Reports", href: "/reports" }}
      badge="§14"
      title="Create Report"
      subtitle="Ad hoc and scheduled reporting across CRM data sources."
      tip="Name, Type, Data Source, and Date Range are required."
      cardIcon={FileBarChart}
      cardTitle="Report definition"
      cardDescription="SRS §14 — exportable for finance and management"
      listHref="/reports"
      saveLabel="Save report"
      onSave={onSave}
    >
      <Field label="Name" required error={errors.name} className="sm:col-span-2">
        <InputShell icon={Type} error={!!errors.name}>
          <input
            className={elevatedInputClass(true)}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Monthly lead funnel"
          />
        </InputShell>
      </Field>
      <Field label="Type" required error={errors.type}>
        <InputShell icon={FileBarChart} error={!!errors.type}>
          <select
            className={elevatedSelectClass(true)}
            value={type}
            onChange={(e) => setType(e.target.value as ReportType)}
          >
            {REPORT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Data source" required error={errors.dataSource}>
        <InputShell icon={Database} error={!!errors.dataSource}>
          <select
            className={elevatedSelectClass(true)}
            value={dataSource}
            onChange={(e) => setDataSource(e.target.value)}
          >
            {REPORT_DATA_SOURCES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Date range" required error={errors.dateRange}>
        <InputShell icon={Calendar} error={!!errors.dateRange}>
          <select
            className={elevatedSelectClass(true)}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            {REPORT_DATE_RANGES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Schedule">
        <InputShell>
          <select
            className={elevatedSelectClass(false)}
            value={schedule}
            onChange={(e) => setSchedule(e.target.value as ReportSchedule)}
          >
            {REPORT_SCHEDULES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Created by">
        <InputShell icon={User}>
          <select
            className={elevatedSelectClass(true)}
            value={createdBy}
            onChange={(e) => setCreatedBy(e.target.value)}
          >
            {REPORT_OWNERS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Group by">
        <InputShell>
          <input
            className={elevatedInputClass(false)}
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            placeholder="e.g. Status, Owner"
          />
        </InputShell>
      </Field>
      <Field label="Sort by">
        <InputShell>
          <input
            className={elevatedInputClass(false)}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            placeholder="e.g. Count desc"
          />
        </InputShell>
      </Field>
      <Field label="Filters" className="sm:col-span-2 lg:col-span-3">
        <TextAreaShell>
          <textarea
            className={elevatedTextareaClass}
            rows={2}
            value={filters}
            onChange={(e) => setFilters(e.target.value)}
            placeholder="e.g. Status ≠ Unqualified"
          />
        </TextAreaShell>
      </Field>
    </CreateEntityFormShell>
  );
}
