// Pure utility — no "use server" / "use client" — usable anywhere

import type { UserRole } from "@/lib/types";

export function roleToPath(role: UserRole): string {
  const map: Record<UserRole, string> = {
    recepcao:             "/reception",
    controlador:          "/controller",
    enfermagem:           "/nursing",
    medico:               "/doctor",
    odontologo:           "/dentistry",
    fonoaudiologo:        "/speech-therapy",
    psicologo:            "/psychology",
    assistente_social:    "/social-work",
    consultor_juridico:   "/legal",
    consultor_financeiro: "/finance",
    beleza:               "/beauty",
    bazar_controlador:    "/bazaar/controller",
    bazar_caixa:          "/bazaar/cashier",
    admin:                "/admin",
  };
  return map[role] ?? "/login";
}

export function roleLabel(role: UserRole): string {
  const map: Record<UserRole, string> = {
    recepcao:             "Recepção",
    controlador:          "Controlador",
    enfermagem:           "Enfermagem",
    medico:               "Médico",
    odontologo:           "Odontologista",
    fonoaudiologo:        "Fonoaudiólogo",
    psicologo:            "Psicólogo",
    assistente_social:    "Assistente Social",
    consultor_juridico:   "Consultor Jurídico",
    consultor_financeiro: "Consultor Financeiro",
    beleza:               "Beleza",
    bazar_controlador:    "Controlador do Bazar",
    bazar_caixa:          "Caixa do Bazar",
    admin:                "Administrador",
  };
  return map[role] ?? role;
}
