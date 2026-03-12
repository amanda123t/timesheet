"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Download, ChevronDown } from "lucide-react";
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

function rowKey(row: SummaryRow) {
  return `${row.employeeId}-${row.activityId}-${row.monthKey}`;
}

export default function SummaryPage() {
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [activityFilter, setActivityFilter] = useState("");
  const [profileFilter, setProfileFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

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
    queryFn: () => fetchApi(`/api/reports/summary?${params}`),
  });

  // Reset selection when filters or data change
  useEffect(() => {
    setSelectedKeys(new Set());
  }, [employeeFilter, activityFilter, profileFilter, monthFilter, rows]);

  // Update indeterminate state on select-all checkbox
  useEffect(() => {
    if (!selectAllRef.current || rows.length === 0) return;
    const count = selectedKeys.size;
    selectAllRef.current.indeterminate = count > 0 && count < rows.length;
  }, [selectedKeys, rows.length]);

  // Close export dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleRow = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedKeys((prev) =>
      prev.size === rows.length ? new Set() : new Set(rows.map(rowKey))
    );
  }, [rows]);

  const monthLabel = (m: Month) =>
    `${String(m.month).padStart(2, "0")}/${m.year}`;
  const monthKey = (m: Month) =>
    `${m.year}-${String(m.month).padStart(2, "0")}`;

  const totalHours = rows.reduce((s, r) => s + r.totalHours, 0);
  const allSelected = rows.length > 0 && selectedKeys.size === rows.length;

  function buildAndDownloadExcel(exportRows: SummaryRow[], filename: string) {
    const ws = XLSX.utils.json_to_sheet(
      exportRows.map((r) => ({
        Profissional: r.employeeName,
        Perfil: r.profileName ?? "",
        Atividade: r.activityName,
        "Mês/Ano": r.monthLabel,
        "Horas Realizadas": r.totalHours,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resumo");
    XLSX.writeFile(wb, filename);
  }

  function exportSelection() {
    setExportMenuOpen(false);
    const selected = rows.filter((r) => selectedKeys.has(rowKey(r)));
    buildAndDownloadExcel(selected, "resumo-profissional-selecao.xlsx");
  }

  async function exportAll() {
    setExportMenuOpen(false);
    setExportingAll(true);
    try {
      const all: SummaryRow[] = await fetchApi("/api/reports/summary");
      buildAndDownloadExcel(all, "resumo-profissional-completo.xlsx");
    } finally {
      setExportingAll(false);
    }
  }

  const exportButton = (
    <div className="relative" ref={exportMenuRef}>
      <div className="flex">
        <button
          onClick={exportSelection}
          disabled={selectedKeys.size === 0}
          className="btn btn-success flex items-center gap-2 rounded-r-none border-r-0 disabled:opacity-40 disabled:cursor-not-allowed"
          title={selectedKeys.size === 0 ? "Selecione ao menos uma linha" : `Exportar ${selectedKeys.size} linha(s) selecionada(s)`}
        >
          <Download size={15} />
          Exportar Seleção
          {selectedKeys.size > 0 && (
            <span className="bg-white/30 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-none">
              {selectedKeys.size}
            </span>
          )}
        </button>
        <button
          onClick={() => setExportMenuOpen((o) => !o)}
          disabled={exportingAll}
          className="btn btn-success rounded-l-none px-2 border-l border-green-600 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Mais opções de exportação"
        >
          <ChevronDown size={14} className={`transition-transform ${exportMenuOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {exportMenuOpen && (
        <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
          <button
            onClick={exportSelection}
            disabled={selectedKeys.size === 0}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download size={13} />
            Exportar Seleção
            {selectedKeys.size > 0 && (
              <span className="ml-auto text-xs text-gray-400">{selectedKeys.size} linha(s)</span>
            )}
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
  );

  return (
    <div>
      <PageHeader
        title="Resumo por Profissional e Atividade"
        description="Horas realizadas agrupadas por profissional, atividade e mês"
        actions={exportButton}
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
                  <th className="w-8 px-3">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="rounded border-gray-300 text-primary-600 cursor-pointer"
                      title={allSelected ? "Desmarcar todas" : "Selecionar todas"}
                    />
                  </th>
                  <th>Profissional</th>
                  <th>Perfil</th>
                  <th>Atividade</th>
                  <th>Mês/Ano</th>
                  <th className="text-right">Horas</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const key = rowKey(row);
                  const isSelected = selectedKeys.has(key);
                  return (
                    <tr key={i} className={isSelected ? "bg-primary-50/40 ring-1 ring-inset ring-primary-300" : ""}>
                      <td className="px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(key)}
                          className="rounded border-gray-300 text-primary-600 cursor-pointer"
                        />
                      </td>
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
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td />
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
