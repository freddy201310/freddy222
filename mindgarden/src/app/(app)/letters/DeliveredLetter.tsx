"use client";

import { useState, useTransition } from "react";
import { deleteLetter, openLetter } from "@/actions/letters";

export function DeliveredLetter(props: { id: string; subject: string; body: string; to: string; written: string; arrived: string; opened: boolean }) {
  const [open, setOpen] = useState(props.opened);
  const [, start] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); start(() => openLetter(props.id)); }}
        className="flex w-full items-center gap-4 rounded-3xl border-2 border-dashed border-dawn-300 bg-dawn-50 p-6 text-left transition hover:bg-dawn-100"
      >
        <span className="text-5xl">💌</span>
        <span>
          <span className="block text-xs uppercase tracking-widest text-dawn-500">New · {props.to}</span>
          <span className="block font-serif text-xl text-moss-900">{props.subject}</span>
          <span className="text-sm text-moss-600">Written {props.written}. Tap to open.</span>
        </span>
      </button>
    );
  }
  return (
    <article className="rounded-3xl border border-moss-100 bg-[#fffdf8] p-8 shadow-soft">
      <p className="text-xs uppercase tracking-widest text-moss-500">{props.to} · written {props.written} · arrived {props.arrived}</p>
      <h3 className="mt-2 text-2xl font-semibold">{props.subject}</h3>
      <div className="mt-4 whitespace-pre-wrap font-serif text-lg leading-relaxed text-moss-900">{props.body}</div>
      <form action={deleteLetter.bind(null, props.id)} className="mt-6">
        <button className="text-xs text-moss-400 hover:text-bark-700">Delete letter</button>
      </form>
    </article>
  );
}
