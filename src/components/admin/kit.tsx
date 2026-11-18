"use client";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const inputCls = "h-10 w-full rounded-sm border border-line bg-surface px-3 text-sm";
export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return <label className={cn("block text-xs uppercase tracking-[0.14em] text-mute", className)}>{label}<span className="mt-1 block normal-case tracking-normal text-ink">{children}</span>{hint && <span className="mt-1 block normal-case tracking-normal">{hint}</span>}</label>;
}
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cn(inputCls, p.className)} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cn(inputCls, p.className)} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cn("min-h-24 w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm", p.className)} />;
export function Errors({ errors }: { errors: string[] }) {
  return errors.length === 0 ? null : <ul role="alert" className="space-y-1 rounded-sm border border-danger bg-surface p-3 text-sm text-danger">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>;
}
export function Notice({ children }: { children: ReactNode }) { return <p role="status" className="rounded-sm border border-ok bg-surface p-3 text-sm text-ok">{children}</p>; }
export const Card = ({ title, children, id }: { title: string; children: ReactNode; id?: string }) => <section id={id} className="rounded-md border border-line bg-surface p-5"><h2 className="mb-4 font-display text-xl">{title}</h2>{children}</section>;
export const smallBtn = "inline-flex min-h-9 items-center justify-center rounded-sm border border-ink px-3 text-xs font-medium uppercase tracking-[0.12em] hover:bg-ink hover:text-paper disabled:opacity-40";
export const dangerBtn = "inline-flex min-h-9 items-center justify-center rounded-sm border border-danger px-3 text-xs font-medium uppercase tracking-[0.12em] text-danger hover:bg-danger hover:text-paper disabled:opacity-40";
