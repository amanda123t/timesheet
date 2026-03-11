import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/utils";
import { z } from "zod";

const updateSchema = z.object({
  code: z.string().optional().nullable(),
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const id = parseInt(params.id);
    return prisma.activity.findUniqueOrThrow({
      where: { id },
      include: { estimates: { include: { profile: true } } },
    });
  });
}

export async function PUT(req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const id = parseInt(params.id);
    const body = await req.json();
    const data = updateSchema.parse(body);
    return prisma.activity.update({
      where: { id },
      data,
      include: { estimates: { include: { profile: true } } },
    });
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const id = parseInt(params.id);
    await prisma.activity.update({
      where: { id },
      data: { active: false },
    });
    return { success: true };
  });
}
