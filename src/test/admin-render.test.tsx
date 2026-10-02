import { render, screen, fireEvent } from "@testing-library/react";
import { TurnosApp } from "@/components/turnos-app";

describe("admin panel", () => {
  it("shows the 8 menu items, greeting, metrics and quick actions", () => {
    render(<TurnosApp isAdmin onLogout={() => {}} />);
    for (const label of ["Inicio","Catálogo de servicios","Reservar turno","Agenda","Clientes","Servicios","Horarios","Configuración"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getByText("Hola, Administrador")).toBeTruthy();
    for (const m of ["Citas de hoy","Próximas citas","Servicios activos","Estado de agenda"]) expect(screen.getByText(m)).toBeTruthy();
    expect(screen.getByText("Accesos rápidos")).toBeTruthy();
    expect(screen.getByLabelText("Contactar al negocio por WhatsApp")).toBeTruthy();
  });
  it("navigates to Clientes view", () => {
    render(<TurnosApp isAdmin onLogout={() => {}} />);
    fireEvent.click(screen.getAllByText("Clientes")[0]);
    expect(screen.getByText("Personas que han reservado turnos en tu negocio.")).toBeTruthy();
  });
  it("public view has no admin trace", () => {
    render(<TurnosApp />);
    expect(screen.queryByText("Hola, Administrador")).toBeNull();
    expect(screen.queryByText("Cerrar sesión")).toBeNull();
  });
});
