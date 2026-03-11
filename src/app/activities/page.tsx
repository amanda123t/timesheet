"use client";
import { fetchApi } from "@/lib/api";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Activity, Profile } from "@/types";

interface EstimateForm {
  profileId: number;
  profileName: string;
  assessmentHours: number;
  architectureHours: number;
}

export default function ActivitiesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [estimates, setEstimates] = useState<EstimateForm[]>([]);

  const { data: activities = [], isLoading } = useQuery<Activity[]>({
    queryKey: ["activities", search],
    queryFn: () => {
      const params = new URLSearchParams({ withEstimates: "true" });
      if (search) params.set("search", search);
      return fetchApi(`/api/activities?${params}`);
    },
  });

  const { data: profiles = [] } = useQuery<Profile[]>({
    queryKey: ["profiles"],
    queryFn: () => fetchApi("/api/profiles"),
  });

  const openCreate = () => {
    setEditActivity(null);
    setCode("");
    setName("");
    setDescription("");
    setEstimates(
      profiles.map((p) => ({
        profileId: p.id,
        profileName: p.name,
        assessmentHours: 0,
        architectureHours: 0,
      }))
    );
    setIsModalOpen(true);
  };

  const openEdit = (activity: Activity) => {
    setEditActivity(activity);
    setCode(activity.code ?? "");
    setName(activity.name);
    setDescription(activity.description ?? "");
    setEstimates(
      profiles.map((p) => {
        const existing = activity.estimates?.find((e) => e.profileId === p.id);
        return {
          profileId: p.id,
          profileName: p.name,
          assessmentHours: existing ? Number(existing.assessmentHours) : 0,
          architectureHours: existing ? Number(existing.architectureHours) : 0,
        };
      })
    );
    setIsModalOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (data: {
      code?: string;
      name: string;
      description?: string;
      estimates: { profileId: number; assessmentHours: number; architectureHours: number }[];
    }) =>
      fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities"] });
      setIsModalOpen(false);
      toast.success("Atividade criada!");
    },
    onError: (err) => toast.error(String(err)),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
      estimates,
    }: {
      id: number;
      data: { code?: string; name: string; description?: string };
      estimates: EstimateForm[];
    }) => {
      await fetch(`/api/activities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      await fetch(`/api/activities/${id}/estimates`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(estimates),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities"] });
      setIsModalOpen(false);
      toast.success("Atividade atualizada!");
    },
    onError: (err) => toast.error(String(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/activities/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities"] });
      toast.success("Atividade removida!");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const activeEstimates = estimates.filter(
      (e) => e.assessmentHours > 0 || e.architectureHours > 0
    );

    if (editActivity) {
      updateMutation.mutate({
        id: editActivity.id,
        data: {
          code: code || undefined,
          name,
          description: description || undefined,
        },
        estimates: activeEstimates,
      });
    } else {
      createMutation.mutate({
        code: code || undefined,
        name,
        description: description || undefined,
        estimates: activeEstimates,
      });
    }
  };

  const updateEstimate = (
    profileId: number,
    field: "assessmentHours" | "architectureHours",
    value: number
  ) => {
    setEstimates((prev) =>
      prev.map((e) => (e.profileId === profileId ? { ...e, [field]: value } : e))
    );
  };

  const totalPlanned = (activity: Activity) =>
    (activity.estimates ?? []).reduce(
      (sum, e) => sum + Number(e.assessmentHours) + Number(e.architectureHours),
      0
    );

  const filtered = activities.filter((a) =>
    search ? a.name.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div>
      <PageHeader
        title="Atividades"
        description="Gerencie atividades e horas planejadas por perfil"
        actions={
          <button className="btn-primary btn" onClick={openCreate}>
            + Nova Atividade
          </button>
        }
      />

      <div className="mb-4">
        <input
          type="text"
          className="form-input max-w-xs"
          placeholder="Buscar atividade..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card">
        <div className="table-wrapper">
          {isLoading ? (
            <LoadingSpinner />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Nenhuma atividade cadastrada"
              description="Crie atividades para definir o planejamento de horas"
              icon="📋"
              action={
                <button className="btn-primary btn" onClick={openCreate}>
                  Criar Atividade
                </button>
              }
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome</th>
                  <th>Perfis com Estimativa</th>
                  <th className="text-right">Total Planejado (h)</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((activity) => (
                  <tr key={activity.id}>
                    <td className="text-gray-500 font-mono text-xs">
                      {activity.code ?? "—"}
                    </td>
                    <td className="font-medium text-gray-900 max-w-xs">
                      {activity.name}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {(activity.estimates ?? [])
                          .filter(
                            (e) =>
                              e.assessmentHours > 0 || e.architectureHours > 0
                          )
                          .map((e) => (
                            <span key={e.profileId} className="badge-blue">
                              {e.profile?.name}
                            </span>
                          ))}
                        {(activity.estimates ?? []).filter(
                          (e) =>
                            e.assessmentHours > 0 || e.architectureHours > 0
                        ).length === 0 && (
                          <span className="badge-gray">Sem estimativas</span>
                        )}
                      </div>
                    </td>
                    <td className="text-right font-semibold">
                      {totalPlanned(activity).toFixed(1)}h
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(activity)}
                          className="btn-secondary btn btn-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remover "${activity.name}"?`))
                              deleteMutation.mutate(activity.id);
                          }}
                          className="btn-danger btn btn-sm"
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editActivity ? "Editar Atividade" : "Nova Atividade"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label">Código</label>
              <input
                type="text"
                className="form-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex: 23616"
              />
            </div>
            <div className="col-span-2">
              <label className="form-label">Nome da Atividade *</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Ex: CR Resc. Mensal R04 Generate FGTS"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Descrição</label>
            <textarea
              className="form-input resize-none"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Estimates per profile */}
          {estimates.length > 0 && (
            <div>
              <label className="form-label">Horas Planejadas por Perfil</label>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Perfil</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-600">Assessment (h)</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-600">Arquitetura (h)</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimates.map((est) => (
                      <tr key={est.profileId} className="border-t border-gray-100">
                        <td className="px-4 py-2 font-medium">{est.profileName}</td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            className="form-input text-right w-24 ml-auto block"
                            value={est.assessmentHours}
                            onChange={(e) =>
                              updateEstimate(
                                est.profileId,
                                "assessmentHours",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            className="form-input text-right w-24 ml-auto block"
                            value={est.architectureHours}
                            onChange={(e) =>
                              updateEstimate(
                                est.profileId,
                                "architectureHours",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-primary-700">
                          {(est.assessmentHours + est.architectureHours).toFixed(1)}h
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="px-4 py-2 font-bold">Total</td>
                      <td className="px-4 py-2 text-right font-bold">
                        {estimates.reduce((s, e) => s + e.assessmentHours, 0).toFixed(1)}h
                      </td>
                      <td className="px-4 py-2 text-right font-bold">
                        {estimates.reduce((s, e) => s + e.architectureHours, 0).toFixed(1)}h
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-primary-700">
                        {estimates
                          .reduce((s, e) => s + e.assessmentHours + e.architectureHours, 0)
                          .toFixed(1)}h
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="btn-secondary btn"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary btn"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editActivity ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
