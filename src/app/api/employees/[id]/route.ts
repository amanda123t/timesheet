import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/utils";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().optional().nullable(),
  profileId: z.number().optional().nullable(),
  active: z.boolean().optional(),
});

type Params = { params: { id: string } };

export async function PUT(req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const id = parseInt(params.id);
    const body = await req.json();
    const data = updateSchema.parse(body);
    return prisma.employee.update({
      where: { id },
      data,
      include: { profile: true },
    });
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const id = parseInt(params.id);
    await prisma.employee.delete({ where: { id } });
    return { success: true };
  });
}
