import { useState, type FormEvent } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminAuth, MIN_PASSWORD_LENGTH } from "@/lib/admin-auth";

type Notice = { kind: "ok" | "error"; text: string } | null;

function Message({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return <p role={notice.kind === "error" ? "alert" : "status"} className={`text-sm font-medium ${notice.kind === "error" ? "text-destructive" : "text-primary"}`}>{notice.text}</p>;
}

export function AdminAccess() {
  const [admins, setAdmins] = useState(() => adminAuth.listAdmins());
  const [me] = useState(() => adminAuth.currentUser());
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
  const [adminNotice, setAdminNotice] = useState<Notice>(null);
  const refresh = () => setAdmins(adminAuth.listAdmins());

  async function onChangePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const next = String(data.get("next") ?? "");
    if (next !== String(data.get("confirm") ?? "")) { setPasswordNotice({ kind: "error", text: "Las contraseñas nuevas no coinciden." }); return; }
    const res = await adminAuth.changePassword(String(data.get("current") ?? ""), next);
    if (res.ok) { form.reset(); setPasswordNotice({ kind: "ok", text: "Contraseña actualizada." }); }
    else setPasswordNotice({ kind: "error", text: res.error });
  }

  async function onAddAdmin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const res = await adminAuth.createAdmin(String(data.get("username") ?? ""), String(data.get("password") ?? ""));
    if (res.ok) { form.reset(); refresh(); setAdminNotice({ kind: "ok", text: "Administrador añadido." }); }
    else setAdminNotice({ kind: "error", text: res.error });
  }

  function onRemove(username: string) {
    if (!window.confirm(`¿Eliminar el acceso de «${username}»?`)) return;
    const res = adminAuth.removeAdmin(username);
    if (res.ok) { refresh(); setAdminNotice({ kind: "ok", text: "Administrador eliminado." }); }
    else setAdminNotice({ kind: "error", text: res.error });
  }

  return (
    <div className="mt-8 space-y-6">
      <form onSubmit={onChangePassword} className="space-y-4 rounded-lg border bg-card p-5 shadow-sm sm:p-7">
        <div>
          <h2 className="text-lg font-bold">Tu contraseña</h2>
          <p className="mt-1 text-sm text-muted-foreground">{me ? `Sesión iniciada como ${me}.` : "Inicia sesión para cambiarla."}</p>
        </div>
        <Input name="current" type="password" required autoComplete="current-password" placeholder="Contraseña actual" />
        <Input name="next" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" placeholder={`Contraseña nueva (mínimo ${MIN_PASSWORD_LENGTH} caracteres)`} />
        <Input name="confirm" type="password" required autoComplete="new-password" placeholder="Repite la contraseña nueva" />
        <div className="flex items-center gap-3"><Button type="submit">Cambiar contraseña</Button><Message notice={passwordNotice} /></div>
      </form>

      <section className="space-y-4 rounded-lg border bg-card p-5 shadow-sm sm:p-7">
        <div>
          <h2 className="text-lg font-bold">Administradores</h2>
          <p className="mt-1 text-sm text-muted-foreground">Cada administrador entra con su propio usuario y contraseña.</p>
        </div>
        <ul className="divide-y rounded-md border">
          {admins.map((name) => (
            <li key={name} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="font-medium">{name}{name === me ? " (tú)" : ""}</span>
              {name !== me && <Button type="button" variant="ghost" size="icon" aria-label={`Eliminar a ${name}`} onClick={() => onRemove(name)}><Trash2 /></Button>}
            </li>
          ))}
        </ul>
        <form onSubmit={onAddAdmin} className="space-y-3 border-t pt-4">
          <Input name="username" required autoComplete="off" placeholder="Usuario nuevo" />
          <Input name="password" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" placeholder={`Contraseña (mínimo ${MIN_PASSWORD_LENGTH} caracteres)`} />
          <div className="flex items-center gap-3"><Button type="submit"><UserPlus /> Añadir administrador</Button><Message notice={adminNotice} /></div>
        </form>
      </section>
    </div>
  );
}
