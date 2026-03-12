"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchApi, mutateApi } from "@/lib/api";
import {
  TimesheetCalendar,
  CalendarCell,
  toHHMM,
  MONTH_NAMES,
} from "@/components/timesheet-calendar";
import {
  TimesheetEntryModal,
  EntryForm,
  parseHHMM,
} from "@/components/timesheet-entry-modal";
import type { Employee, Activity, TimeEntry } from "@/types";

export default function DailyEntriesPage() {
  const today = new Date();
  const [employeeId, setEmployeeId] = useState<string>("");
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [form, setForm] = useState<EntryForm>({ activityId: "", hours: "" });

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
      toast.success("Lançamento salvo com sucesso.");
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
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    const hours = parseHHMM(form.hours);
    if (hours === null) {
      toast.error("Informe as horas no formato HH:MM válido (ex: 08:00).");
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
        title="Apontamento Diário"
        description="Registro de horas por colaborador em formato de calendário mensal"
      />

      {/* Filters + Month navigation */}
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
            aria-label="Mês anterior"
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
            aria-label="Próximo mês"
          >
            <ChevronRight size={16} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Stats */}
      {employeeId && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card">
            <p className="stat-label">Total de Horas no Mês</p>
            <p className="stat-value text-primary-700 tabular-nums">
              {toHHMM(totalMonthHours)}
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Lançamentos no Mês</p>
            <p className="stat-value">{entries.length}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Mês de Referência</p>
            <p className="stat-value text-lg">
              {MONTH_NAMES[month - 1]} {year}
            </p>
          </div>
        </div>
      )}

      {/* Calendar */}
      <TimesheetCalendar
        cells={cells}
        isLoading={isLoading}
        employeeId={employeeId}
        year={year}
        month={month}
        onDayClick={openModal}
      />

      {/* Entry modal */}
      <TimesheetEntryModal
        isOpen={modalOpen}
        onClose={closeModal}
        dateLabel={selectedDateLabel}
        activities={activeActivities}
        form={form}
        onChange={setForm}
        onSave={handleSave}
        isPending={createMutation.isPending}
      />
    </div>
  );
}
