"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Profile, Employee } from "@/types";

export default function ProfilesPage() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [editName, setEditName] = useState("");
  const [dragOver, setDragOver] = useState<number | null>(null);

  const { data: profiles = [], isLoading: profLoading } = useQuery<Profile[]>({
    queryKey: ["profiles"],
    queryFn: () => fetch("/api/profiles").then((r) => r.json()),
  });

  const { data: employees = [], isLoading: empLoading } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => fetch("/api/employees").then((r) => r.json()),
  });

  const createProfile = useMutation({
    mutationFn: (name: string) =>
      fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      setNewName("");
      toast.success("Perfil criado!");
    },
    onError: (err) => toast.error(String(err)),
  });

  const updateProfile = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      fetch(`/api/profiles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      setEditProfile(null);
      toast.success("Perfil atualizado!");
    },
  });

  const deleteProfile = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/profiles/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Perfil removido!");
    },
    onError: (err) => toast.error(String(err)),
  });

  const updateEmployee = useMutation({
    mutationFn: ({ id, profileId }: { id: number; profileId: number | null }) =>
      fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const handleDragStart = (e: React.DragEvent, empId: number) => {
    e.dataTransfer.setData("employeeId", String(empId));
  };

  const handleDrop = (e: React.DragEvent, profileId: number) => {
    e.preventDefault();
    const empId = parseInt(e.dataTransfer.getData("employeeId"));
    updateEmployee.mutate({ id: empId, profileId });
    setDragOver(null);
  };

  const employeesByProfile = (profileId: number) =>
    employees.filter((e) => e.profileId === profileId);

  const unassigned = employees.filter((e) => !e.profileId);

  if (profLoading || empLoading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Gestão de Perfis"
        description="Crie perfis e arraste colaboradores para organizá-los"
      />

      {/* Create Profile */}
      <div className="card mb-6">
        <div className="card-body">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newName.trim()) createProfile.mutate(newName.trim());
            }}
            className="flex gap-3"
          >
            <input
              type="text"
              className="form-input flex-1"
              placeholder="Nome do novo perfil (ex: Analista de Processos)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button
              type="submit"
              className="btn-primary btn"
              disabled={createProfile.isPending || !newName.trim()}
            >
              Criar Perfil
            </button>
          </form>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {/* Unassigned */}
        <div className="card shrink-0 w-64">
          <div className="card-header bg-gray-50">
            <div>
              <h3 className="font-semibold text-gray-700">Sem perfil</h3>
              <p className="text-xs text-gray-500">{unassigned.length} colaboradores</p>
            </div>
          </div>
          <div className="p-3 min-h-32 space-y-2">
            {unassigned.map((emp) => (
              <div
                key={emp.id}
                draggable
                onDragStart={(e) => handleDragStart(e, emp.id)}
                className="bg-gray-100 border border-gray-200 rounded-md px-3 py-2 text-sm cursor-grab active:cursor-grabbing hover:bg-gray-200 transition-colors"
              >
                <div className="font-medium text-gray-800 truncate">{emp.name}</div>
                {emp.role && <div className="text-xs text-gray-500 truncate">{emp.role}</div>}
              </div>
            ))}
            {unassigned.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Todos atribuídos</p>
            )}
          </div>
        </div>

        {/* Profiles */}
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className={`card shrink-0 w-64 transition-all ${
              dragOver === profile.id ? "ring-2 ring-primary-500" : ""
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(profile.id);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => handleDrop(e, profile.id)}
          >
            <div className="card-header bg-primary-50">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-primary-900 truncate">{profile.name}</h3>
                <p className="text-xs text-primary-600">
                  {employeesByProfile(profile.id).length} colaboradores
                </p>
              </div>
              <div className="flex gap-1 ml-2">
                <button
                  onClick={() => {
                    setEditProfile(profile);
                    setEditName(profile.name);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-700 rounded"
                  title="Editar"
                >
                  ✏️
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Excluir perfil "${profile.name}"?`))
                      deleteProfile.mutate(profile.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                  title="Excluir"
                >
                  🗑️
                </button>
              </div>
            </div>
            <div className="p-3 min-h-32 space-y-2">
              {employeesByProfile(profile.id).map((emp) => (
                <div
                  key={emp.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, emp.id)}
                  className="bg-white border border-gray-200 rounded-md px-3 py-2 text-sm cursor-grab active:cursor-grabbing hover:border-primary-300 hover:bg-primary-50 transition-colors"
                >
                  <div className="font-medium text-gray-800 truncate">{emp.name}</div>
                  {emp.role && <div className="text-xs text-gray-500 truncate">{emp.role}</div>}
                </div>
              ))}
              {employeesByProfile(profile.id).length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">
                  Arraste colaboradores aqui
                </p>
              )}
            </div>
          </div>
        ))}

        {profiles.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              title="Nenhum perfil criado"
              description="Crie um perfil acima para começar a organizar sua equipe"
              icon="👥"
            />
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editProfile}
        onClose={() => setEditProfile(null)}
        title="Editar Perfil"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Nome do Perfil</label>
            <input
              type="text"
              className="form-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary btn" onClick={() => setEditProfile(null)}>
              Cancelar
            </button>
            <button
              className="btn-primary btn"
              onClick={() => {
                if (editProfile && editName.trim()) {
                  updateProfile.mutate({ id: editProfile.id, name: editName.trim() });
                }
              }}
            >
              Salvar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
