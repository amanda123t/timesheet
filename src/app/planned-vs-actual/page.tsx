"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, ChevronDown } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Profile, Activity } from "@/types";
import * as XLSX from "xlsx";

interface MonthCol {
  key: string;
  label: string;
  year: number;
  month: number;
}

interface PvARow {
  activityId: number;
  activityCode: string | null;
  activityName: string;
  profileId: number;
  profileName: string;
  assessmentHours: number;
  architectureHours: number;
  totalPlanned: number;
  actualByMonth: Record<string, number>;
  totalActual: number;
  variance: number;
}

interface PvAResponse {
  rows: PvARow[];
  months: MonthCol[];
}

export default function PlannedVsActualPage() {
  const [activityFilter, setActivityFilter] = useState("");
  const [profileFilter, setProfileFilter] = useState("");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const { data: profiles = [] } = useQuery<Profile[]>({
    queryKey: ["profiles"],
    queryFn: () => fetchApi("/api/profiles"),
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["activities"],
    queryFn: () => fetchApi("/api/activities"),
  });

  const params = new URLSearchParams();
  if (activityFilter) params.set("activityId", activityFilter);
  if (profileFilter) params.set("profileId", profileFilter);

  const { data, isLoading } = useQuery<PvAResponse>({
    queryKey: ["planned-vs-actual", activityFilter, profileFilter],
    queryFn: () =>
      fetchApi(`/api/reports/planned-vs-actual?${params}`),
  });

  const rows = data?.rows ?? [];
  const months = data?.months ?? [];

  const varianceColor = (v: number) => {
    if (Math.abs(v) < 0.1) return "text-gray-700";
    return v > 0 ? "text-red-600" : "text-green-600";
  };

  const varianceBg = (v: number) => {
    if (Math.abs(v) < 0.1) return "";
    return v > 0 ? "bg-red-50" : "bg-green-50";
  };

  // Summary stats
  const totalPlanned = rows.reduce((s, r) => s + r.totalPlanned, 0);
  const totalActual = rows.reduce((s, r) => s + r.totalActual, 0);
  const totalVariance = totalActual - totalPlanned;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function buildAndDownloadExcel(
    exportRows: PvARow[],
    exportMonths: MonthCol[],
    filename: string
  ) {
    const tPlanned = exportRows.reduce((s, r) => s + r.totalPlanned, 0);
    const tActual = exportRows.reduce((s, r) => s + r.totalActual, 0);
    const tVariance = tActual - tPlanned;

    const headers = [
      "Código",
      "Processo / Atividade",
      "Perfil",
      "Assessment (h)",
      "Arquitetura (h)",
      "Total Planejado (h)",
      ...exportMonths.map((m) => m.label),
      "Total Realizado (h)",
      "Variação (h)",
      "%",
    ];

    const dataRows = exportRows.map((row) => {
      const pct =
        row.totalPlanned > 0
          ? Math.round((row.totalActual / row.totalPlanned) * 100)
          : row.totalActual > 0
          ? 999
          : 0;
      return [
        row.activityCode ?? "",
        row.activityName,
        row.profileName,
        row.assessmentHours,
        row.architectureHours,
        row.totalPlanned,
        ...exportMonths.map((m) => row.actualByMonth[m.key] ?? 0),
        row.totalActual,
        row.variance,
        pct === 999 ? "∞%" : `${pct}%`,
      ];
    });

    dataRows.push([
      "",
      "TOTAIS",
      "",
      exportRows.reduce((s, r) => s + r.assessmentHours, 0),
      exportRows.reduce((s, r) => s + r.architectureHours, 0),
      tPlanned,
      ...exportMonths.map((m) =>
        exportRows.reduce((s, r) => s + (r.actualByMonth[m.key] ?? 0), 0)
      ),
      tActual,
      tVariance,
      "",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    ws["!cols"] = [
      { wch: 12 },
      { wch: 40 },
      { wch: 20 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      ...exportMonths.map(() => ({ wch: 12 })),
      { wch: 18 },
      { wch: 14 },
      { wch: 8 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Planejamento vs Realizado");
    XLSX.writeFile(wb, filename);
  }

  function exportSelection() {
    setExportMenuOpen(false);
    buildAndDownloadExcel(rows, months, "planejamento_vs_realizado_selecao.xlsx");
  }

  async function exportAll() {
    setExportMenuOpen(false);
    setExportingAll(true);
    try {
      const all: PvAResponse = await fetchApi("/api/reports/planned-vs-actual");
      buildAndDownloadExcel(all.rows, all.months, "planejamento_vs_realizado_completo.xlsx");
    } finally {
      setExportingAll(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Planejamento vs Realizado"
        description="Comparação entre horas planejadas por perfil e horas realizadas por mês"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          className="form-select"
          value={activityFilter}
          onChange={(e) => setActivityFilter(e.target.value)}
        >
          <option value="">Todas as atividades</option>
          {activities.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          className="form-select"
          value={profileFilter}
          onChange={(e) => setProfileFilter(e.target.value)}
        >
          <option value="">Todos os perfis</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Export split-button */}
        <div className="relative ml-auto" ref={exportMenuRef}>
          <div className="flex">
            <button
              onClick={exportSelection}
              disabled={rows.length === 0}
              className="btn btn-secondary flex items-center gap-2 rounded-r-none border-r-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={15} />
              Exportar Seleção
            </button>
            <button
              onClick={() => setExportMenuOpen((o) => !o)}
              disabled={exportingAll}
              className="btn btn-secondary rounded-l-none px-2 border-l border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Mais opções de exportação"
            >
              <ChevronDown size={14} className={`transition-transform ${exportMenuOpen ? "rotate-180" : ""}`} />
            </button>
          </div>

          {exportMenuOpen && (
            <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
              <button
                onClick={exportSelection}
                disabled={rows.length === 0}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Download size={13} />
                Exportar Seleção
              </button>
              <button
                onClick={exportAll}
                disabled={exportingAll}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Download size={13} />
                {exportingAll ? "Exportando..." : "Exportar Tudo"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {!isLoading && rows.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="stat-card">
            <div className="stat-value">{rows.length}</div>
            <div className="stat-label">Linhas de Planejamento</div>
          </div>
          <div className="stat-card">
            <div className="stat-value text-blue-700">
              {totalPlanned.toFixed(1)}h
            </div>
            <div className="stat-label">Total Planejado</div>
          </div>
          <div className="stat-card">
            <div className="stat-value text-primary-700">
              {totalActual.toFixed(1)}h
            </div>
            <div className="stat-label">Total Realizado</div>
          </div>
          <div className={`stat-card ${totalVariance > 0 ? "border-red-200" : "border-green-200"}`}>
            <div className={`stat-value ${totalVariance > 0 ? "text-red-600" : "text-green-600"}`}>
              {totalVariance > 0 ? "+" : ""}
              {totalVariance.toFixed(1)}h
            </div>
            <div className="stat-label">Variação Total</div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          {isLoading ? (
            <LoadingSpinner />
          ) : rows.length === 0 ? (
            <EmptyState
              title="Nenhum dado de planejamento"
              description="Cadastre atividades com horas estimadas por perfil e importe a base de horas"
              icon="📈"
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-gray-50 z-10">Processo / Atividade</th>
                  <th>Perfil</th>
                  <th className="text-right bg-blue-50">Assessment (h)</th>
                  <th className="text-right bg-blue-50">Arquitetura (h)</th>
                  <th className="text-right bg-blue-50">Total Planejado</th>
                  {months.map((m) => (
                    <th key={m.key} className="text-right text-xs">
                      {m.label}
                    </th>
                  ))}
                  <th className="text-right bg-primary-50">Total Realizado</th>
                  <th className="text-right">Variação</th>
                  <th className="text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const pct =
                    row.totalPlanned > 0
                      ? Math.round((row.totalActual / row.totalPlanned) * 100)
                      : row.totalActual > 0
                      ? 999
                      : 0;

                  return (
                    <tr key={i} className={varianceBg(row.variance)}>
                      <td className="sticky left-0 bg-white max-w-xs">
                        <div className="flex flex-col">
                          {row.activityCode && (
                            <span className="text-xs text-gray-400 font-mono">
                              {row.activityCode}
                            </span>
                          )}
                          <span className="font-medium text-gray-900 text-xs leading-tight">
                            {row.activityName}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="badge-blue">{row.profileName}</span>
                      </td>
                      <td className="text-right text-blue-700 bg-blue-50">
                        {row.assessmentHours.toFixed(1)}h
                      </td>
                      <td className="text-right text-blue-700 bg-blue-50">
                        {row.architectureHours.toFixed(1)}h
                      </td>
                      <td className="text-right font-semibold text-blue-700 bg-blue-50">
                        {row.totalPlanned.toFixed(1)}h
                      </td>
                      {months.map((m) => (
                        <td key={m.key} className="text-right">
                          {row.actualByMonth[m.key]
                            ? `${row.actualByMonth[m.key].toFixed(1)}h`
                            : "—"}
                        </td>
                      ))}
                      <td className="text-right font-semibold text-primary-700 bg-primary-50">
                        {row.totalActual.toFixed(1)}h
                      </td>
                      <td className={`text-right font-semibold ${varianceColor(row.variance)}`}>
                        {row.variance > 0 ? "+" : ""}
                        {row.variance.toFixed(1)}h
                      </td>
                      <td className="text-right text-xs">
                        <span
                          className={`badge ${
                            pct >= 90 && pct <= 110
                              ? "badge-green"
                              : pct > 110
                              ? "badge-red"
                              : "badge-yellow"
                          }`}
                        >
                          {pct === 999 ? "∞" : `${pct}%`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                    <td colSpan={2} className="px-4 py-3 sticky left-0 bg-gray-100">
                      TOTAIS
                    </td>
                    <td className="px-4 py-3 text-right text-blue-700 bg-blue-50">
                      {rows.reduce((s, r) => s + r.assessmentHours, 0).toFixed(1)}h
                    </td>
                    <td className="px-4 py-3 text-right text-blue-700 bg-blue-50">
                      {rows.reduce((s, r) => s + r.architectureHours, 0).toFixed(1)}h
                    </td>
                    <td className="px-4 py-3 text-right text-blue-700 bg-blue-50">
                      {totalPlanned.toFixed(1)}h
                    </td>
                    {months.map((m) => (
                      <td key={m.key} className="px-4 py-3 text-right">
                        {rows
                          .reduce((s, r) => s + (r.actualByMonth[m.key] ?? 0), 0)
                          .toFixed(1)}h
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right text-primary-700 bg-primary-50">
                      {totalActual.toFixed(1)}h
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${varianceColor(totalVariance)}`}
                    >
                      {totalVariance > 0 ? "+" : ""}
                      {totalVariance.toFixed(1)}h
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
