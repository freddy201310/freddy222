"use client";

import { useActionState, useState } from "react";
import { createEnrollment } from "@/actions/children";
import type { FormState } from "@/actions/auth";
import { Message } from "./Form";

type State = FormState;

const STEPS = {
  IOS: [
    "On the iPhone, install the Haven Kids app from the App Store.",
    "Open it and enter the code below. When iOS asks, approve Screen Time access with YOUR Apple ID or your Screen Time passcode — not your child's.",
    "Allow the web filter and location when asked. Haven then locks its own settings behind your Screen Time passcode, so the app and its permissions can't be removed.",
  ],
  ANDROID: [
    "On the Samsung or Android phone, install Haven Kids from Google Play.",
    "Open it and enter the code below. Approve the device-admin, usage-access and VPN prompts.",
    "Haven turns off developer options, guest users, and app cloning (Dual Messenger / Secure Folder) while it is installed, and blocks its own uninstall.",
  ],
};

export function ConnectPhone({ childId, childName }: { childId: string; childName: string }) {
  const [platform, setPlatform] = useState<"IOS" | "ANDROID">("IOS");
  const [state, action, pending] = useActionState<State, FormData>(createEnrollment, undefined);
  return (
    <details className="rounded-xl bg-ink-50 p-4">
      <summary className="cursor-pointer font-semibold">+ Connect a phone</summary>
      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="childId" value={childId} />
        <fieldset className="flex gap-2">
          <legend className="label">Which phone is it?</legend>
          {(["IOS", "ANDROID"] as const).map((p) => (
            <label key={p} className={`btn cursor-pointer border ${platform === p ? "border-haven-500 bg-white text-haven-800" : "border-ink-200 bg-white text-ink-600"}`}>
              <input type="radio" name="platform" value={p} checked={platform === p} onChange={() => setPlatform(p)} className="sr-only" />
              {p === "IOS" ? "iPhone" : "Samsung / Android"}
            </label>
          ))}
        </fieldset>
        {process.env.NEXT_PUBLIC_PHONE_APPS_LIVE !== "true" && (
          <p className="rounded-xl bg-warn-50 px-3.5 py-2 text-sm text-warn-700">The Haven Kids phone apps are coming soon. You can set up every rule now and they'll apply as soon as the phone connects.</p>
        )}
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink-700">
          {STEPS[platform].map((s) => <li key={s}>{s}</li>)}
        </ol>
        {state?.code ? (
          <div className="rounded-xl bg-white p-4 text-center">
            <p className="hint">Code for {childName}'s {platform === "IOS" ? "iPhone" : "phone"}</p>
            <p className="mt-1 font-mono text-3xl font-bold tracking-widest">{state.code}</p>
          </div>
        ) : null}
        <Message state={state} />
        <button className="btn-primary" disabled={pending}>{pending ? "Creating…" : state?.code ? "Make a new code" : "Get setup code"}</button>
      </form>
    </details>
  );
}
