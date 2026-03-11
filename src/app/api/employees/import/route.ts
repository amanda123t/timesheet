import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeString } from "@/lib/utils";
import Papa from "papaparse";

interface EmployeeRow {
  nome?: string;
  name?: string;
  cargo?: string;
  role?: string;
  perfil?: string;
  profile?: string;
  [key: string]: string | undefined;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const result = Papa.parse<EmployeeRow>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => normalizeString(h),
    });

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const row of result.data) {
      try {
        // Support multiple column name variations
        const name = (row.nome || row.name || "").trim();
        const role = (row.cargo || row.role || "").trim() || null;
        const profileName = (row.perfil || row.profile || "").trim();

        if (!name) {
          errors.push(`Row skipped: empty name`);
          continue;
        }

        // Upsert profile if provided
        let profileId: number | null = null;
        if (profileName) {
          const profile = await prisma.profile.upsert({
            where: { name: profileName },
            update: {},
            create: { name: profileName },
          });
          profileId = profile.id;
        }

        // Check if employee already exists (by name, case-insensitive)
        const existing = await prisma.employee.findFirst({
          where: { name: { equals: name, mode: "insensitive" } },
        });

        if (existing) {
          await prisma.employee.update({
            where: { id: existing.id },
            data: { role, profileId, active: true },
          });
          updated++;
        } else {
          await prisma.employee.create({
            data: { name, role, profileId, active: true },
          });
          created++;
        }
      } catch (err) {
        errors.push(`Error processing row: ${String(err)}`);
      }
    }

    // Write audit log
    await prisma.auditLog.create({
      data: {
        action: "IMPORT_EMPLOYEES",
        entity: "employees",
        details: { created, updated, errors: errors.slice(0, 10) },
      },
    });

    return NextResponse.json({
      success: true,
      created,
      updated,
      skipped: 0,
      errors,
    });
  } catch (error) {
    console.error("[import/employees]", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
