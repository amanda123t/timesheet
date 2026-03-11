import { fetchApi } from "@/lib/api";
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Employee, Profile } from "@/types";

export default function EmployeesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [profileFilter, setProfileFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);

  const [form, setForm] = useState({
    name: "",
    role: "",
    profileId: "" as string | number,
    active: true,
  });

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["employees", search, profileFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (profileFilter) params.set("profileId", profileFilter);
      return fetchApi(`/api/employees?${params}`);
    },
  });

  const { data: profiles = [] } = useQuery<Profile[]>({
    queryKey: ["profiles"],
    queryFn: () => fetchApi("/api/profiles"),
  });

  const resetForm = () =>
    setForm({ name: "", role: "", profileId: "", active: true });

  const openCreate = () => {
    resetForm();
    setEditEmployee(null);
    setIsModalOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditEmployee(emp);
    setForm({
      name: emp.name,
      role: emp.role ?? "",
      profileId: emp.profileId ?? "",
      active: emp.active,
    });
    setIsModalOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          profileId: data.profileId ? Number(data.profileId) : null,
          role: data.role || null,
        }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      setIsModalOpen(false);
      toast.success("Colaborador criado!");
    },
    onError: (err) => toast.error(String(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof form }) =>
      fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          profileId: data.profileId ? Number(data.profileId) : null,
          role: data.role || null,
        }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      setIsModalOpen(false);
      toast.success("Colaborador atualizado!");
    },
    onError: (err) => toast.error(String(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/employees/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Colaborador removido!");
    },
    onError: (err) => toast.error(String(err)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editEmployee) {
      updateMutation.mutate({ id: editEmployee.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const filtered = employees.filter((e) =>
    search ? e.name.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div>
      <PageHeader
        title="Colaboradores"
        description={`${employees.length} colaboradores cadastrados`}
        actions={
          <button className="btn-primary btn" onClick={openCreate}>
            + Novo Colaborador
          </button>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          className="form-input max-w-xs"
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          {isLoading ? (
            <LoadingSpinner />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Nenhum colaborador encontrado"
              description="Importe funcionários ou crie manualmente"
              icon="👤"
              action={
                <button className="btn-primary btn" onClick={openCreate}>
                  Criar Colaborador
                </button>
              }
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Cargo</th>
                  <th>Perfil</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <tr key={emp.id}>
                    <td className="font-medium text-gray-900">{emp.name}</td>
                    <td className="text-gray-500">{emp.role ?? "—"}</td>
                    <td>
                      {emp.profile ? (
                        <span className="badge-blue">{emp.profile.name}</span>
                      ) : (
                        <span className="badge-gray">Sem perfil</span>
                      )}
                    </td>
                    <td>
                      {emp.active ? (
                        <span className="badge-green">Ativo</span>
                      ) : (
                        <span className="badge-gray">Inativo</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(emp)}
                          className="btn-secondary btn btn-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Excluir "${emp.name}"?`))
                              deleteMutation.mutate(emp.id);
                          }}
                          className="btn-danger btn btn-sm"
                        >
                          Excluir
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
        title={editEmployee ? "Editar Colaborador" : "Novo Colaborador"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Nome *</label>
            <input
              type="text"
              className="form-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="form-label">Cargo</label>
            <input
              type="text"
              className="form-input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="Ex: Desenvolvedor RPA"
            />
          </div>
          <div>
            <label className="form-label">Perfil</label>
            <select
              className="form-select"
              value={form.profileId}
              onChange={(e) => setForm({ ...form, profileId: e.target.value })}
            >
              <option value="">Sem perfil</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-primary-600"
            />
            <label htmlFor="active" className="text-sm text-gray-700">
              Colaborador ativo
            </label>
          </div>
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
              {editEmployee ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
