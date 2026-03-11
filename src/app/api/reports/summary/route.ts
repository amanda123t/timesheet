import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler, toMonthKey } from "@/lib/utils";

export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const activityId = searchParams.get("activityId");
    const profileId = searchParams.get("profileId");
    const monthKey = searchParams.get("month"); // "YYYY-MM"

    // Parse month filter
    let monthId: number | undefined;
    if (monthKey) {
      const [y, m] = monthKey.split("-").map(Number);
      const month = await prisma.month.findUnique({
        where: { year_month: { year: y, month: m } },
      });
      monthId = month?.id;
    }

    const entries = await prisma.timeEntry.findMany({
      where: {
        ...(employeeId ? { employeeId: parseInt(employeeId) } : {}),
        ...(activityId ? { activityId: parseInt(activityId) } : {}),
        ...(profileId
          ? { employee: { profileId: parseInt(profileId) } }
          : {}),
        ...(monthId ? { monthId } : {}),
        activityId: { not: null },
        employeeId: { not: null },
      },
      include: {
        employee: { include: { profile: true } },
        activity: true,
        month: true,
      },
    });

    // Group by employee + activity + month
    const groupMap = new Map<
      string,
      {
        employeeId: number;
        employeeName: string;
        profileId: number | null;
        profileName: string | null;
        activityId: number;
        activityName: string;
        monthKey: string;
        monthLabel: string;
        totalHours: number;
      }
    >();

    for (const entry of entries) {
      if (!entry.employee || !entry.activity || !entry.month) continue;
      const mk = toMonthKey(entry.month.year, entry.month.month);
      const key = `${entry.employeeId}::${entry.activityId}::${mk}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          employeeId: entry.employee.id,
          employeeName: entry.employee.name,
          profileId: entry.employee.profileId,
          profileName: entry.employee.profile?.name ?? null,
          activityId: entry.activity.id,
          activityName: entry.activity.name,
          monthKey: mk,
          monthLabel: `${String(entry.month.month).padStart(2, "0")}/${entry.month.year}`,
          totalHours: 0,
        });
      }

      const row = groupMap.get(key)!;
      row.totalHours += Number(entry.hours);
    }

    return Array.from(groupMap.values()).sort((a, b) => {
      const n = a.employeeName.localeCompare(b.employeeName);
      if (n !== 0) return n;
      return a.monthKey.localeCompare(b.monthKey);
    });
  });
}
