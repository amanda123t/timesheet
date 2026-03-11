import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/utils";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum(["close", "reopen"]),
});

type Params = { params: { id: string } };

export async function PUT(req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const id = parseInt(params.id);
    const body = await req.json();
    const { action } = actionSchema.parse(body);

    const month = await prisma.month.findUniqueOrThrow({ where: { id } });

    if (action === "close" && month.status === "closed") {
      throw new Error("Month is already closed");
    }
    if (action === "reopen" && month.status === "open") {
      throw new Error("Month is already open");
    }

    const updated = await prisma.month.update({
      where: { id },
      data: {
        status: action === "close" ? "closed" : "open",
        closedAt: action === "close" ? new Date() : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: action === "close" ? "CLOSE_MONTH" : "REOPEN_MONTH",
        entity: "months",
        entityId: id,
        details: { year: month.year, month: month.month },
      },
    });

    return updated;
  });
}
