"use client";

import { Activity, Bot, ChevronDown, CircleCheck, Coins, Gavel, Gift, LayoutDashboard, Menu, MessageSquareText, Save, Settings, ShieldCheck, TicketCheck, Users, X, Zap } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const navigation = [
  { label: "Overview", icon: LayoutDashboard }, { label: "Moderation", icon: Gavel },
  { label: "Tickets", icon: TicketCheck }, { label: "Economy", icon: Coins },
  { label: "Leveling", icon: Zap }, { label: "Giveaways", icon: Gift },
  { label: "Security", icon: ShieldCheck },
];
const modules = [
  { title: "Auto moderation", detail: "Blocks spam, links, and harmful content", icon: ShieldCheck, enabled: true },
  { title: "Welcome messages", detail: "Greets new members in #welcome", icon: MessageSquareText, enabled: true },
  { title: "Leveling", detail: "Rewards active community members", icon: Zap, enabled: true },
  { title: "Economy", detail: "Server currency and daily rewards", icon: Coins, enabled: false },
];
const events = [
  { text: "Mika reached level 24", time: "2 min ago", color: "bg-violet-400" },
  { text: "Spam message removed in #general", time: "12 min ago", color: "bg-cyan-400" },
  { text: "Ticket #184 was resolved", time: "31 min ago", color: "bg-emerald-400" },
  { text: "Giveaway reached 240 entries", time: "1 hour ago", color: "bg-amber-400" },
];

export default function Home() {
  const [active, setActive] = useState("Overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [states, setStates] = useState(() => Object.fromEntries(modules.map((module) => [module.title, module.enabled])));
  const [saved, setSaved] = useState(false);
  const selectView = (label: string) => { setActive(label); setMobileOpen(false); };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[270px] flex-col border-r border-white/10 bg-sidebar px-4 py-5 transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_30px_rgb(124_92_255/35%)]"><Bot className="size-5" /></div><div><p className="font-semibold tracking-tight">Command Center</p><p className="text-xs text-muted-foreground">Discord Suite</p></div></div>
          <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X /></Button>
        </div>
        <button className="mt-7 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:bg-white/[0.07]"><div className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 font-bold">N</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">Nightfall Community</p><p className="text-xs text-muted-foreground">12,842 members</p></div><ChevronDown className="size-4 text-muted-foreground" /></button>
        <nav className="mt-7 space-y-1" aria-label="Dashboard sections">
          {navigation.map(({ label, icon: Icon }) => <button key={label} onClick={() => selectView(label)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${active === label ? "bg-primary/15 text-violet-200" : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"}`}><Icon className="size-[18px]" />{label}</button>)}
        </nav>
        <div className="mt-auto space-y-1 border-t border-white/10 pt-4"><button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"><Settings className="size-[18px]" />Server settings</button><div className="mt-3 flex items-center gap-3 px-3 py-2"><div className="grid size-9 place-items-center rounded-full bg-cyan-300 font-semibold text-slate-950">BC</div><div><p className="text-sm font-medium">Ben Carter</p><p className="text-xs text-muted-foreground">Administrator</p></div></div></div>
      </aside>
      {mobileOpen && <button className="fixed inset-0 z-30 bg-black/70 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />}

      <section className="min-h-screen lg:pl-[270px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-border/70 bg-background/85 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu /></Button><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Nightfall Community</p><h1 className="text-xl font-semibold tracking-tight">{active}</h1></div></div>
          <div className="flex items-center gap-3"><div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-sm text-emerald-300 sm:flex"><span className="size-2 rounded-full bg-emerald-400" />Bot online</div><Button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1800); }} className="bg-violet-500 text-white hover:bg-violet-400"><Save />{saved ? "Saved" : "Save changes"}</Button></div>
        </header>
        <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9">
          <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Good evening, Ben.</h2><p className="mt-1 text-muted-foreground">Here’s what’s happening across your community.</p></div><p className="text-sm text-muted-foreground">Updated just now</p></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Members", value: "12,842", note: "+184 this week", icon: Users, tone: "text-violet-300 bg-violet-400/10" },
              { label: "Active today", value: "3,106", note: "24.2% of members", icon: Activity, tone: "text-cyan-300 bg-cyan-400/10" },
              { label: "Open tickets", value: "08", note: "2 awaiting staff", icon: TicketCheck, tone: "text-amber-300 bg-amber-400/10" },
              { label: "Actions blocked", value: "247", note: "+18 in 24 hours", icon: ShieldCheck, tone: "text-emerald-300 bg-emerald-400/10" },
            ].map(({ label, value, note, icon: Icon, tone }) => <article key={label} className="dashboard-card p-5"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{label}</p><span className={`rounded-lg p-2 ${tone}`}><Icon className="size-4" /></span></div><p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></article>)}
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
            <article className="dashboard-card min-h-[350px] p-5 sm:p-6"><div className="flex items-start justify-between"><div><h3 className="font-semibold">Member activity</h3><p className="mt-1 text-sm text-muted-foreground">Unique members active over the last 7 days</p></div><span className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground">7 days</span></div><div className="mt-10 flex h-[220px] items-end gap-3 sm:gap-5" aria-label="Member activity chart">{[58, 73, 64, 88, 76, 94, 82].map((height, index) => <div key={index} className="flex h-full flex-1 flex-col justify-end gap-2"><div className="group relative flex-1 rounded-t-md bg-white/[0.035]"><div className="absolute inset-x-0 bottom-0 rounded-t-md bg-gradient-to-t from-violet-600 to-cyan-400 transition-all group-hover:brightness-125" style={{ height: `${height}%` }} /></div><span className="text-center text-xs text-muted-foreground">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}</span></div>)}</div></article>
            <article className="dashboard-card p-5 sm:p-6"><div className="flex items-center justify-between"><div><h3 className="font-semibold">Recent activity</h3><p className="mt-1 text-sm text-muted-foreground">Live server events</p></div><Activity className="size-5 text-violet-300" /></div><div className="mt-6 space-y-1">{events.map((event) => <div key={event.text} className="flex gap-3 rounded-xl px-2 py-3.5 hover:bg-white/[0.03]"><span className={`mt-1.5 size-2 shrink-0 rounded-full ${event.color}`} /><div><p className="text-sm leading-5">{event.text}</p><p className="mt-1 text-xs text-muted-foreground">{event.time}</p></div></div>)}</div></article>
          </div>
          <article className="dashboard-card mt-4 p-5 sm:p-6"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><div><h3 className="font-semibold">Core modules</h3><p className="mt-1 text-sm text-muted-foreground">Control the systems running on your server.</p></div><div className="flex items-center gap-2 text-xs text-muted-foreground"><CircleCheck className="size-4 text-emerald-400" />All systems operational</div></div><div className="mt-5 grid gap-3 md:grid-cols-2">{modules.map(({ title, detail, icon: Icon }) => <div key={title} className="flex items-center gap-4 rounded-xl border border-border/70 bg-white/[0.02] p-4"><span className="rounded-lg bg-white/[0.05] p-2.5 text-violet-200"><Icon className="size-5" /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{title}</p><p className="truncate text-xs text-muted-foreground">{detail}</p></div><Switch checked={states[title]} onCheckedChange={(checked) => setStates((current) => ({ ...current, [title]: checked }))} aria-label={`Toggle ${title}`} className="data-[state=checked]:bg-violet-500" /></div>)}</div></article>
        </div>
      </section>
    </main>
  );
}
