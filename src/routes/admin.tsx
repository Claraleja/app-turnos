import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TurnosApp } from "@/components/turnos-app";
import { adminAuth, MIN_PASSWORD_LENGTH } from "@/lib/admin-auth";

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
  component: AdminPage,
});

type Mode = "loading" | "setup" | "login" | "panel";

function AdminPage() {
  const [mode, setMode] = useState<Mode>("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // El acceso se comprueba en el navegador, así que se decide después del primer render.
  useEffect(() => {
    setMode(adminAuth.currentUser() ? "panel" : adminAuth.hasAdmins() ? "login" : "setup");
  }, []);

  if (mode === "loading") return <div className="min-h-screen bg-background" />;
  if (mode === "panel") return <TurnosApp isAdmin onLogout={() => { adminAuth.logout(); setError(""); setMode("login"); }} />;

  const isSetup = mode === "setup";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const username = String(form.get("username") ?? "");
    const password = String(form.get("password") ?? "");
    setError("");
    if (isSetup && password !== String(form.get("confirm") ?? "")) { setError("Las contraseñas no coinciden."); return; }
    setBusy(true);
    const res = isSetup ? await adminAuth.createAdmin(username, password) : await adminAuth.login(username, password);
    setBusy(false);
    if (res.ok) setMode("panel");
    else setError(res.error);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5 rounded-lg border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Lock size={22} /></div>
        <div>
          <h1 className="text-2xl font-bold">{isSetup ? "Crea tu acceso de administrador" : "Panel de administración"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSetup ? `Elige un usuario y una contraseña de al menos ${MIN_PASSWORD_LENGTH} caracteres.` : "Introduce tu usuario y contraseña para continuar."}
          </p>
        </div>
        <div className="space-y-3">
          <Input name="username" required autoFocus autoComplete="username" placeholder="Usuario" />
          <Input name="password" type="password" required minLength={isSetup ? MIN_PASSWORD_LENGTH : undefined} autoComplete={isSetup ? "new-password" : "current-password"} placeholder="Contraseña" />
          {isSetup && <Input name="confirm" type="password" required autoComplete="new-password" placeholder="Repite la contraseña" />}
        </div>
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" className="h-11 w-full" disabled={busy}>{busy ? "Verificando..." : isSetup ? "Crear acceso" : "Entrar"}</Button>
      </form>
    </div>
  );
}
