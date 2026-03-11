import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/utils";
import { z } from "zod";

const createSchema = z.object({
  code: z.string().optional().nullable(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  estimates: z
    .array(
      z.object({
        profileId: z.number(),
        assessmentHours: z.number().default(0),
        architectureHours: z.number().default(0),
      })
    )
    .optional(),
});

export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const withEstimates = searchParams.get("withEstimates") === "true";

    return prisma.activity.findMany({
      where: {
        active: true,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      },
      include: {
        ...(withEstimates
          ? { estimates: { include: { profile: true } } }
          : {}),
      },
      orderBy: { name: "asc" },
    });
  });
}

export async function POST(req: NextRequest) {
  return apiHandler(async () => {
    const body = await req.json();
    const { estimates, ...data } = createSchema.parse(body);

    return prisma.activity.create({
      data: {
        ...data,
        ...(estimates && estimates.length > 0
          ? {
              estimates: {
                create: estimates.map((e) => ({
                  profileId: e.profileId,
                  assessmentHours: e.assessmentHours,
                  architectureHours: e.architectureHours,
                })),
              },
            }
          : {}),
      },
      include: { estimates: { include: { profile: true } } },
    });
  });
}
