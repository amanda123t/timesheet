import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler, getBusinessDays } from "@/lib/utils";

export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

    const businessDays = getBusinessDays(year, month);
    const businessDayStrings = new Set(
      businessDays.map((d) => d.toISOString().split("T")[0])
    );

    // Get all active employees
    const employees = await prisma.employee.findMany({
      where: { active: true },
      include: { profile: true },
      orderBy: { name: "asc" },
    });

    // Get all time entries for this month
    const monthRecord = await prisma.month.findUnique({
      where: { year_month: { year, month } },
    });

    const timeEntries = monthRecord
      ? await prisma.timeEntry.findMany({
          where: { monthId: monthRecord.id },
          select: { employeeId: true, entryDate: true, rawEmployeeName: true },
        })
      : [];

    // Map of employeeId -> Set of dates with entries
    const entryDates = new Map<number, Set<string>>();
    for (const entry of timeEntries) {
      if (!entry.employeeId) continue;
      if (!entryDates.has(entry.employeeId)) {
        entryDates.set(entry.employeeId, new Set());
      }
      const dateStr = new Date(entry.entryDate).toISOString().split("T")[0];
      entryDates.get(entry.employeeId)!.add(dateStr);
    }

    // Build result
    const result = employees.map((emp) => {
      const datesWithEntries = entryDates.get(emp.id) ?? new Set<string>();
      const missingDates = [...businessDayStrings].filter(
        (d) => !datesWithEntries.has(d)
      );

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        profileName: emp.profile?.name ?? null,
        missingDates,
        totalMissing: missingDates.length,
        totalBusinessDays: businessDays.length,
        coverage: Math.round(
          ((businessDays.length - missingDates.length) / businessDays.length) *
            100
        ),
      };
    });

    return {
      year,
      month,
      businessDays: businessDays.length,
      employees: result,
    };
  });
}
