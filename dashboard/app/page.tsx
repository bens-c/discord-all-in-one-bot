"use client";

import { Activity, Bot, CircleAlert, Clock3, Hash, KeyRound, LayoutDashboard, Menu, Radio, RefreshCw, ShieldCheck, Sparkles, Tags, Users, Volume2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type DashboardData = {
  fetchedAt: string;
  bot: { name: string } | null;
  guild: {
    id: string;
    name: string;
    description: string | null;
    iconUrl: string | null;
    memberCount: number;
    onlineCount: number;
    boostCount: number;
    verificationLevel: number;
  };
  counts: { channels: number; textChannels: number; voiceChannels: number; categories: number; roles: number };
  channels: { id: string; name: string; type: number }[];
  roles: { id: string; name: string; color: number; managed: boolean }[];
  activity: { id: string; action: string; actor: string; reason: string | null }[];
  permissions: { auditLog: boolean };
};

const nav = [
  { label: "Overview", href: "#overview", icon: LayoutDashboard },
  { label: "Channels", href: "#channels", icon: Hash },
  { label: "Roles", href: "#roles", icon: Tags },
  { label: "Audit log", href: "#activity", icon: ShieldCheck },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function roleColor(value: number) {
  return value === 0 ? "#8f96a8" : `#${value.toString(16).padStart(6, "0")}`;
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [needsAccess, setNeedsAccess] = useState(false);

  const load = useCallback(async (key = accessKey) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store", headers: key ? { Authorization: `Bearer ${key}` } : undefined });
      const payload = await response.json() as DashboardData | { error?: string; code?: string };
      if (response.status === 401) { setNeedsAccess(true); return; }
      if (!response.ok) throw new Error("error" in payload ? payload.error : "Discord data could not be loaded.");
      setData(payload as DashboardData);
      setNeedsAccess(false);
    } catch (reason) {
      setData(null);
      setError(reason instanceof Error ? reason.message : "Discord data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [accessKey]);

  useEffect(() => {
    const controller = new AbortController();
    async function initialLoad() {
      try {
        const savedKey = window.sessionStorage.getItem("dashboard-access-key") ?? "";
        const response = await fetch("/api/dashboard", { cache: "no-store", signal: controller.signal, headers: savedKey ? { Authorization: `Bearer ${savedKey}` } : undefined });
        const payload = await response.json() as DashboardData | { error?: string; code?: string };
        if (response.status === 401) { setNeedsAccess(true); return; }
        if (!response.ok) throw new Error("error" in payload ? payload.error : "Discord data could not be loaded.");
        setAccessKey(savedKey);
        setData(payload as DashboardData);
      } catch (reason) {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Discord data could not be loaded.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void initialLoad();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const refresh = window.setInterval(() => {
      if (!needsAccess && document.visibilityState === "visible") void load();
    }, 30_000);
    return () => window.clearInterval(refresh);
  }, [load, needsAccess]);

  const unlock = async (key: string) => {
    window.sessionStorage.setItem("dashboard-access-key", key);
    setAccessKey(key);
    setNeedsAccess(false);
    await load(key);
  };

  const guildName = data?.guild.name ?? "Discord Command Center";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[270px] flex-col border-r border-white/10 bg-sidebar px-4 py-5 transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3"><div className="grid size-10 place-items-center overflow-hidden rounded-xl bg-primary bg-cover bg-center text-primary-foreground" style={data?.guild.iconUrl ? { backgroundImage: `url(${data.guild.iconUrl})` } : undefined}>{data?.guild.iconUrl ? null : <Bot className="size-5" />}</div><div className="min-w-0"><p className="max-w-40 truncate font-semibold tracking-tight">{guildName}</p><p className="text-xs text-muted-foreground">Live Discord data</p></div></div>
          <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X /></Button>
        </div>
        <nav className="mt-8 space-y-1" aria-label="Dashboard sections">{nav.map(({ label, href, icon: Icon }, index) => <a key={label} href={href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${index === 0 ? "bg-primary/15 text-violet-200" : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"}`}><Icon className="size-[18px]" />{label}</a>)}</nav>
        <div className="mt-auto rounded-xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center gap-2 text-sm"><span className={`size-2 rounded-full ${data ? "bg-emerald-400" : "bg-amber-400"}`} />{data ? "Discord connected" : "Configuration needed"}</div><p className="mt-2 text-xs leading-5 text-muted-foreground">{data?.bot ? `Authenticated as ${data.bot.name}` : "Server credentials stay on the server and are never sent to this page."}</p></div>
      </aside>
      {mobileOpen && <button className="fixed inset-0 z-30 bg-black/70 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />}

      <section className="min-h-screen lg:pl-[270px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-border/70 bg-background/85 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu /></Button><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Live server</p><h1 className="text-xl font-semibold tracking-tight">Overview</h1></div></div>
          <div className="flex items-center gap-3"><span className="hidden text-xs text-muted-foreground sm:inline">Auto-refresh · 30s</span><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />Refresh</Button></div>
        </header>

        <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9">
          {needsAccess ? <AccessState onUnlock={unlock} /> : loading && !data ? <LoadingDashboard /> : error ? <SetupState message={error} onRetry={() => load()} /> : data ? <LiveDashboard data={data} /> : null}
        </div>
      </section>
    </main>
  );
}

function AccessState({ onUnlock }: { onUnlock: (key: string) => Promise<void> }) {
  const [key, setKey] = useState("");
  return <section className="mx-auto mt-10 max-w-md rounded-2xl border border-violet-300/20 bg-violet-300/[0.05] p-6 sm:p-8"><div className="grid size-12 place-items-center rounded-xl bg-violet-300/10 text-violet-300"><KeyRound /></div><h2 className="mt-5 text-2xl font-semibold">Dashboard access</h2><p className="mt-2 leading-7 text-muted-foreground">Enter the access key configured for this dashboard.</p><form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); if (key) void onUnlock(key); }}><Input type="password" value={key} onChange={(event) => setKey(event.target.value)} placeholder="Access key" autoComplete="current-password" aria-label="Dashboard access key" className="h-11" /><Button type="submit" className="w-full" disabled={!key}><KeyRound />Open dashboard</Button></form><p className="mt-4 text-xs leading-5 text-muted-foreground">The key is kept only for this browser session.</p></section>;
}

function LoadingDashboard() {
  return <div aria-label="Loading live Discord data"><div className="mb-7 space-y-3"><Skeleton className="h-8 w-72 bg-white/10" /><Skeleton className="h-4 w-96 max-w-full bg-white/10" /></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-36 rounded-2xl bg-white/10" />)}</div><div className="mt-4 grid gap-4 xl:grid-cols-2"><Skeleton className="h-96 rounded-2xl bg-white/10" /><Skeleton className="h-96 rounded-2xl bg-white/10" /></div></div>;
}

function SetupState({ message, onRetry }: { message: string; onRetry: () => Promise<void> }) {
  return <section className="mx-auto mt-10 max-w-2xl rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-6 sm:p-8"><div className="grid size-12 place-items-center rounded-xl bg-amber-300/10 text-amber-300"><CircleAlert /></div><h2 className="mt-5 text-2xl font-semibold">Connect your Discord server</h2><p className="mt-2 leading-7 text-muted-foreground">{message}</p><div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4 font-mono text-sm leading-7"><p>DISCORD_TOKEN=</p><p>GUILD_ID=</p></div><p className="mt-4 text-sm leading-6 text-muted-foreground">Copy <code>dashboard/.env.example</code> to <code>dashboard/.env.local</code>, fill both values, and restart the dashboard. The bot needs access to the selected server; audit activity additionally requires View Audit Log.</p><Button className="mt-6" onClick={() => void onRetry()}><RefreshCw />Try again</Button></section>;
}

function LiveDashboard({ data }: { data: DashboardData }) {
  const stats = [
    { label: "Members", value: formatNumber(data.guild.memberCount), detail: "Total community size", icon: Users, tone: "text-violet-300 bg-violet-400/10" },
    { label: "Online now", value: formatNumber(data.guild.onlineCount), detail: data.guild.memberCount ? `${Math.round((data.guild.onlineCount / data.guild.memberCount) * 100)}% of members` : "Presence count", icon: Radio, tone: "text-emerald-300 bg-emerald-400/10" },
    { label: "Channels", value: formatNumber(data.counts.channels), detail: `${data.counts.textChannels} text · ${data.counts.voiceChannels} voice`, icon: Hash, tone: "text-cyan-300 bg-cyan-400/10" },
    { label: "Roles", value: formatNumber(data.counts.roles), detail: `${data.guild.boostCount} server boosts`, icon: Tags, tone: "text-amber-300 bg-amber-400/10" },
  ];
  return <>
    <section id="overview" className="scroll-mt-24"><div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{data.guild.name}</h2><p className="mt-1 text-muted-foreground">{data.guild.description || "Current server status from Discord."}</p></div><p className="flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4" />Updated {new Date(data.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ label, value, detail, icon: Icon, tone }) => <article key={label} className="dashboard-card p-5"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{label}</p><span className={`rounded-lg p-2 ${tone}`}><Icon className="size-4" /></span></div><p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></article>)}</div></section>
    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      <section id="channels" className="dashboard-card scroll-mt-24 p-5 sm:p-6"><div className="flex items-center justify-between"><div><h3 className="font-semibold">Channels</h3><p className="mt-1 text-sm text-muted-foreground">Current channel structure</p></div><Hash className="size-5 text-cyan-300" /></div><div className="mt-5 grid gap-2 sm:grid-cols-2">{data.channels.length ? data.channels.map((channel) => <div key={channel.id} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"><span className="text-muted-foreground">{channel.type === 2 || channel.type === 13 ? <Volume2 className="size-4" /> : <Hash className="size-4" />}</span><span className="truncate text-sm">{channel.name}</span></div>) : <p className="text-sm text-muted-foreground">No visible channels returned.</p>}</div></section>
      <section id="roles" className="dashboard-card scroll-mt-24 p-5 sm:p-6"><div className="flex items-center justify-between"><div><h3 className="font-semibold">Highest roles</h3><p className="mt-1 text-sm text-muted-foreground">Ordered by server hierarchy</p></div><Tags className="size-5 text-violet-300" /></div><div className="mt-5 flex flex-wrap gap-2">{data.roles.length ? data.roles.map((role) => <span key={role.id} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"><span className="size-2.5 rounded-full" style={{ backgroundColor: roleColor(role.color) }} />{role.name}{role.managed && <Sparkles className="size-3 text-muted-foreground" />}</span>) : <p className="text-sm text-muted-foreground">No roles returned.</p>}</div></section>
    </div>
    <section id="activity" className="dashboard-card mt-4 scroll-mt-24 p-5 sm:p-6"><div className="flex items-center justify-between"><div><h3 className="font-semibold">Recent server activity</h3><p className="mt-1 text-sm text-muted-foreground">Latest entries from the Discord audit log</p></div><Activity className="size-5 text-emerald-300" /></div>{data.activity.length ? <div className="mt-5 divide-y divide-white/[0.07]">{data.activity.map((entry) => <div key={entry.id} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">{entry.action}</p><p className="mt-1 text-xs text-muted-foreground">By {entry.actor}{entry.reason ? ` · ${entry.reason}` : ""}</p></div></div>)}</div> : <div className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 text-sm text-muted-foreground">{data.permissions.auditLog ? "No recent audit-log entries." : "Grant the bot View Audit Log to show recent server activity."}</div>}</section>
  </>;
}
