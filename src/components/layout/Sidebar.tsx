"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/upload",
    label: "Upload e Auditoria",
    icon: "⬆️",
    number: 1,
  },
  {
    href: "/task-mappings",
    label: "Mapeamento DE/PARA",
    icon: "🔄",
    number: "↕",
  },
  {
    href: "/profiles",
    label: "Gestão de Perfis",
    icon: "👥",
    number: 2,
  },
  {
    href: "/employees",
    label: "Colaboradores",
    icon: "👤",
    number: 3,
  },
  {
    href: "/activities",
    label: "Atividades",
    icon: "📋",
    number: 4,
  },
  {
    href: "/audit",
    label: "Auditoria de Dias",
    icon: "🔍",
    number: 5,
  },
  {
    href: "/summary",
    label: "Resumo por Profissional",
    icon: "📊",
    number: 6,
  },
  {
    href: "/planned-vs-actual",
    label: "Planejamento vs Realizado",
    icon: "📈",
    number: 7,
  },
  {
    href: "/reconciliation",
    label: "Conciliação",
    icon: "🔗",
    number: 8,
  },
  {
    href: "/months",
    label: "Gestão de Meses",
    icon: "📅",
    number: 9,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-primary-900 text-white flex flex-col shrink-0 overflow-y-auto">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-primary-700">
        <h1 className="text-lg font-bold text-white leading-tight">
          TimeSheet
        </h1>
        <p className="text-xs text-primary-300 mt-0.5">Gestão de Horas</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <ul className="space-y-0.5 px-3">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (pathname.startsWith(item.href) && item.href !== "/");

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary-700 text-white"
                      : "text-primary-200 hover:bg-primary-800 hover:text-white"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="flex-1 leading-tight">{item.label}</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      isActive
                        ? "bg-primary-600 text-white"
                        : "bg-primary-800 text-primary-400"
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
        <p className="text-xs text-primary-400">
          v1.0 &mdash; Portal de Gestão
        </p>
      </div>
    </aside>
  );
}
