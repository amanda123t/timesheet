// ─── CORE TYPES ───────────────────────────────────────────────────────────────

export interface Profile {
  id: number;
  name: string;
  createdAt: string;
  _count?: { employees: number };
}

export interface Employee {
  id: number;
  name: string;
  role: string | null;
  profileId: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  profile?: Profile | null;
}

export interface Activity {
  id: number;
  code: string | null;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  estimates?: ActivityEstimate[];
}

export interface ActivityEstimate {
  id: number;
  activityId: number;
  profileId: number;
  assessmentHours: number;
  architectureHours: number;
  profile?: Profile;
  activity?: Activity;
}

export interface Task {
  id: number;
  rawName: string;
  mapping?: TaskMapping | null;
}

export interface TaskMapping {
  id: number;
  taskId: number;
  activityId: number | null;
  task?: Task;
  activity?: Activity | null;
}

export interface Month {
  id: number;
  year: number;
  month: number;
  status: "open" | "closed";
  closedAt: string | null;
  createdAt: string;
}

export interface TimeEntry {
  id: number;
  employeeId: number | null;
  taskId: number | null;
  activityId: number | null;
  monthId: number | null;
  entryDate: string;
  hours: number;
  rawEmployeeName: string;
  rawTaskName: string;
  rawProject: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: number;
  action: string;
  entity: string | null;
  entityId: number | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

// ─── REPORT TYPES ─────────────────────────────────────────────────────────────

export interface PlannedVsActualRow {
  activityId: number;
  activityName: string;
  profileId: number;
  profileName: string;
  assessmentHours: number;
  architectureHours: number;
  totalPlanned: number;
  actualByMonth: Record<string, number>; // key: "YYYY-MM"
  totalActual: number;
}

export interface SummaryRow {
  employeeId: number | null;
  employeeName: string;
  profileName: string | null;
  activityId: number | null;
  activityName: string | null;
  monthKey: string; // "YYYY-MM"
  totalHours: number;
}

export interface MissingEntryRow {
  employeeId: number;
  employeeName: string;
  profileName: string | null;
  missingDates: string[];
  totalMissing: number;
}

export interface ReconciliationRow {
  employeeName: string;
  profileName: string | null;
  inEmployeeTable: boolean;
  inTimeEntries: boolean;
  monthlyHours: Record<string, number>;
}

// ─── API RESPONSE TYPES ───────────────────────────────────────────────────────

export interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface ApiError {
  error: string;
}
