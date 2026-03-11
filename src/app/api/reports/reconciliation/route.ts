import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler, toMonthKey, normalizeString } from "@/lib/utils";

export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    // Build month filter
    let monthFilter: { monthId?: number } = {};
    if (year && month) {
      const m = await prisma.month.findUnique({
        where: {
          year_month: { year: parseInt(year), month: parseInt(month) },
        },
      });
      if (m) monthFilter = { monthId: m.id };
    }

    // Get all active employees
    const employees = await prisma.employee.findMany({
      where: { active: true },
      include: { profile: true },
    });
    const employeeSet = new Map(
      employees.map((e) => [normalizeString(e.name), e])
    );

    // Get distinct employee names from time entries with their hours per month
    const entries = await prisma.timeEntry.findMany({
      where: { ...monthFilter },
      select: {
        rawEmployeeName: true,
        employeeId: true,
        hours: true,
        month: {
          select: { year: true, month: true },
        },
      },
    });

    // Build monthlyHours per raw employee name
    const rawEmployeeHours = new Map<
      string,
      { monthlyHours: Record<string, number>; employeeId: number | null }
    >();

    for (const entry of entries) {
      const name = normalizeString(entry.rawEmployeeName);
      if (!rawEmployeeHours.has(name)) {
        rawEmployeeHours.set(name, {
          monthlyHours: {},
          employeeId: entry.employeeId,
        });
      }
      const record = rawEmployeeHours.get(name)!;
      if (entry.month) {
        const mk = toMonthKey(entry.month.year, entry.month.month);
        record.monthlyHours[mk] =
          (record.monthlyHours[mk] ?? 0) + Number(entry.hours);
      }
    }

    const rows: {
      employeeName: string;
      profileName: string | null;
      inEmployeeTable: boolean;
      inTimeEntries: boolean;
      status: string;
      monthlyHours: Record<string, number>;
    }[] = [];

    // Employees in the system
    for (const [normalizedName, emp] of employeeSet) {
      const entryData = rawEmployeeHours.get(normalizedName);
      rows.push({
        employeeName: emp.name,
        profileName: emp.profile?.name ?? null,
        inEmployeeTable: true,
        inTimeEntries: !!entryData,
        status: entryData ? "ok" : "no_entries",
        monthlyHours: entryData?.monthlyHours ?? {},
      });
    }

    // Names in time entries but not in employee table
    for (const [normalizedName, data] of rawEmployeeHours) {
      if (!employeeSet.has(normalizedName)) {
        // Find original casing
        const originalName =
          entries.find(
            (e) => normalizeString(e.rawEmployeeName) === normalizedName
          )?.rawEmployeeName ?? normalizedName;

        rows.push({
          employeeName: originalName,
          profileName: null,
          inEmployeeTable: false,
          inTimeEntries: true,
          status: "not_in_employees",
          monthlyHours: data.monthlyHours,
        });
      }
    }

    rows.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
    return rows;
  });
}
