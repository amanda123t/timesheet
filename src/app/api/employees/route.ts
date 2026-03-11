import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/utils";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional().nullable(),
  profileId: z.number().optional().nullable(),
  active: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const profileId = searchParams.get("profileId");

    return prisma.employee.findMany({
      where: {
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        ...(profileId ? { profileId: parseInt(profileId) } : {}),
      },
      include: { profile: true },
      orderBy: { name: "asc" },
    });
  });
}

export async function POST(req: NextRequest) {
  return apiHandler(async () => {
    const body = await req.json();
    const data = createSchema.parse(body);
    return prisma.employee.create({
      data,
      include: { profile: true },
    });
  });
}
