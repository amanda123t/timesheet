"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AuditLog } from "@/types";

interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

function FileUploadCard({
  title,
  description,
  accept,
  endpoint,
  fieldName,
  onSuccess,
}: {
  title: string;
  description: string;
  accept: string;
  endpoint: string;
  fieldName: string;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append(fieldName, file);

      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Import failed");

      setResult(data);
      onSuccess();
      toast.success(`${title}: ${data.created} criados, ${data.updated} atualizados`);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="card-body">
        <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
          <div className="flex flex-col items-center">
            {loading ? (
              <div className="animate-spin h-6 w-6 border-2 border-primary-600 border-t-transparent rounded-full" />
            ) : (
              <>
                <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm text-gray-500">
                  Clique para selecionar ou arraste o arquivo
                </span>
                <span className="text-xs text-gray-400 mt-1">{accept.toUpperCase()}</span>
              </>
            )}
          </div>
          <input
            type="file"
            accept={accept}
            onChange={handleFile}
            className="hidden"
            disabled={loading}
          />
        </label>

        {result && (
          <div className="mt-4 space-y-2">
            <div className="flex gap-4 text-sm">
              <span className="text-green-700">✓ {result.created} criados</span>
              <span className="text-blue-700">↺ {result.updated} atualizados</span>
              {result.skipped > 0 && (
                <span className="text-gray-500">⊘ {result.skipped} ignorados</span>
              )}
            </div>
            {result.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-700 max-h-32 overflow-y-auto">
                <p className="font-semibold mb-1">{result.errors.length} erro(s):</p>
                {result.errors.slice(0, 5).map((e, i) => (
                  <p key={i}>{e}</p>
                ))}
                {result.errors.length > 5 && <p>...e mais {result.errors.length - 5}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function UploadPage() {
  const queryClient = useQueryClient();
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const res = await fetch("/api/audit-logs?limit=50");
      return res.json();
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries();
  };

  const handleBackup = async () => {
    window.location.href = "/api/system/backup";
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/system/restore", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Backup restaurado com sucesso!");
      invalidateAll();
    } catch (err) {
      toast.error(String(err));
    }
    e.target.value = "";
  };

  const handleReset = async (scope: "time_entries" | "full") => {
    setResetting(true);
    try {
      const res = await fetch("/api/system/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "RESET", scope }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      invalidateAll();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setResetting(false);
      setShowResetConfirm(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString("pt-BR");

  const actionLabels: Record<string, string> = {
    IMPORT_EMPLOYEES: "Importar Funcionários",
    IMPORT_TIME_ENTRIES: "Importar Horas",
    IMPORT_TASK_MAPPINGS: "Importar Mapeamentos",
    CLOSE_MONTH: "Fechar Mês",
    REOPEN_MONTH: "Reabrir Mês",
    EXPORT_BACKUP: "Exportar Backup",
    RESTORE_BACKUP: "Restaurar Backup",
    FULL_RESET: "Reset Completo",
    RESET_TIME_ENTRIES: "Resetar Horas",
  };

  return (
    <div>
      <PageHeader
        title="Upload e Auditoria"
        description="Importe dados e gerencie o sistema"
      />

      {/* Import Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <FileUploadCard
          title="Importar Funcionários"
          description="Arquivo func.csv com colunas: nome, cargo, perfil"
          accept=".csv"
          endpoint="/api/employees/import"
          fieldName="file"
          onSuccess={invalidateAll}
        />
        <FileUploadCard
          title="Importar Base de Horas"
          description="Arquivo base.csv ou .xlsx com colunas: projeto, tarefa, funcionario, data, horas"
          accept=".csv,.xlsx,.xls"
          endpoint="/api/time-entries/import"
          fieldName="file"
          onSuccess={invalidateAll}
        />
        <FileUploadCard
          title="Importar Mapeamento DE/PARA"
          description="CSV com colunas: de (tarefa bruta), para (nome da atividade)"
          accept=".csv"
          endpoint="/api/task-mappings/import"
          fieldName="file"
          onSuccess={invalidateAll}
        />
      </div>

      {/* System Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Backup do Sistema</h3>
          </div>
          <div className="card-body flex flex-col gap-3">
            <button onClick={handleBackup} className="btn-primary btn">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exportar Backup
            </button>
            <label className="btn-secondary btn cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
              </svg>
              Restaurar Backup
              <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
            </label>
          </div>
        </div>

        <div className="card border-red-200">
          <div className="card-header border-red-100 bg-red-50">
            <h3 className="font-semibold text-red-800">Zona de Perigo</h3>
          </div>
          <div className="card-body flex flex-col gap-3">
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="btn-danger btn"
                disabled={resetting}
              >
                Resetar Sistema
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-red-700 font-medium">Confirme a ação:</p>
                <button
                  onClick={() => handleReset("time_entries")}
                  className="btn btn-sm bg-orange-600 text-white hover:bg-orange-700 w-full"
                  disabled={resetting}
                >
                  Apenas Horas
                </button>
                <button
                  onClick={() => handleReset("full")}
                  className="btn-danger btn btn-sm w-full"
                  disabled={resetting}
                >
                  Reset Completo
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="btn-secondary btn btn-sm w-full"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Audit Log */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Log de Auditoria</h3>
          <span className="text-sm text-gray-500">
            {logsData?.total ?? 0} registros
          </span>
        </div>
        <div className="table-wrapper">
          {logsLoading ? (
            <LoadingSpinner />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Ação</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {(logsData?.logs ?? []).map((log: AuditLog) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap text-gray-500">
                      {formatDate(log.createdAt)}
                    </td>
                    <td>
                      <span className="badge-blue">
                        {actionLabels[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="text-xs text-gray-500 max-w-xs truncate">
                      {log.details
                        ? JSON.stringify(log.details)
                        : "-"}
                    </td>
                  </tr>
                ))}
                {(!logsData?.logs?.length) && (
                  <tr>
                    <td colSpan={3} className="text-center text-gray-400 py-8">
                      Nenhum registro de auditoria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
