import { createFileRoute } from "@tanstack/react-router";
import { TurnosApp } from "@/components/turnos-app";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Reservar turnos | Soluciones Digitales Caimán" },
    { name: "description", content: "Consulta servicios disponibles y reserva tu turno en línea de forma rápida." },
    { property: "og:title", content: "Reservar turnos | Soluciones Digitales Caimán" },
    { property: "og:description", content: "Servicios, horarios y reservas de turnos para tu negocio." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <TurnosApp />,
});
