import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/utils";
import { z } from "zod";

const upsertSchema = z.object({
  taskId: z.number(),
  activityId: z.number().nullable(),
});

export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    return prisma.taskMapping.findMany({
      where: {
        ...(search
          ? {
              task: {
                rawName: { contains: search, mode: "insensitive" },
              },
            }
          : {}),
      },
      include: {
        task: true,
        activity: true,
      },
      orderBy: { task: { rawName: "asc" } },
    });
  });
}

export async function PUT(req: NextRequest) {
  return apiHandler(async () => {
    const body = await req.json();
    const { taskId, activityId } = upsertSchema.parse(body);

    const mapping = await prisma.taskMapping.upsert({
      where: { taskId },
      update: { activityId },
      create: { taskId, activityId },
      include: { task: true, activity: true },
    });

    // Update all time_entries for this task with the new activityId
    if (activityId) {
      await prisma.timeEntry.updateMany({
        where: { taskId },
        data: { activityId },
      });
    }

    return mapping;
  });
}
