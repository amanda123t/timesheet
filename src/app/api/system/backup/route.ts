import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      profiles,
      employees,
      activities,
      activityEstimates,
      tasks,
      taskMappings,
      months,
      timeEntries,
      auditLogs,
    ] = await Promise.all([
      prisma.profile.findMany(),
      prisma.employee.findMany(),
      prisma.activity.findMany(),
      prisma.activityEstimate.findMany(),
      prisma.task.findMany(),
      prisma.taskMapping.findMany(),
      prisma.month.findMany(),
      prisma.timeEntry.findMany(),
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 1000 }),
    ]);

    const backup = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      data: {
        profiles,
        employees,
        activities,
        activityEstimates,
        tasks,
        taskMappings,
        months,
        timeEntries,
        auditLogs,
      },
    };

    await prisma.auditLog.create({
      data: {
        action: "EXPORT_BACKUP",
        details: {
          counts: {
            profiles: profiles.length,
            employees: employees.length,
            activities: activities.length,
            timeEntries: timeEntries.length,
          },
        },
      },
    });

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="timesheet-backup-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
