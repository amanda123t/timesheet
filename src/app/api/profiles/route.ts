import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/utils";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET() {
  return apiHandler(async () => {
    return prisma.profile.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { employees: true } },
      },
    });
  });
}

export async function POST(req: NextRequest) {
  return apiHandler(async () => {
    const body = await req.json();
    const { name } = createSchema.parse(body);
    return prisma.profile.create({ data: { name } });
  });
}
