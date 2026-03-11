import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/utils";

export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    const { searchParams } = new URL(req.url);
    const unmappedOnly = searchParams.get("unmappedOnly") === "true";

    return prisma.task.findMany({
      where: {
        ...(unmappedOnly ? { mapping: null } : {}),
      },
      include: {
        mapping: { include: { activity: true } },
        _count: { select: { timeEntries: true } },
      },
      orderBy: { rawName: "asc" },
    });
  });
}
