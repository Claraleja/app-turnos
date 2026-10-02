import { beforeEach, describe, expect, it } from "vitest";
import { adminAuth } from "@/lib/admin-auth";

describe("admin auth (local)", () => {
  beforeEach(() => window.localStorage.clear());

  it("starts without admins and creates the first one with a session", async () => {
    expect(adminAuth.hasAdmins()).toBe(false);
    expect((await adminAuth.createAdmin("Clinica", "contraseña-1")).ok).toBe(true);
    expect(adminAuth.hasAdmins()).toBe(true);
    expect(adminAuth.currentUser()).toBe("clinica");
  });

  it("never stores the password in plain text", async () => {
    await adminAuth.createAdmin("clinica", "contraseña-1");
    const raw = JSON.stringify({ ...window.localStorage });
    expect(raw).not.toContain("contraseña-1");
  });

  it("rejects short passwords and bad usernames", async () => {
    expect((await adminAuth.createAdmin("clinica", "corta")).ok).toBe(false);
    expect((await adminAuth.createAdmin("a", "contraseña-1")).ok).toBe(false);
  });

  it("logs in with the right password only, and logs out", async () => {
    await adminAuth.createAdmin("clinica", "contraseña-1");
    adminAuth.logout();
    expect(adminAuth.currentUser()).toBeNull();
    expect((await adminAuth.login("clinica", "otra-clave-1")).ok).toBe(false);
    expect((await adminAuth.login("nadie", "contraseña-1")).ok).toBe(false);
    expect((await adminAuth.login("CLINICA", "contraseña-1")).ok).toBe(true);
    expect(adminAuth.currentUser()).toBe("clinica");
  });

  it("lets each admin have their own password and change it", async () => {
    await adminAuth.createAdmin("ana", "clave-de-ana-1");
    await adminAuth.createAdmin("luis", "clave-de-luis-1");
    expect(adminAuth.listAdmins()).toEqual(["ana", "luis"]);
    expect((await adminAuth.changePassword("incorrecta", "nueva-clave-1")).ok).toBe(false);
    expect((await adminAuth.changePassword("clave-de-ana-1", "nueva-clave-1")).ok).toBe(true);
    adminAuth.logout();
    expect((await adminAuth.login("ana", "clave-de-ana-1")).ok).toBe(false);
    expect((await adminAuth.login("ana", "nueva-clave-1")).ok).toBe(true);
    expect((await adminAuth.login("luis", "clave-de-luis-1")).ok).toBe(true);
  });

  it("keeps at least one admin and blocks removing yourself", async () => {
    await adminAuth.createAdmin("ana", "clave-de-ana-1");
    expect(adminAuth.removeAdmin("ana").ok).toBe(false);
    await adminAuth.createAdmin("luis", "clave-de-luis-1");
    expect(adminAuth.removeAdmin("ana").ok).toBe(false);
    expect(adminAuth.removeAdmin("luis").ok).toBe(true);
  });
});
