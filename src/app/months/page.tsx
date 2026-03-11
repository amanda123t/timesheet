import { fetchApi } from "@/lib/api";
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Month } from "@/types";

interface MonthWithCount extends Month {
  _count?: { timeEntries: number };
}

export default function MonthsPage() {
  const qc = useQueryClient();
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);

  const { data: months = [], isLoading } = useQuery<MonthWithCount[]>({
    queryKey: ["months"],
    queryFn: () => fetchApi("/api/months"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      fetch("/api/months", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: newYear, month: newMonth }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["months"] });
      toast.success("Mês criado!");
    },
    onError: (err) => toast.error(String(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "close" | "reopen" }) =>
      fetch(`/api/months/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }).then((r) => r.json()),
    onSuccess: (_, { action }) => {
      qc.invalidateQueries({ queryKey: ["months"] });
      toast.success(action === "close" ? "Mês fechado!" : "Mês reaberto!");
    },
    onError: (err) => toast.error(String(err)),
  });

  const monthNames = [
    "", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];

  const formatMonth = (m: Month) =>
    `${monthNames[m.month]}/${m.year}`;

  const years = Array.from(
    { length: 10 },
    (_, i) => new Date().getFullYear() - 4 + i
  );

  const monthsNumbers = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div>
      <PageHeader
        title="Gestão de Meses"
        description="Controle o status de cada mês — meses fechados não permitem alterações"
      />

      {/* Create Month */}
      <div className="card mb-6">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Adicionar Mês</h3>
        </div>
        <div className="card-body">
          <div className="flex gap-3 items-end">
            <div>
              <label className="form-label">Mês</label>
              <select
                className="form-select"
                value={newMonth}
                onChange={(e) => setNewMonth(parseInt(e.target.value))}
              >
                {monthsNumbers.map((m) => (
                  <option key={m} value={m}>
                    {monthNames[m]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Ano</label>
              <select
                className="form-select"
                value={newYear}
                onChange={(e) => setNewYear(parseInt(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="btn-primary btn"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              Adicionar
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-sm text-gray-600">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
          Aberto — importações permitidas
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
          Fechado — sem alterações
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          {isLoading ? (
            <LoadingSpinner />
          ) : months.length === 0 ? (
            <EmptyState
              title="Nenhum mês cadastrado"
              description="Meses são criados automaticamente durante a importação de horas ou manualmente acima"
              icon="📅"
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mês/Ano</th>
                  <th>Status</th>
                  <th className="text-right">Horas Importadas</th>
                  <th>Fechado Em</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {months.map((month) => (
                  <tr key={month.id}>
                    <td className="font-semibold text-gray-900 text-base">
                      {formatMonth(month)}
                    </td>
                    <td>
                      {month.status === "open" ? (
                        <span className="badge-green">Aberto</span>
                      ) : (
                        <span className="badge-red">Fechado</span>
                      )}
                    </td>
                    <td className="text-right text-gray-700">
                      {month._count?.timeEntries ?? 0} registros
                    </td>
                    <td className="text-gray-500 text-xs">
                      {month.closedAt
                        ? new Date(month.closedAt).toLocaleString("pt-BR")
                        : "—"}
                    </td>
                    <td className="text-right">
                      {month.status === "open" ? (
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Fechar o mês ${formatMonth(month)}? Esta ação impedirá novas importações para este mês.`
                              )
                            ) {
                              statusMutation.mutate({
                                id: month.id,
                                action: "close",
                              });
                            }
                          }}
                          className="btn-danger btn btn-sm"
                          disabled={statusMutation.isPending}
                        >
                          Fechar Mês
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Reabrir o mês ${formatMonth(month)}?`
                              )
                            ) {
                              statusMutation.mutate({
                                id: month.id,
                                action: "reopen",
                              });
                            }
                          }}
                          className="btn-success btn btn-sm"
                          disabled={statusMutation.isPending}
                        >
                          Reabrir
                        </button>
                      )}
                    </td>
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
