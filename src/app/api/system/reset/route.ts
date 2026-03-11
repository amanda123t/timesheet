import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const resetSchema = z.object({
  confirm: z.literal("RESET"),
  scope: z.enum(["time_entries", "full"]).default("full"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scope } = resetSchema.parse(body);

    if (scope === "time_entries") {
      await prisma.timeEntry.deleteMany({});
      await prisma.auditLog.create({
        data: { action: "RESET_TIME_ENTRIES", details: {} },
      });
      return NextResponse.json({
        success: true,
        message: "Time entries cleared",
      });
    }

    // Full reset: delete in order to respect foreign keys
    await prisma.timeEntry.deleteMany({});
    await prisma.taskMapping.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.activityEstimate.deleteMany({});
    await prisma.activity.deleteMany({});
    await prisma.employee.deleteMany({});
    await prisma.month.deleteMany({});
    await prisma.profile.deleteMany({});
    await prisma.auditLog.deleteMany({});

    await prisma.auditLog.create({
      data: { action: "FULL_RESET", details: {} },
    });

    return NextResponse.json({ success: true, message: "System reset complete" });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
