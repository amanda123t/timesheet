"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { fetchApi } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Employee, Profile, Activity, Month } from "@/types";

interface SummaryRow {
  employeeId: number;
  employeeName: string;
  profileName: string | null;
  activityId: number;
  activityName: string;
  monthKey: string;
  monthLabel: string;
  totalHours: number;
}

export default function SummaryPage() {
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [activityFilter, setActivityFilter] = useState("");
  const [profileFilter, setProfileFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => fetchApi("/api/employees"),
  });

  const { data: profiles = [] } = useQuery<Profile[]>({
    queryKey: ["profiles"],
    queryFn: () => fetchApi("/api/profiles"),
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["activities"],
    queryFn: () => fetchApi("/api/activities"),
  });

  const { data: months = [] } = useQuery<Month[]>({
    queryKey: ["months"],
    queryFn: () => fetchApi("/api/months"),
  });

  const params = new URLSearchParams();
  if (employeeFilter) params.set("employeeId", employeeFilter);
  if (activityFilter) params.set("activityId", activityFilter);
  if (profileFilter) params.set("profileId", profileFilter);
  if (monthFilter) params.set("month", monthFilter);

  const { data: rows = [], isLoading } = useQuery<SummaryRow[]>({
    queryKey: ["summary", employeeFilter, activityFilter, profileFilter, monthFilter],
    queryFn: () =>
      fetchApi(`/api/reports/summary?${params}`),
  });

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        Profissional: r.employeeName,
        Perfil: r.profileName ?? "",
        Atividade: r.activityName,
        "Mês/Ano": r.monthLabel,
        "Horas Realizadas": r.totalHours,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resumo");
    XLSX.writeFile(wb, "resumo-profissional.xlsx");
  };

  const monthLabel = (m: Month) =>
    `${String(m.month).padStart(2, "0")}/${m.year}`;
  const monthKey = (m: Month) =>
    `${m.year}-${String(m.month).padStart(2, "0")}`;

  const totalHours = rows.reduce((s, r) => s + r.totalHours, 0);

  return (
    <div>
      <PageHeader
        title="Resumo por Profissional e Atividade"
        description="Horas realizadas agrupadas por profissional, atividade e mês"
        actions={
          <button className="btn-success btn" onClick={exportToExcel} disabled={!rows.length}>
            ⬇ Exportar Excel
          </button>
        }
      />

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <select
          className="form-select"
          value={employeeFilter}
          onChange={(e) => setEmployeeFilter(e.target.value)}
        >
          <option value="">Todos os profissionais</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
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
        <select
          className="form-select"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
        >
          <option value="">Todos os meses</option>
          {months.map((m) => (
            <option key={m.id} value={monthKey(m)}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-value">{rows.length}</div>
          <div className="stat-label">Registros</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalHours.toFixed(1)}h</div>
          <div className="stat-label">Total de Horas</div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          {isLoading ? (
            <LoadingSpinner />
          ) : rows.length === 0 ? (
            <EmptyState
              title="Nenhum dado encontrado"
              description="Ajuste os filtros ou importe a base de horas"
              icon="📊"
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Profissional</th>
                  <th>Perfil</th>
                  <th>Atividade</th>
                  <th>Mês/Ano</th>
                  <th className="text-right">Horas</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td className="font-medium text-gray-900">
                      {row.employeeName}
                    </td>
                    <td>
                      {row.profileName ? (
                        <span className="badge-blue">{row.profileName}</span>
                      ) : (
                        <span className="badge-gray">—</span>
                      )}
                    </td>
                    <td className="max-w-xs truncate text-gray-700">
                      {row.activityName}
                    </td>
                    <td className="text-gray-500 font-mono text-xs">
                      {row.monthLabel}
                    </td>
                    <td className="text-right font-semibold text-primary-700">
                      {row.totalHours.toFixed(1)}h
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td colSpan={4} className="px-4 py-3 font-bold text-gray-900">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-primary-700">
                    {totalHours.toFixed(1)}h
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
