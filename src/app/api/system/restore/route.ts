import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const backup = JSON.parse(text);

    if (!backup.version || !backup.data) {
      return NextResponse.json(
        { error: "Invalid backup file format" },
        { status: 400 }
      );
    }

    const { data } = backup;

    // Clear existing data
    await prisma.timeEntry.deleteMany({});
    await prisma.taskMapping.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.activityEstimate.deleteMany({});
    await prisma.activity.deleteMany({});
    await prisma.employee.deleteMany({});
    await prisma.month.deleteMany({});
    await prisma.profile.deleteMany({});

    // Restore in order
    if (data.profiles?.length) {
      await prisma.profile.createMany({ data: data.profiles, skipDuplicates: true });
    }
    if (data.employees?.length) {
      await prisma.employee.createMany({ data: data.employees, skipDuplicates: true });
    }
    if (data.activities?.length) {
      await prisma.activity.createMany({ data: data.activities, skipDuplicates: true });
    }
    if (data.activityEstimates?.length) {
      await prisma.activityEstimate.createMany({
        data: data.activityEstimates,
        skipDuplicates: true,
      });
    }
    if (data.tasks?.length) {
      await prisma.task.createMany({ data: data.tasks, skipDuplicates: true });
    }
    if (data.taskMappings?.length) {
      await prisma.taskMapping.createMany({
        data: data.taskMappings,
        skipDuplicates: true,
      });
    }
    if (data.months?.length) {
      await prisma.month.createMany({ data: data.months, skipDuplicates: true });
    }
    if (data.timeEntries?.length) {
      // Insert in batches of 500
      for (let i = 0; i < data.timeEntries.length; i += 500) {
        const batch = data.timeEntries.slice(i, i + 500);
        await prisma.timeEntry.createMany({ data: batch, skipDuplicates: true });
      }
    }

    await prisma.auditLog.create({
      data: {
        action: "RESTORE_BACKUP",
        details: { restoredFrom: backup.exportedAt },
      },
    });

    return NextResponse.json({ success: true, message: "Backup restored successfully" });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
