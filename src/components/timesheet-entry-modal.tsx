"use client";

import { Modal } from "@/components/ui/Modal";
import type { Activity } from "@/types";

export interface EntryForm {
  activityId: string;
  hours: string; // HH:MM string
}

/** Parses "HH:MM" → decimal hours (e.g. "01:30" → 1.5). Returns null if invalid. */
export function parseHHMM(value: string): number | null {
  const match = value.match(/^(\d{1,3}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (m >= 60 || (h === 0 && m === 0)) return null;
  return h + m / 60;
}

interface TimesheetEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateLabel: string;
  activities: Activity[];
  form: EntryForm;
  onChange: (form: EntryForm) => void;
  onSave: () => void;
  isPending: boolean;
}

export function TimesheetEntryModal({
  isOpen,
  onClose,
  dateLabel,
  activities,
  form,
  onChange,
  onSave,
  isPending,
}: TimesheetEntryModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Adicionar Lançamento para ${dateLabel}`}
      size="sm"
    >
      <div className="space-y-4">
        <div>
          <label className="form-label">Atividade *</label>
          <select
            className="form-select w-full"
            value={form.activityId}
            onChange={(e) => onChange({ ...form, activityId: e.target.value })}
          >
            <option value="">Selecione uma atividade...</option>
            {activities.map((a) => (
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
            onChange={(e) => onChange({ ...form, hours: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave();
            }}
          />
          <p className="mt-1 text-xs text-gray-400">
            Formato HH:MM. Ex: 01:30 para 1 hora e 30 minutos.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="btn btn-secondary">
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={isPending}
            className="btn btn-primary"
          >
            {isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
