import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/utils";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100),
});

type Params = { params: { id: string } };

export async function PUT(req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const id = parseInt(params.id);
    const body = await req.json();
    const { name } = updateSchema.parse(body);
    return prisma.profile.update({ where: { id }, data: { name } });
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const id = parseInt(params.id);
    await prisma.profile.delete({ where: { id } });
    return { success: true };
  });
}
