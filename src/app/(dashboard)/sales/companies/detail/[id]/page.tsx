"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  buildFlatCompanies,
  CompanyDetailView,
} from "@/components/sales/companies/CompanyDetailView";
import { getCrmCompany, tryCrmCompany } from "@/lib/companies/api";
import { mergeCrmCompaniesIntoBoard } from "@/lib/companies/store";
import { onRulesChange } from "@/lib/rules";

export default function CompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onRulesChange(() => setRevision((n) => n + 1));
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    void tryCrmCompany(async () => {
      const remote = await getCrmCompany(id);
      if (cancelled) return;
      if (remote) {
        mergeCrmCompaniesIntoBoard([remote]);
        setRevision((n) => n + 1);
      }
      if (!cancelled) setLoading(false);
    }).then(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const companies = useMemo(() => buildFlatCompanies(revision), [revision]);
  const index = companies.findIndex((c) => c.id === id);
  const company = index >= 0 ? companies[index] : undefined;

  if (loading && !company) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-sm text-slate-400">
        Loading company…
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-sm text-slate-400">
        Company not found.
      </div>
    );
  }

  return (
    <CompanyDetailView
      company={company}
      statusTitle={company.statusTitle}
      statusDotColor={company.statusDotColor}
      companies={companies}
      companyIndex={index}
    />
  );
}
