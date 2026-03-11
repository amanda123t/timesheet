import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/utils";
import { z } from "zod";

const createSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

export async function GET() {
  return apiHandler(async () => {
    return prisma.month.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: {
        _count: { select: { timeEntries: true } },
      },
    });
  });
}

export async function POST(req: NextRequest) {
  return apiHandler(async () => {
    const body = await req.json();
    const { year, month } = createSchema.parse(body);
    return prisma.month.upsert({
      where: { year_month: { year, month } },
      update: {},
      create: { year, month, status: "open" },
    });
  });
}
