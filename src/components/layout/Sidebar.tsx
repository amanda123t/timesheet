"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  UploadCloud,
  GitMerge,
  Users,
  User,
  ClipboardList,
  SearchCheck,
  BarChart3,
  LineChart,
  Link2,
  Calendar,
  CalendarDays,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  number: number | string;
}

const navItems: NavItem[] = [
  { href: "/upload",            label: "Upload e Auditoria",        icon: UploadCloud,    number: 1 },
  { href: "/task-mappings",     label: "Mapeamento DE/PARA",        icon: GitMerge,       number: "↕" },
  { href: "/profiles",          label: "Gestão de Perfis",          icon: Users,          number: 2 },
  { href: "/employees",         label: "Colaboradores",             icon: User,           number: 3 },
  { href: "/activities",        label: "Atividades",                icon: ClipboardList,  number: 4 },
  { href: "/audit",             label: "Auditoria de Dias",         icon: SearchCheck,    number: 5 },
  { href: "/summary",           label: "Resumo por Profissional",   icon: BarChart3,      number: 6 },
  { href: "/planned-vs-actual", label: "Planejamento vs Realizado", icon: LineChart,      number: 7 },
  { href: "/reconciliation",    label: "Conciliação",               icon: Link2,          number: 8 },
  { href: "/months",            label: "Gestão de Meses",           icon: Calendar,       number: 9 },
  { href: "/daily-entries",    label: "Apontamento Diário",         icon: CalendarDays,   number: 10 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-primary-900 text-white flex flex-col shrink-0 overflow-y-auto">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-primary-700">
        <h1 className="text-lg font-bold text-white leading-tight">TimeSheet</h1>
        <p className="text-xs text-primary-300 mt-0.5">Gestão de Horas</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <ul className="space-y-0.5 px-3">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (pathname.startsWith(item.href) && item.href !== "/");
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-primary-700 text-white shadow-sm"
                      : "text-primary-300 hover:bg-primary-800 hover:text-white"
                  }`}
                >
                  <Icon
                    size={18}
                    strokeWidth={1.75}
                    className={`shrink-0 transition-colors ${
                      isActive ? "text-white" : "text-primary-400 group-hover:text-white"
                    }`}
                  />
                  <span className="flex-1 leading-tight truncate">{item.label}</span>
                  <span
                    className={`shrink-0 text-xs w-5 h-5 flex items-center justify-center rounded ${
                      isActive
                        ? "bg-primary-600 text-white"
                        : "bg-primary-800 text-primary-400 group-hover:bg-primary-700 group-hover:text-primary-200"
                    }`}
                  >
                    {item.number}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-primary-700">
        <p className="text-xs text-primary-400">v1.0 &mdash; Portal de Gestão</p>
      </div>
    </aside>
  );
}
