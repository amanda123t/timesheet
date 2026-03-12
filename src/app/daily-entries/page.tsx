"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { fetchApi, mutateApi } from "@/lib/api";
import type { Employee, Activity, TimeEntry } from "@/types";

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const DAY_HEADERS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

function parseHHMM(value: string): number | null {
  const match = value.match(/^(\d{1,3}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (m >= 60) return null;
  return h + m / 60;
}

function formatHours(totalHours: number): string {
  const h = Math.floor(totalHours);
  const m = Math.round((totalHours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

interface CalendarCell {
  day: number | null;
  hours: number;
}

export default function DailyEntriesPage() {
  const today = new Date();
  const [employeeId, setEmployeeId] = useState<string>("");
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [form, setForm] = useState({ activityId: "", hours: "" });

  const qc = useQueryClient();

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => fetchApi("/api/employees"),
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["activities"],
    queryFn: () => fetchApi("/api/activities"),
  });

  const { data: entries = [], isLoading } = useQuery<TimeEntry[]>({
    queryKey: ["daily-entries", employeeId, year, month],
    queryFn: () =>
      fetchApi(
        `/api/daily-entries?employeeId=${employeeId}&year=${year}&month=${month}`
      ),
    enabled: !!employeeId,
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      employeeId: number;
      activityId: number;
      entryDate: string;
      hours: number;
    }) => mutateApi("/api/daily-entries", "POST", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-entries"] });
      setModalOpen(false);
      setForm({ activityId: "", hours: "" });
      toast.success("Lancamento salvo com sucesso.");
    },
    onError: (err) => toast.error(String(err)),
  });

  const { cells, totalMonthHours } = useMemo<{
    cells: CalendarCell[];
    totalMonthHours: number;
  }>(() => {
    const firstDay = new Date(year, month - 1, 1);
    const totalDays = new Date(year, month, 0).getDate();
    const startDow = firstDay.getDay();

    const cells: CalendarCell[] = [];

    for (let i = 0; i < startDow; i++) {
      cells.push({ day: null, hours: 0 });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dayStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayHours = entries
        .filter((e) => e.entryDate.slice(0, 10) === dayStr)
        .reduce((sum, e) => sum + Number(e.hours), 0);
      cells.push({ day: d, hours: dayHours });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ day: null, hours: 0 });
    }

    const totalMonthHours = entries.reduce(
      (sum, e) => sum + Number(e.hours),
      0
    );

    return { cells, totalMonthHours };
  }, [entries, year, month]);

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  function openModal(day: number) {
    setSelectedDay(day);
    setForm({ activityId: "", hours: "" });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedDay(null);
    setForm({ activityId: "", hours: "" });
  }

  function handleSave() {
    if (!employeeId || !form.activityId || !form.hours || !selectedDay) {
      toast.error("Preencha todos os campos obrigatorios.");
      return;
    }

    const hours = parseHHMM(form.hours);
    if (hours === null || hours <= 0) {
      toast.error("Informe as horas no formato HH:MM (ex: 08:00).");
      return;
    }

    const entryDate = `${year}-${String(month).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
    createMutation.mutate({
      employeeId: parseInt(employeeId),
      activityId: parseInt(form.activityId),
      entryDate,
      hours,
    });
  }

  const selectedDateLabel = selectedDay
    ? new Date(year, month - 1, selectedDay).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "";

  const years = Array.from(
    { length: 5 },
    (_, i) => today.getFullYear() - 2 + i
  );

  const activeActivities = activities.filter((a) => a.active);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Apontamento Diario"
        description="Registro de horas por colaborador em formato de calendario mensal"
      />

      {/* Filters + Navigation */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Colaborador
          </label>
          <select
            className="form-select min-w-[220px]"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {employees
              .filter((e) => e.active)
              .map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
          </select>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={prevMonth}
            className="p-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={16} className="text-gray-600" />
          </button>

          <select
            className="form-select"
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>
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

          <button
            onClick={nextMonth}
            className="p-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            aria-label="Proximo mes"
          >
            <ChevronRight size={16} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Stats */}
      {employeeId && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card">
            <p className="stat-label">Total de Horas no Mes</p>
            <p className="stat-value text-primary-700">
              {formatHours(totalMonthHours)}
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Lancamentos no Mes</p>
            <p className="stat-value">{entries.length}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Mes de Referencia</p>
            <p className="stat-value text-lg">
              {MONTH_NAMES[month - 1]} {year}
            </p>
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-base font-semibold text-gray-800">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          {employeeId && (
            <span className="text-sm text-gray-500">
              Clique em um dia para adicionar lancamento
            </span>
          )}
        </div>

        <div className="card-body">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_HEADERS.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-semibold text-gray-400 uppercase py-2 tracking-wide"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid body */}
          {!employeeId ? (
            <div className="py-20 text-center">
              <p className="text-sm text-gray-400">
                Selecione um colaborador para visualizar o calendario.
              </p>
            </div>
          ) : isLoading ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((cell, idx) => {
                if (!cell.day) {
                  return <div key={idx} className="aspect-[4/3]" />;
                }

                const isToday =
                  cell.day === today.getDate() &&
                  month === today.getMonth() + 1 &&
                  year === today.getFullYear();

                return (
                  <button
                    key={idx}
                    onClick={() => openModal(cell.day!)}
                    className={`
                      aspect-[4/3] rounded-lg border flex flex-col items-center justify-center gap-1
                      transition-all duration-150 group relative
                      ${
                        isToday
                          ? "border-primary-400 bg-primary-50 shadow-sm"
                          : "border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50 hover:shadow-sm"
                      }
                    `}
                  >
                    <span
                      className={`text-sm font-semibold leading-none ${
                        isToday ? "text-primary-700" : "text-gray-700"
                      }`}
                    >
                      {cell.day}
                    </span>

                    {cell.hours > 0 ? (
                      <span className="text-xs font-medium text-primary-600 bg-primary-100 px-1.5 py-0.5 rounded-full leading-none">
                        {formatHours(cell.hours)}
                      </span>
                    ) : (
                      <Plus
                        size={12}
                        className="text-gray-300 group-hover:text-primary-400 transition-colors"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={`Adicionar Lancamento para ${selectedDateLabel}`}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Atividade *</label>
            <select
              className="form-select w-full"
              value={form.activityId}
              onChange={(e) =>
                setForm((f) => ({ ...f, activityId: e.target.value }))
              }
            >
              <option value="">Selecione uma atividade...</option>
              {activeActivities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code ? `[${a.code}] ` : ""}
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Horas *</label>
            <input
              type="text"
              className="form-input w-full"
              placeholder="HH:MM — ex: 08:00"
              value={form.hours}
              onChange={(e) =>
                setForm((f) => ({ ...f, hours: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
            />
            <p className="mt-1 text-xs text-gray-400">
              Use o formato HH:MM. Exemplo: 01:30 para 1 hora e 30 minutos.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button onClick={closeModal} className="btn btn-secondary">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={createMutation.isPending}
              className="btn btn-primary"
            >
              {createMutation.isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
