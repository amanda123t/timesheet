import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/utils";
import { z } from "zod";

const createSchema = z.object({
  employeeId: z.number().int().positive(),
  activityId: z.number().int().positive(),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hours: z.number().positive(),
});

export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    if (!employeeId || !year || !month) {
      throw new Error("employeeId, year e month são obrigatórios");
    }

    const y = parseInt(year);
    const m = parseInt(month);

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0); // último dia do mês

    return prisma.timeEntry.findMany({
      where: {
        employeeId: parseInt(employeeId),
        entryDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { activity: true },
      orderBy: { entryDate: "asc" },
    });
  });
}

export async function POST(req: NextRequest) {
  return apiHandler(async () => {
    const body = await req.json();
    const data = createSchema.parse(body);

    const employee = await prisma.employee.findUniqueOrThrow({
      where: { id: data.employeeId },
    });

    const activity = await prisma.activity.findUniqueOrThrow({
      where: { id: data.activityId },
    });

    const date = new Date(data.entryDate + "T12:00:00Z");
    const entryYear = date.getUTCFullYear();
    const entryMonth = date.getUTCMonth() + 1;

    let monthRecord = await prisma.month.findUnique({
      where: { year_month: { year: entryYear, month: entryMonth } },
    });

    if (!monthRecord) {
      monthRecord = await prisma.month.create({
        data: { year: entryYear, month: entryMonth, status: "open" },
      });
    }

    return prisma.timeEntry.create({
      data: {
        employeeId: data.employeeId,
        activityId: data.activityId,
        monthId: monthRecord.id,
        entryDate: new Date(data.entryDate + "T12:00:00Z"),
        hours: data.hours,
        rawEmployeeName: employee.name,
        rawTaskName: activity.name,
      },
      include: { activity: true },
    });
  });
}
