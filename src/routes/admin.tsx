import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TurnosApp } from "@/components/turnos-app";
import { getAdminStatus, lockAdmin, unlockAdmin } from "@/lib/admin-gate.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Panel de administración | Turnos" },
    { name: "description", content: "Acceso privado para gestionar turnos, servicios y horarios." },
    { property: "og:title", content: "Panel de administración | Turnos" },
    { property: "og:description", content: "Acceso privado para gestionar turnos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  loader: () => getAdminStatus(),
  component: AdminPage,
});

function AdminPage() {
  const { unlocked } = Route.useLoaderData();
  const router = useRouter();
  const unlock = useServerFn(unlockAdmin);
  const lock = useServerFn(lockAdmin);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (unlocked) return <TurnosApp isAdmin onLogout={async () => { await lock(); await router.invalidate(); }} />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError("");
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    const res = await unlock({ data: { password } });
    setBusy(false);
    if (res.ok) await router.invalidate();
    else setError(res.missing ? "La contraseña del panel aún no está configurada." : "Contraseña incorrecta.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5 rounded-lg border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Lock size={22} /></div>
        <div><h1 className="text-2xl font-bold">Panel de administración</h1><p className="mt-1 text-sm text-muted-foreground">Introduce la contraseña para continuar.</p></div>
        <Input name="password" type="password" required autoFocus autoComplete="current-password" placeholder="Contraseña" />
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" className="h-11 w-full" disabled={busy}>{busy ? "Verificando..." : "Entrar"}</Button>
      </form>
    </div>
  );
}
