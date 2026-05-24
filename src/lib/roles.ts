// Pure utility — no "use server" / "use client" — usable anywhere

import type { UserRole } from "@/lib/types";

export function roleToPath(role: UserRole): string {
  const map: Record<UserRole, string> = {
    recepcao: "/recepcao",
    controlador: "/controlador",
    enfermagem: "/enfermagem",
    medico: "/medico",
    odontologo: "/odontologia",
    fonoaudiologo: "/fonoaudiologia",
    psicologo: "/psicologia",
    assistente_social: "/servico-social",
    consultor_juridico: "/consultoria-juridica",
    consultor_financeiro: "/consultoria-financeira",
    beleza: "/beleza",
    bazar_controlador: "/bazar/controlador",
    bazar_caixa: "/bazar/caixa",
    admin: "/admin",
  };
  return map[role] ?? "/login";
}

export function roleLabel(role: UserRole): string {
  const map: Record<UserRole, string> = {
    recepcao: "Recepção",
    controlador: "Controlador",
    enfermagem: "Enfermagem",
    medico: "Médico",
    odontologo: "Odontologista",
    fonoaudiologo: "Fonoaudiólogo",
    psicologo: "Psicólogo",
    assistente_social: "Assistente Social",
    consultor_juridico: "Consultor Jurídico",
    consultor_financeiro: "Consultor Financeiro",
    beleza: "Beleza",
    bazar_controlador: "Controlador do Bazar",
    bazar_caixa: "Caixa do Bazar",
    admin: "Administrador",
  };
  return map[role] ?? role;
}
