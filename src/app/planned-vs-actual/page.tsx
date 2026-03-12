"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
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

  function exportExcel() {
    const headers = [
      "Código",
      "Processo / Atividade",
      "Perfil",
      "Assessment (h)",
      "Arquitetura (h)",
      "Total Planejado (h)",
      ...months.map((m) => m.label),
      "Total Realizado (h)",
      "Variação (h)",
      "%",
    ];

    const dataRows = rows.map((row) => {
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
        ...months.map((m) => row.actualByMonth[m.key] ?? 0),
        row.totalActual,
        row.variance,
        pct === 999 ? "∞%" : `${pct}%`,
      ];
    });

    // Totals row
    dataRows.push([
      "",
      "TOTAIS",
      "",
      rows.reduce((s, r) => s + r.assessmentHours, 0),
      rows.reduce((s, r) => s + r.architectureHours, 0),
      totalPlanned,
      ...months.map((m) => rows.reduce((s, r) => s + (r.actualByMonth[m.key] ?? 0), 0)),
      totalActual,
      totalVariance,
      "",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

    // Column widths
    ws["!cols"] = [
      { wch: 12 },
      { wch: 40 },
      { wch: 20 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      ...months.map(() => ({ wch: 12 })),
      { wch: 18 },
      { wch: 14 },
      { wch: 8 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Planejamento vs Realizado");
    XLSX.writeFile(wb, "planejamento_vs_realizado.xlsx");
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

        <button
          onClick={exportExcel}
          disabled={rows.length === 0}
          className="btn btn-secondary ml-auto flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={15} />
          Exportar Excel
        </button>
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
