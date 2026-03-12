"use client";

import { Plus } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
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

const DAY_HEADERS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export interface CalendarCell {
  day: number | null;
  /** total hours for that day (decimal, e.g. 1.5 = 1h30m) */
  hours: number;
}

/** Converts decimal hours to HH:MM string, e.g. 1.5 → "01:30" */
export function toHHMM(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface TimesheetCalendarProps {
  cells: CalendarCell[];
  isLoading: boolean;
  employeeId: string;
  year: number;
  month: number;
  onDayClick: (day: number) => void;
}

export function TimesheetCalendar({
  cells,
  isLoading,
  employeeId,
  year,
  month,
  onDayClick,
}: TimesheetCalendarProps) {
  const today = new Date();

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-base font-semibold text-gray-800">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        {employeeId && (
          <span className="text-sm text-gray-500">
            Clique em um dia para adicionar lançamento
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
              Selecione um colaborador para visualizar o calendário.
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
                  onClick={() => onDayClick(cell.day!)}
                  className={`
                    aspect-[4/3] rounded-lg border flex flex-col items-center justify-center gap-1
                    transition-all duration-150 group
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
                    <span className="text-xs font-medium text-primary-600 bg-primary-100 px-1.5 py-0.5 rounded-full leading-none tabular-nums">
                      {toHHMM(cell.hours)}
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
  );
}
