"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

interface AuditRow {
  employeeId: number;
  employeeName: string;
  profileName: string | null;
  missingDates: string[];
  totalMissing: number;
  totalBusinessDays: number;
  coverage: number;
}

interface AuditResponse {
  year: number;
  month: number;
  businessDays: number;
  employees: AuditRow[];
}

export default function AuditPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [expandedEmployee, setExpandedEmployee] = useState<number | null>(null);

  const { data, isLoading } = useQuery<AuditResponse>({
    queryKey: ["missing-entries", year, month],
    queryFn: () =>
      fetchApi(`/api/reports/missing-entries?year=${year}&month=${month}`),
  });

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  const monthNames = [
    "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i);

  const summary = data
    ? {
        total: data.employees.length,
        withMissing: data.employees.filter((e) => e.totalMissing > 0).length,
        complete: data.employees.filter((e) => e.totalMissing === 0).length,
      }
    : null;

  return (
    <div>
      <PageHeader
        title="Auditoria de Dias Sem Apontamento"
        description="Identifica funcionários com dias úteis sem registro de horas"
      />

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select
          className="form-select"
          value={month}
          onChange={(e) => setMonth(parseInt(e.target.value))}
        >
          {monthNames.slice(1).map((name, i) => (
            <option key={i + 1} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
        <select
          className="form-select"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="stat-card">
            <div className="stat-value">{summary.total}</div>
            <div className="stat-label">Total de Colaboradores</div>
          </div>
          <div className="stat-card border-green-200">
            <div className="stat-value text-green-700">{summary.complete}</div>
            <div className="stat-label">Sem pendências</div>
          </div>
          <div className="stat-card border-red-200">
            <div className="stat-value text-red-700">{summary.withMissing}</div>
            <div className="stat-label">Com dias faltantes</div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">
            {monthNames[month]}/{year} — {data?.businessDays ?? 0} dias úteis
          </h3>
        </div>
        <div className="table-wrapper">
          {isLoading ? (
            <LoadingSpinner />
          ) : !data?.employees.length ? (
            <EmptyState
              title="Nenhum dado encontrado"
              description="Importe a base de horas para ver a auditoria"
              icon="🔍"
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Perfil</th>
                  <th className="text-center">Cobertura</th>
                  <th className="text-center">Dias Faltantes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.employees
                  .sort((a, b) => b.totalMissing - a.totalMissing)
                  .map((emp) => (
                    <>
                      <tr key={emp.employeeId}>
                        <td className="font-medium text-gray-900">
                          {emp.employeeName}
                        </td>
                        <td>
                          {emp.profileName ? (
                            <span className="badge-blue">{emp.profileName}</span>
                          ) : (
                            <span className="badge-gray">—</span>
                          )}
                        </td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  emp.coverage >= 80
                                    ? "bg-green-500"
                                    : emp.coverage >= 60
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                                }`}
                                style={{ width: `${emp.coverage}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">
                              {emp.coverage}%
                            </span>
                          </div>
                        </td>
                        <td className="text-center">
                          {emp.totalMissing > 0 ? (
                            <span className="badge-red">{emp.totalMissing} dia(s)</span>
                          ) : (
                            <span className="badge-green">Completo ✓</span>
                          )}
                        </td>
                        <td>
                          {emp.totalMissing > 0 && (
                            <button
                              onClick={() =>
                                setExpandedEmployee(
                                  expandedEmployee === emp.employeeId
                                    ? null
                                    : emp.employeeId
                                )
                              }
                              className="btn-secondary btn btn-sm"
                            >
                              {expandedEmployee === emp.employeeId
                                ? "Fechar"
                                : "Ver datas"}
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedEmployee === emp.employeeId && (
                        <tr key={`${emp.employeeId}-dates`}>
                          <td colSpan={5} className="bg-red-50 px-4 py-3">
                            <p className="text-xs font-semibold text-red-700 mb-2">
                              Datas sem apontamento:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {emp.missingDates.map((d) => (
                                <span
                                  key={d}
                                  className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded"
                                >
                                  {formatDate(d)}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
