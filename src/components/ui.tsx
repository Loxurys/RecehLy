import type { ReactNode } from "react";
import { X, type LucideIcon } from "lucide-react";
import type { Page } from "../lib/app-data";

export type NavigationItem = {
  id: Page;
  label: string;
  icon: LucideIcon;
};

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-xs transition sm:items-center sm:p-4"
    >
      <section className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:scale-95"
            title="Tutup"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function NavItem({
  item,
  active,
  onClick,
}: {
  item: NavigationItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-[0.99] ${
        active
          ? "bg-moss text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-ink"
      }`}
    >
      <Icon size={19} className={active ? "text-white" : "text-slate-400"} />
      {item.label}
    </button>
  );
}

export function Title({
  title,
  desc,
  action,
}: {
  title: string;
  desc: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl lg:text-3xl">
          {title}
        </h1>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{desc}</p>
      </div>
      {action && <div className="w-full sm:w-auto">{action}</div>}
    </div>
  );
}

export function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
  full = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  full?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${
        full ? "w-full" : ""
      } ${
        secondary
          ? "border border-line bg-white text-slate-700 hover:bg-slate-50"
          : "bg-moss text-white shadow-sm hover:bg-moss-dark"
      }`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
      {label}
      <div className="mt-1.5 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-line [&_input]:bg-white [&_input]:px-3.5 [&_input]:py-3 [&_input]:text-sm [&_input]:text-ink [&_input]:outline-none [&_input:focus]:border-moss [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-line [&_select]:bg-white [&_select]:px-3.5 [&_select]:py-3 [&_select]:text-sm [&_select]:text-ink [&_select]:outline-none [&_select:focus]:border-moss">
        {children}
      </div>
    </label>
  );
}