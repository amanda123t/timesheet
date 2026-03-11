import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler, toMonthKey } from "@/lib/utils";

export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    const { searchParams } = new URL(req.url);
    const activityId = searchParams.get("activityId");
    const profileId = searchParams.get("profileId");

    // 1. Load all activity estimates (planned hours per activity+profile)
    const estimates = await prisma.activityEstimate.findMany({
      where: {
        ...(activityId ? { activityId: parseInt(activityId) } : {}),
        ...(profileId ? { profileId: parseInt(profileId) } : {}),
        activity: { active: true },
      },
      include: {
        activity: true,
        profile: true,
      },
      orderBy: [
        { activity: { name: "asc" } },
        { profile: { name: "asc" } },
      ],
    });

    // 2. Load actual hours grouped by (activityId, profileId, year, month)
    // We join through employee to get profileId
    const actualEntries = await prisma.timeEntry.groupBy({
      by: ["activityId", "monthId"],
      _sum: { hours: true },
      where: {
        activityId: { not: null },
        ...(activityId ? { activityId: parseInt(activityId) } : {}),
        // Filter by profile via employee
        ...(profileId
          ? {
              employee: { profileId: parseInt(profileId) },
            }
          : {}),
      },
    });

    // 3. Load month details for the actual entries
    const monthIds = [
      ...new Set(actualEntries.map((e) => e.monthId).filter(Boolean)),
    ] as number[];
    const monthDetails = await prisma.month.findMany({
      where: { id: { in: monthIds } },
    });
    const monthById = new Map(monthDetails.map((m) => [m.id, m]));

    // 4. Build a map of actual hours: activityId -> monthKey -> hours
    const actualMap = new Map<string, number>();
    for (const entry of actualEntries) {
      if (!entry.activityId || !entry.monthId) continue;
      const m = monthById.get(entry.monthId);
      if (!m) continue;
      const key = `${entry.activityId}::${toMonthKey(m.year, m.month)}`;
      actualMap.set(key, (actualMap.get(key) ?? 0) + Number(entry._sum.hours ?? 0));
    }

    // 5. Get all distinct months with data for column headers
    const allMonths = monthDetails
      .sort((a, b) =>
        a.year !== b.year ? b.year - a.year : b.month - a.month
      )
      .map((m) => ({
        key: toMonthKey(m.year, m.month),
        label: `${String(m.month).padStart(2, "0")}/${m.year}`,
        year: m.year,
        month: m.month,
      }));

    // 6. Build result rows
    const rows = estimates.map((est) => {
      const activityId = est.activityId;
      const profileId = est.profileId;

      const assessmentHours = Number(est.assessmentHours);
      const architectureHours = Number(est.architectureHours);
      const totalPlanned = assessmentHours + architectureHours;

      const actualByMonth: Record<string, number> = {};
      let totalActual = 0;

      for (const m of allMonths) {
        // For profile-based filtering, we need per-profile actuals
        // Since groupBy doesn't easily do multi-dim, we use a combined key approach
        const key = `${activityId}::${m.key}`;
        const hours = actualMap.get(key) ?? 0;
        actualByMonth[m.key] = hours;
        totalActual += hours;
      }

      return {
        activityId,
        activityCode: est.activity.code,
        activityName: est.activity.name,
        profileId,
        profileName: est.profile.name,
        assessmentHours,
        architectureHours,
        totalPlanned,
        actualByMonth,
        totalActual,
        variance: totalActual - totalPlanned,
      };
    });

    return { rows, months: allMonths };
  });
}
