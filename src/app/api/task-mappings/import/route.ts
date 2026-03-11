import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeString } from "@/lib/utils";
import Papa from "papaparse";

interface MappingRow {
  de?: string;
  from?: string;
  tarefa?: string;
  task?: string;
  para?: string;
  to?: string;
  atividade?: string;
  activity?: string;
  [key: string]: string | undefined;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const result = Papa.parse<MappingRow>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => normalizeString(h),
    });

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const row of result.data) {
      try {
        const taskRawName = (
          row.de ||
          row.from ||
          row.tarefa ||
          row.task ||
          ""
        ).trim();
        const activityName = (
          row.para ||
          row.to ||
          row.atividade ||
          row.activity ||
          ""
        ).trim();

        if (!taskRawName) {
          errors.push("Row skipped: empty task name");
          continue;
        }

        // Find or create task
        const task = await prisma.task.upsert({
          where: { rawName: taskRawName },
          update: {},
          create: { rawName: taskRawName },
        });

        // Find activity if provided
        let activityId: number | null = null;
        if (activityName) {
          const activity = await prisma.activity.findFirst({
            where: { name: { contains: activityName, mode: "insensitive" } },
          });
          if (activity) {
            activityId = activity.id;
          } else {
            errors.push(
              `Activity not found: "${activityName}" for task "${taskRawName}"`
            );
          }
        }

        // Upsert mapping
        const existing = await prisma.taskMapping.findUnique({
          where: { taskId: task.id },
        });
        if (existing) {
          await prisma.taskMapping.update({
            where: { taskId: task.id },
            data: { activityId },
          });
          updated++;
        } else {
          await prisma.taskMapping.create({
            data: { taskId: task.id, activityId },
          });
          created++;
        }

        // Update time entries
        if (activityId) {
          await prisma.timeEntry.updateMany({
            where: { taskId: task.id },
            data: { activityId },
          });
        }
      } catch (err) {
        errors.push(`Error: ${String(err)}`);
      }
    }

    await prisma.auditLog.create({
      data: {
        action: "IMPORT_TASK_MAPPINGS",
        entity: "task_mappings",
        details: { created, updated, errors: errors.slice(0, 10) },
      },
    });

    return NextResponse.json({ success: true, created, updated, errors });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
