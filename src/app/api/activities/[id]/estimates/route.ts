import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/utils";
import { z } from "zod";

const upsertSchema = z.array(
  z.object({
    profileId: z.number(),
    assessmentHours: z.number().default(0),
    architectureHours: z.number().default(0),
  })
);

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const activityId = parseInt(params.id);
    return prisma.activityEstimate.findMany({
      where: { activityId },
      include: { profile: true },
    });
  });
}

export async function PUT(req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const activityId = parseInt(params.id);
    const body = await req.json();
    const estimates = upsertSchema.parse(body);

    // Delete all existing estimates for this activity and recreate
    await prisma.activityEstimate.deleteMany({ where: { activityId } });

    const created = await prisma.activityEstimate.createMany({
      data: estimates.map((e) => ({
        activityId,
        profileId: e.profileId,
        assessmentHours: e.assessmentHours,
        architectureHours: e.architectureHours,
      })),
    });

    return { success: true, count: created.count };
  });
}
