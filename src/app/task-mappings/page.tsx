import { fetchApi } from "@/lib/api";
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Activity } from "@/types";

interface TaskWithMapping {
  id: number;
  rawName: string;
  mapping: {
    id: number;
    taskId: number;
    activityId: number | null;
    activity: Activity | null;
  } | null;
  _count: { timeEntries: number };
}

export default function TaskMappingsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [unmappedOnly, setUnmappedOnly] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string>("");

  const params = new URLSearchParams();
  if (unmappedOnly) params.set("unmappedOnly", "true");

  const { data: tasks = [], isLoading } = useQuery<TaskWithMapping[]>({
    queryKey: ["tasks", unmappedOnly],
    queryFn: () => fetchApi(`/api/tasks?${params}`),
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["activities"],
    queryFn: () => fetchApi("/api/activities"),
  });

  const updateMapping = useMutation({
    mutationFn: ({
      taskId,
      activityId,
    }: {
      taskId: number;
      activityId: number | null;
    }) =>
      fetch("/api/task-mappings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, activityId }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setEditingTaskId(null);
      toast.success("Mapeamento atualizado!");
    },
    onError: (err) => toast.error(String(err)),
  });

  const filtered = tasks.filter((t) =>
    search ? t.rawName.toLowerCase().includes(search.toLowerCase()) : true
  );

  const unmappedCount = tasks.filter((t) => !t.mapping?.activityId).length;
  const mappedCount = tasks.filter((t) => t.mapping?.activityId).length;

  return (
    <div>
      <PageHeader
        title="Mapeamento DE/PARA"
        description="Mapeie tarefas brutas para atividades padronizadas"
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-value">{tasks.length}</div>
          <div className="stat-label">Tarefas únicas</div>
        </div>
        <div className="stat-card border-green-200">
          <div className="stat-value text-green-700">{mappedCount}</div>
          <div className="stat-label">Mapeadas</div>
        </div>
        <div className="stat-card border-red-200">
          <div className="stat-value text-red-700">{unmappedCount}</div>
          <div className="stat-label">Sem mapeamento</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          className="form-input max-w-xs"
          placeholder="Buscar tarefa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={unmappedOnly}
            onChange={(e) => setUnmappedOnly(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600"
          />
          Apenas não mapeadas
        </label>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          {isLoading ? (
            <LoadingSpinner />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Nenhuma tarefa encontrada"
              description="Importe a base de horas para ver as tarefas"
              icon="📋"
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tarefa Bruta (DE)</th>
                  <th>Atividade Mapeada (PARA)</th>
                  <th className="text-right">Registros</th>
                  <th className="text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((task) => (
                  <tr key={task.id}>
                    <td className="max-w-xs">
                      <span className="text-sm font-mono text-gray-700 break-words">
                        {task.rawName}
                      </span>
                    </td>
                    <td>
                      {editingTaskId === task.id ? (
                        <div className="flex gap-2 items-center">
                          <select
                            className="form-select text-xs"
                            value={selectedActivityId}
                            onChange={(e) =>
                              setSelectedActivityId(e.target.value)
                            }
                          >
                            <option value="">Sem mapeamento</option>
                            {activities.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                          <button
                            className="btn-primary btn btn-sm"
                            onClick={() =>
                              updateMapping.mutate({
                                taskId: task.id,
                                activityId: selectedActivityId
                                  ? parseInt(selectedActivityId)
                                  : null,
                              })
                            }
                          >
                            Salvar
                          </button>
                          <button
                            className="btn-secondary btn btn-sm"
                            onClick={() => setEditingTaskId(null)}
                          >
                            ✕
                          </button>
                        </div>
                      ) : task.mapping?.activity ? (
                        <span className="badge-green text-xs">
                          {task.mapping.activity.name}
                        </span>
                      ) : (
                        <span className="badge-red text-xs">
                          Não mapeada
                        </span>
                      )}
                    </td>
                    <td className="text-right text-gray-500">
                      {task._count.timeEntries}
                    </td>
                    <td className="text-right">
                      {editingTaskId !== task.id && (
                        <button
                          className="btn-secondary btn btn-sm"
                          onClick={() => {
                            setEditingTaskId(task.id);
                            setSelectedActivityId(
                              String(task.mapping?.activityId ?? "")
                            );
                          }}
                        >
                          Mapear
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
