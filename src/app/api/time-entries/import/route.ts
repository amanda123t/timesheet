import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeString, parseBrazilianDate, parseHours } from "@/lib/utils";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface HoursRow {
  projeto?: string;
  project?: string;
  tarefa?: string;
  task?: string;
  funcionario?: string;
  funcionário?: string;
  employee?: string;
  colaborador?: string;
  data?: string;
  date?: string;
  horas?: string | number;
  hours?: string | number;
  [key: string]: string | number | undefined;
}

async function processRows(rows: HoursRow[]) {
  let created = 0;
  const errors: string[] = [];

  // Pre-load existing data for performance
  const employees = await prisma.employee.findMany({
    select: { id: true, name: true },
  });
  const employeeMap = new Map(
    employees.map((e) => [normalizeString(e.name), e.id])
  );

  const tasks = await prisma.task.findMany({
    include: { mapping: true },
  });
  const taskMap = new Map(tasks.map((t) => [normalizeString(t.rawName), t]));

  const months = await prisma.month.findMany();
  const monthMap = new Map(
    months.map((m) => [`${m.year}-${m.month}`, m])
  );

  for (const row of rows) {
    try {
      const rawProject = (
        row.projeto ||
        row.project ||
        ""
      ).toString().trim() || null;

      const rawTaskName = (
        row.tarefa ||
        row.task ||
        ""
      ).toString().trim();

      const rawEmployeeName = (
        row.funcionario ||
        row["funcionário"] ||
        row.employee ||
        row.colaborador ||
        ""
      ).toString().trim();

      const rawDate = (row.data || row.date || "").toString().trim();
      const hoursVal = row.horas ?? row.hours ?? 0;

      if (!rawEmployeeName || !rawDate) {
        errors.push(`Row skipped: missing employee or date`);
        continue;
      }

      const entryDate = parseBrazilianDate(rawDate);
      if (!entryDate) {
        errors.push(`Invalid date: "${rawDate}"`);
        continue;
      }

      const hours = parseHours(hoursVal);
      if (hours <= 0) continue;

      const year = entryDate.getFullYear();
      const month = entryDate.getMonth() + 1;

      // Check if month is closed
      const monthKey = `${year}-${month}`;
      const monthRecord = monthMap.get(monthKey);
      if (monthRecord?.status === "closed") {
        errors.push(`Month ${monthKey} is closed. Skipping row for ${rawEmployeeName}.`);
        continue;
      }

      // Resolve or create month
      let resolvedMonth = monthRecord;
      if (!resolvedMonth) {
        resolvedMonth = await prisma.month.upsert({
          where: { year_month: { year, month } },
          update: {},
          create: { year, month, status: "open" },
        });
        monthMap.set(monthKey, resolvedMonth);
      }

      // Resolve employee
      const employeeId =
        employeeMap.get(normalizeString(rawEmployeeName)) ?? null;

      // Resolve or create task
      let taskRecord = taskMap.get(normalizeString(rawTaskName));
      if (!taskRecord && rawTaskName) {
        const newTask = await prisma.task.upsert({
          where: { rawName: rawTaskName },
          update: {},
          create: { rawName: rawTaskName },
          include: { mapping: true },
        });
        taskRecord = newTask;
        taskMap.set(normalizeString(rawTaskName), newTask);
      }

      const taskId = taskRecord?.id ?? null;
      const activityId = taskRecord?.mapping?.activityId ?? null;

      await prisma.timeEntry.create({
        data: {
          employeeId,
          taskId,
          activityId,
          monthId: resolvedMonth.id,
          entryDate,
          hours,
          rawEmployeeName,
          rawTaskName,
          rawProject,
        },
      });
      created++;
    } catch (err) {
      errors.push(`Row error: ${String(err)}`);
    }
  }

  return { created, errors };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    let rows: HoursRow[] = [];

    if (fileName.endsWith(".csv")) {
      const text = await file.text();
      const result = Papa.parse<HoursRow>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => normalizeString(h),
      });
      rows = result.data;
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        raw: false,
        dateNF: "dd/mm/yyyy",
      });
      rows = rawRows.map((r) => {
        const normalized: HoursRow = {};
        for (const [k, v] of Object.entries(r)) {
          normalized[normalizeString(k)] = v as string | number;
        }
        return normalized;
      });
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Use CSV or XLSX." },
        { status: 400 }
      );
    }

    const { created, errors } = await processRows(rows);

    await prisma.auditLog.create({
      data: {
        action: "IMPORT_TIME_ENTRIES",
        entity: "time_entries",
        details: { created, errors: errors.slice(0, 20) },
      },
    });

    return NextResponse.json({
      success: true,
      created,
      updated: 0,
      skipped: 0,
      errors,
    });
  } catch (error) {
    console.error("[import/time-entries]", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
