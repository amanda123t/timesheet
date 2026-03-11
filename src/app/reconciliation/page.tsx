import { fetchApi } from "@/lib/api";
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Month } from "@/types";

interface ReconciliationRow {
  employeeName: string;
  profileName: string | null;
  inEmployeeTable: boolean;
  inTimeEntries: boolean;
  status: "ok" | "no_entries" | "not_in_employees";
  monthlyHours: Record<string, number>;
}

export default function ReconciliationPage() {
  const [yearFilter, setYearFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  const { data: months = [] } = useQuery<Month[]>({
    queryKey: ["months"],
    queryFn: () => fetchApi("/api/months"),
  });

  const params = new URLSearchParams();
  if (yearFilter) params.set("year", yearFilter);
  if (monthFilter) params.set("month", monthFilter);

  const { data: rows = [], isLoading } = useQuery<ReconciliationRow[]>({
    queryKey: ["reconciliation", yearFilter, monthFilter],
    queryFn: () =>
      fetchApi(`/api/reports/reconciliation?${params}`),
  });

  const monthLabel = (m: Month) =>
    `${String(m.month).padStart(2, "0")}/${m.year}`;

  const allMonthKeys = [
    ...new Set(rows.flatMap((r) => Object.keys(r.monthlyHours))),
  ].sort().reverse();

  const statusBadge = (status: ReconciliationRow["status"]) => {
    switch (status) {
      case "ok":
        return <span className="badge-green">OK</span>;
      case "no_entries":
        return <span className="badge-yellow">Sem Apontamentos</span>;
      case "not_in_employees":
        return <span className="badge-red">Não Cadastrado</span>;
    }
  };

  const summary = {
    total: rows.length,
    ok: rows.filter((r) => r.status === "ok").length,
    noEntries: rows.filter((r) => r.status === "no_entries").length,
    notInSystem: rows.filter((r) => r.status === "not_in_employees").length,
  };

  const years = [...new Set(months.map((m) => m.year))].sort((a, b) => b - a);
  const filteredMonths = yearFilter
    ? months.filter((m) => m.year === parseInt(yearFilter))
    : months;

  return (
    <div>
      <PageHeader
        title="Conciliação de Funcionários"
        description="Compara a base de funcionários ativos com as horas apontadas"
      />

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select
          className="form-select"
          value={yearFilter}
          onChange={(e) => {
            setYearFilter(e.target.value);
            setMonthFilter("");
          }}
        >
          <option value="">Todos os anos</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          className="form-select"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
        >
          <option value="">Todos os meses</option>
          {filteredMonths.map((m) => (
            <option key={m.id} value={m.month}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
      </div>

      {/* Summary */}
      {!isLoading && rows.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="stat-card">
            <div className="stat-value">{summary.total}</div>
            <div className="stat-label">Total de Pessoas</div>
          </div>
          <div className="stat-card border-green-200">
            <div className="stat-value text-green-700">{summary.ok}</div>
            <div className="stat-label">Conciliados</div>
          </div>
          <div className="stat-card border-yellow-200">
            <div className="stat-value text-yellow-700">{summary.noEntries}</div>
            <div className="stat-label">Sem apontamentos</div>
          </div>
          <div className="stat-card border-red-200">
            <div className="stat-value text-red-700">{summary.notInSystem}</div>
            <div className="stat-label">Não cadastrados</div>
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
              title="Nenhum dado de conciliação"
              description="Importe funcionários e base de horas para ver a conciliação"
              icon="🔗"
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Profissional</th>
                  <th>Perfil</th>
                  <th>Cadastrado</th>
                  <th>Tem Apontamentos</th>
                  <th>Status</th>
                  {allMonthKeys.map((mk) => (
                    <th key={mk} className="text-right text-xs">
                      {mk.split("-").reverse().join("/")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className={
                      row.status === "not_in_employees"
                        ? "bg-red-50"
                        : row.status === "no_entries"
                        ? "bg-yellow-50"
                        : ""
                    }
                  >
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
                    <td>
                      {row.inEmployeeTable ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-red-600">✗</span>
                      )}
                    </td>
                    <td>
                      {row.inTimeEntries ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-red-600">✗</span>
                      )}
                    </td>
                    <td>{statusBadge(row.status)}</td>
                    {allMonthKeys.map((mk) => (
                      <td key={mk} className="text-right font-mono text-xs">
                        {row.monthlyHours[mk]
                          ? `${row.monthlyHours[mk].toFixed(1)}h`
                          : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
