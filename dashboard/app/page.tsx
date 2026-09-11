"use client";

import { Activity, Banknote, Bot, CircleAlert, Clock3, Gavel, Hash, LayoutDashboard, LogIn, LogOut, Menu, Radio, RefreshCw, Send, Settings2, ShieldCheck, Sparkles, Tags, Users, Volume2, X, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type DashboardData = {
  fetchedAt: string;
  viewer: { id: string; name: string; avatarUrl: string | null; expiresAt: number };
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
  members: { id: string; name: string; username: string }[];
  activity: { id: string; action: string; actor: string; reason: string | null }[];
  permissions: { auditLog: boolean; memberDirectory: boolean; memberDirectoryStatus: number };
  botState: {
    available: boolean;
    config?: Record<string, boolean | string | null>;
    economy?: { id: string; total: number }[];
    levels?: { id: string; xp: number; messages: number }[];
    warnings?: number;
    activeGiveaways?: number;
  };
};

const nav = [
  { label: "Overview", href: "#overview", icon: LayoutDashboard },
  { label: "Controls", href: "#controls", icon: Zap },
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
  const [needsAccess, setNeedsAccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
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
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function initialLoad() {
      try {
        const response = await fetch("/api/dashboard", { cache: "no-store", signal: controller.signal });
        const payload = await response.json() as DashboardData | { error?: string; code?: string };
        if (response.status === 401) { setNeedsAccess(true); return; }
        if (!response.ok) throw new Error("error" in payload ? payload.error : "Discord data could not be loaded.");
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

  const guildName = data?.guild.name ?? "Discord Command Center";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[270px] flex-col border-r border-white/10 bg-sidebar px-4 py-5 transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3"><div className="grid size-10 place-items-center overflow-hidden rounded-xl bg-primary bg-cover bg-center text-primary-foreground" style={data?.guild.iconUrl ? { backgroundImage: `url(${data.guild.iconUrl})` } : undefined}>{data?.guild.iconUrl ? null : <Bot className="size-5" />}</div><div className="min-w-0"><p className="max-w-40 truncate font-semibold tracking-tight">{guildName}</p><p className="text-xs text-muted-foreground">Live Discord data</p></div></div>
          <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X /></Button>
        </div>
        <nav className="mt-8 space-y-1" aria-label="Dashboard sections">{nav.map(({ label, href, icon: Icon }, index) => <a key={label} href={href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${index === 0 ? "bg-primary/15 text-violet-200" : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"}`}><Icon className="size-[18px]" />{label}</a>)}</nav>
        <div className="mt-auto rounded-xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center gap-2 text-sm"><span className={`size-2 rounded-full ${data ? "bg-emerald-400" : "bg-amber-400"}`} />{data ? "Discord connected" : "Login required"}</div><p className="mt-2 text-xs leading-5 text-muted-foreground">{data ? `Signed in as ${data.viewer.name}` : "Sign in with Discord to access server administration data."}</p></div>
      </aside>
      {mobileOpen && <button className="fixed inset-0 z-30 bg-black/70 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />}

      <section className="min-h-screen lg:pl-[270px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-border/70 bg-background/85 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu /></Button><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Live server</p><h1 className="text-xl font-semibold tracking-tight">Overview</h1></div></div>
          <div className="flex items-center gap-3"><span className="hidden text-xs text-muted-foreground sm:inline">Auto-refresh · 30s</span>{data && <Button variant="ghost" size="icon" asChild aria-label="Sign out"><a href="/api/auth/logout"><LogOut /></a></Button>}<Button variant="outline" onClick={() => void load()} disabled={loading || needsAccess}><RefreshCw className={loading ? "animate-spin" : ""} />Refresh</Button></div>
        </header>

        <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9">
          {needsAccess ? <AccessState /> : loading && !data ? <LoadingDashboard /> : error ? <SetupState message={error} onRetry={() => load()} /> : data ? <LiveDashboard data={data} /> : null}
        </div>
      </section>
    </main>
  );
}

function AccessState() {
  return <section className="mx-auto mt-10 max-w-md rounded-2xl border border-violet-300/20 bg-violet-300/[0.05] p-6 sm:p-8"><div className="grid size-12 place-items-center rounded-xl bg-violet-300/10 text-violet-300"><Bot /></div><h2 className="mt-5 text-2xl font-semibold">Sign in with Discord</h2><p className="mt-2 leading-7 text-muted-foreground">Use your Discord account to access this server dashboard. Administrator or Manage Server permission is required.</p><Button className="mt-6 w-full bg-[#5865F2] text-white hover:bg-[#4752c4]" asChild><a href="/api/auth/discord"><LogIn />Continue with Discord</a></Button><p className="mt-4 text-xs leading-5 text-muted-foreground">The app requests only your identity and server list. Your Discord password is never shared with this website.</p></section>;
}

function LoadingDashboard() {
  return <div aria-label="Loading live Discord data"><div className="mb-7 space-y-3"><Skeleton className="h-8 w-72 bg-white/10" /><Skeleton className="h-4 w-96 max-w-full bg-white/10" /></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-36 rounded-2xl bg-white/10" />)}</div><div className="mt-4 grid gap-4 xl:grid-cols-2"><Skeleton className="h-96 rounded-2xl bg-white/10" /><Skeleton className="h-96 rounded-2xl bg-white/10" /></div></div>;
}

function SetupState({ message, onRetry }: { message: string; onRetry: () => Promise<void> }) {
  return <section className="mx-auto mt-10 max-w-2xl rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-6 sm:p-8"><div className="grid size-12 place-items-center rounded-xl bg-amber-300/10 text-amber-300"><CircleAlert /></div><h2 className="mt-5 text-2xl font-semibold">Connect your Discord application</h2><p className="mt-2 leading-7 text-muted-foreground">{message}</p><p className="mt-4 text-sm leading-6 text-muted-foreground">Configure the Discord OAuth and bot environment variables on Render. The bot needs access to the selected server; audit activity additionally requires View Audit Log.</p><Button className="mt-6" onClick={() => void onRetry()}><RefreshCw />Try again</Button></section>;
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
    <ControlCenter data={data} />
    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      <section id="channels" className="dashboard-card scroll-mt-24 p-5 sm:p-6"><div className="flex items-center justify-between"><div><h3 className="font-semibold">Channels</h3><p className="mt-1 text-sm text-muted-foreground">Current channel structure</p></div><Hash className="size-5 text-cyan-300" /></div><div className="mt-5 grid gap-2 sm:grid-cols-2">{data.channels.length ? data.channels.map((channel) => <div key={channel.id} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"><span className="text-muted-foreground">{channel.type === 2 || channel.type === 13 ? <Volume2 className="size-4" /> : <Hash className="size-4" />}</span><span className="truncate text-sm">{channel.name}</span></div>) : <p className="text-sm text-muted-foreground">No visible channels returned.</p>}</div></section>
      <section id="roles" className="dashboard-card scroll-mt-24 p-5 sm:p-6"><div className="flex items-center justify-between"><div><h3 className="font-semibold">Highest roles</h3><p className="mt-1 text-sm text-muted-foreground">Ordered by server hierarchy</p></div><Tags className="size-5 text-violet-300" /></div><div className="mt-5 flex flex-wrap gap-2">{data.roles.length ? data.roles.map((role) => <span key={role.id} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"><span className="size-2.5 rounded-full" style={{ backgroundColor: roleColor(role.color) }} />{role.name}{role.managed && <Sparkles className="size-3 text-muted-foreground" />}</span>) : <p className="text-sm text-muted-foreground">No roles returned.</p>}</div></section>
    </div>
    <section id="activity" className="dashboard-card mt-4 scroll-mt-24 p-5 sm:p-6"><div className="flex items-center justify-between"><div><h3 className="font-semibold">Recent server activity</h3><p className="mt-1 text-sm text-muted-foreground">Latest entries from the Discord audit log</p></div><Activity className="size-5 text-emerald-300" /></div>{data.activity.length ? <div className="mt-5 divide-y divide-white/[0.07]">{data.activity.map((entry) => <div key={entry.id} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">{entry.action}</p><p className="mt-1 text-xs text-muted-foreground">By {entry.actor}{entry.reason ? ` · ${entry.reason}` : ""}</p></div></div>)}</div> : <div className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 text-sm text-muted-foreground">{data.permissions.auditLog ? "No recent audit-log entries." : "Grant the bot View Audit Log to show recent server activity."}</div>}</section>
  </>;
}

type ActionPayload = Record<string, string | number | boolean | null>;

function Picker({ value, onChange, placeholder, items }: { value: string; onChange: (value: string) => void; placeholder: string; items: { id: string; name: string }[] }) {
  return <Select value={value || undefined} onValueChange={onChange}><SelectTrigger className="w-full"><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent>{items.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>;
}

function MemberPicker({ value, onChange, members, directoryAvailable }: { value: string; onChange: (value: string) => void; members: DashboardData["members"]; directoryAvailable: boolean }) {
  return <div className="space-y-2"><Picker value={value} onChange={onChange} placeholder="Mitglied wählen" items={members} /><Input value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 20))} inputMode="numeric" pattern="[0-9]*" placeholder="Oder Discord Nutzer-ID eingeben" aria-label="Discord Nutzer-ID" />{!directoryAvailable && <p className="text-xs leading-5 text-amber-300">Discord liefert keine vollständige Mitgliederliste. Aktiviere im Developer Portal den „Server Members Intent“ oder gib die Nutzer-ID ein.</p>}</div>;
}

function DangerAction({ label, description, disabled, onConfirm }: { label: string; description: string; disabled?: boolean; onConfirm: () => void }) {
  return <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" disabled={disabled}>{label}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{label} wirklich ausführen?</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Abbrechen</AlertDialogCancel><AlertDialogAction onClick={onConfirm}>Bestätigen</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}

function ControlCenter({ data }: { data: DashboardData }) {
  const textChannels = data.channels.filter((channel) => channel.type === 0 || channel.type === 5);
  const categories = data.channels.filter((channel) => channel.type === 4);
  const selectableRoles = data.roles.filter((role) => !role.managed);
  const cfg = data.botState.config || {};
  const [memberId, setMemberId] = useState(data.members[0]?.id || "");
  const [channelId, setChannelId] = useState(textChannels[0]?.id || "");
  const [roleId, setRoleId] = useState(selectableRoles[0]?.id || "");
  const [reason, setReason] = useState("");
  const [content, setContent] = useState("");
  const [amount, setAmount] = useState(10);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [config, setConfig] = useState({
    welcomeEnabled: Boolean(cfg.welcomeEnabled), antiinvite: Boolean(cfg.antiinvite), antispam: cfg.antispam !== false,
    welcomeChannelId: String(cfg.welcomeChannelId || ""), logChannelId: String(cfg.logChannelId || ""), autoroleId: String(cfg.autoroleId || ""),
    ticketCategoryId: String(cfg.ticketCategoryId || ""), supportRoleId: String(cfg.supportRoleId || ""),
  });

  async function run(action: string, extra: ActionPayload = {}) {
    setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, memberId, channelId, roleId, reason, amount, ...extra }) });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "Aktion fehlgeschlagen.");
      setNotice({ ok: true, text: result.message || "Aktion erfolgreich." });
      if (action === "announce") setContent("");
    } catch (error) { setNotice({ ok: false, text: error instanceof Error ? error.message : "Aktion fehlgeschlagen." }); }
    finally { setBusy(false); }
  }

  return <section id="controls" className="dashboard-card mt-4 scroll-mt-24 overflow-hidden p-5 sm:p-6">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><Zap className="size-5 text-violet-300" /><h3 className="text-lg font-semibold">Server Controls</h3></div><p className="mt-1 text-sm text-muted-foreground">Moderation und Bot-Funktionen direkt aus dem Dashboard.</p></div><span className={`rounded-full px-3 py-1 text-xs ${data.botState.available ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>{data.botState.available ? "MongoDB verbunden" : "MongoDB für Bot-Daten fehlt"}</span></div>
    {notice && <div role="status" className={`mt-4 rounded-xl border p-3 text-sm ${notice.ok ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200" : "border-red-400/20 bg-red-400/[0.06] text-red-200"}`}>{notice.text}</div>}
    <Tabs defaultValue="moderation" className="mt-5"><TabsList className="h-auto w-full flex-wrap justify-start"><TabsTrigger value="moderation"><Gavel />Moderation</TabsTrigger><TabsTrigger value="channels"><Send />Kanäle</TabsTrigger><TabsTrigger value="economy"><Banknote />Economy & XP</TabsTrigger><TabsTrigger value="settings"><Settings2 />Bot-Setup</TabsTrigger></TabsList>
      <TabsContent value="moderation" className="mt-5"><div className="grid gap-4 lg:grid-cols-2"><div className="control-panel"><h4 className="font-medium">Mitglied auswählen</h4><div className="mt-3 space-y-3"><MemberPicker value={memberId} onChange={setMemberId} members={data.members} directoryAvailable={data.permissions.memberDirectory} /><Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Grund für das Audit-Log" maxLength={400} /><div className="flex flex-wrap gap-2"><Button disabled={busy || !memberId} onClick={() => void run("timeout", { minutes: amount })}>Timeout</Button><Button variant="outline" disabled={busy || !memberId} onClick={() => void run("untimeout")}>Timeout entfernen</Button><DangerAction label="Kicken" description="Das Mitglied wird vom Server entfernt." disabled={busy || !memberId} onConfirm={() => void run("kick")} /><DangerAction label="Bannen" description="Das Mitglied wird gebannt und die letzten Nachrichten werden gelöscht." disabled={busy || !memberId} onConfirm={() => void run("ban")} /></div><label className="field-label">Timeout-Minuten<Input type="number" min={1} max={40320} value={amount} onChange={(event) => setAmount(Number(event.target.value))} /></label></div></div><div className="control-panel"><h4 className="font-medium">Rollenverwaltung</h4><div className="mt-3 space-y-3"><MemberPicker value={memberId} onChange={setMemberId} members={data.members} directoryAvailable={data.permissions.memberDirectory} /><Picker value={roleId} onChange={setRoleId} placeholder="Rolle wählen" items={selectableRoles} /><div className="flex flex-wrap gap-2"><Button disabled={busy || !memberId || !roleId} onClick={() => void run("role-add")}>Rolle hinzufügen</Button><Button variant="outline" disabled={busy || !memberId || !roleId} onClick={() => void run("role-remove")}>Rolle entfernen</Button></div></div></div></div></TabsContent>
      <TabsContent value="channels" className="mt-5"><div className="grid gap-4 lg:grid-cols-2"><div className="control-panel"><h4 className="font-medium">Nachricht senden</h4><div className="mt-3 space-y-3"><Picker value={channelId} onChange={setChannelId} placeholder="Textkanal wählen" items={textChannels} /><Textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Ankündigung oder Nachricht" maxLength={1900} /><Button disabled={busy || !channelId || !content.trim()} onClick={() => void run("announce", { content })}><Send />Senden</Button></div></div><div className="control-panel"><h4 className="font-medium">Kanal verwalten</h4><div className="mt-3 space-y-3"><Picker value={channelId} onChange={setChannelId} placeholder="Textkanal wählen" items={textChannels} /><label className="field-label">Anzahl / Slowmode-Sekunden<Input type="number" min={0} max={21600} value={amount} onChange={(event) => setAmount(Number(event.target.value))} /></label><div className="flex flex-wrap gap-2"><Button disabled={busy || !channelId} onClick={() => void run("slowmode", { seconds: amount })}>Slowmode setzen</Button><Button variant="outline" disabled={busy || !channelId} onClick={() => void run("lock")}>Sperren</Button><Button variant="outline" disabled={busy || !channelId} onClick={() => void run("unlock")}>Entsperren</Button><DangerAction label="Nachrichten löschen" description={`Bis zu ${Math.min(100, amount)} aktuelle Nachrichten werden unwiderruflich gelöscht.`} disabled={busy || !channelId} onConfirm={() => void run("clear")} /></div></div></div></div></TabsContent>
      <TabsContent value="economy" className="mt-5"><div className="grid gap-4 lg:grid-cols-2"><div className="control-panel"><h4 className="font-medium">Coins und XP anpassen</h4><div className="mt-3 space-y-3"><MemberPicker value={memberId} onChange={setMemberId} members={data.members} directoryAvailable={data.permissions.memberDirectory} /><Input type="number" value={amount} onChange={(event) => setAmount(Number(event.target.value))} placeholder="Positiv hinzufügen, negativ abziehen" /><div className="flex gap-2"><Button disabled={busy || !memberId || !data.botState.available} onClick={() => void run("economy-adjust")}>Coins ändern</Button><Button variant="outline" disabled={busy || !memberId || !data.botState.available} onClick={() => void run("xp-adjust")}>XP ändern</Button></div></div></div><div className="control-panel"><h4 className="font-medium">Bot-Daten</h4><div className="mt-3 grid grid-cols-3 gap-3"><Metric label="Warnungen" value={data.botState.warnings || 0} /><Metric label="Giveaways" value={data.botState.activeGiveaways || 0} /><Metric label="Profile" value={(data.botState.levels?.length || 0)} /></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><Ranking title="Top Coins" rows={(data.botState.economy || []).map((item) => ({ id: item.id, value: `${formatNumber(item.total)} 🪙` }))} members={data.members} /><Ranking title="Top XP" rows={(data.botState.levels || []).map((item) => ({ id: item.id, value: `${formatNumber(item.xp)} XP` }))} members={data.members} /></div></div></div></TabsContent>
      <TabsContent value="settings" className="mt-5"><div className="grid gap-4 lg:grid-cols-2"><div className="control-panel space-y-4"><Toggle label="Willkommensnachricht" checked={config.welcomeEnabled} onCheckedChange={(checked) => setConfig({ ...config, welcomeEnabled: checked })} /><Toggle label="Anti-Invite" checked={config.antiinvite} onCheckedChange={(checked) => setConfig({ ...config, antiinvite: checked })} /><Toggle label="Anti-Spam" checked={config.antispam} onCheckedChange={(checked) => setConfig({ ...config, antispam: checked })} /></div><div className="control-panel space-y-3"><Picker value={config.welcomeChannelId} onChange={(value) => setConfig({ ...config, welcomeChannelId: value })} placeholder="Willkommenskanal" items={textChannels} /><Picker value={config.logChannelId} onChange={(value) => setConfig({ ...config, logChannelId: value })} placeholder="Modlog-Kanal" items={textChannels} /><Picker value={config.autoroleId} onChange={(value) => setConfig({ ...config, autoroleId: value })} placeholder="Autorole" items={selectableRoles} /><Picker value={config.ticketCategoryId} onChange={(value) => setConfig({ ...config, ticketCategoryId: value })} placeholder="Ticket-Kategorie" items={categories} /><Picker value={config.supportRoleId} onChange={(value) => setConfig({ ...config, supportRoleId: value })} placeholder="Support-Rolle" items={selectableRoles} /><Button disabled={busy || !data.botState.available} onClick={() => void run("save-config", config)}>Konfiguration speichern</Button>{!data.botState.available && <p className="text-xs leading-5 text-amber-300">Trage dieselbe MONGODB_URI bei Render und auf dem Pi ein, damit Einstellungen synchronisiert werden.</p>}</div></div></TabsContent>
    </Tabs>
  </section>;
}

function Toggle({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) { return <label className="flex items-center justify-between gap-4 text-sm"><span>{label}</span><Switch checked={checked} onCheckedChange={onCheckedChange} /></label>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-white/[0.04] p-3 text-center"><p className="text-xl font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>; }
function Ranking({ title, rows, members }: { title: string; rows: { id: string; value: string }[]; members: DashboardData["members"] }) { return <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p><div className="mt-2 space-y-2">{rows.slice(0, 5).map((row, index) => <div key={row.id} className="flex justify-between gap-2 text-sm"><span className="truncate">{index + 1}. {members.find((member) => member.id === row.id)?.name || row.id}</span><span className="text-muted-foreground">{row.value}</span></div>)}{!rows.length && <p className="text-sm text-muted-foreground">Keine Daten</p>}</div></div>; }
