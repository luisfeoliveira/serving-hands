import { redirect } from "next/navigation";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { roleToPath } from "@/lib/roles";

const STATIONS = [
  { href: "/reception",         label: "Recepção",              description: "Cadastro e registro de serviços" },
  { href: "/controller",        label: "Controlador",           description: "Fila e atribuição de profissionais" },
  { href: "/nursing",           label: "Enfermagem",            description: "Triagem e sinais vitais" },
  { href: "/doctor",            label: "Médico",                description: "Atendimento médico" },
  { href: "/dentistry",         label: "Odontologia",           description: "Atendimento odontológico" },
  { href: "/speech-therapy",    label: "Fonoaudiologia",        description: "Atendimento fonoaudiológico" },
  { href: "/psychology",        label: "Psicologia",            description: "Atendimento psicológico" },
  { href: "/social-work",       label: "Serviço Social",        description: "Atendimento de assistência social" },
  { href: "/legal",             label: "Consultoria Jurídica",  description: "Atendimento jurídico" },
  { href: "/finance",           label: "Consultoria Financeira",description: "Atendimento financeiro" },
  { href: "/beauty",            label: "Beleza",                description: "Cabeleireiro e estética" },
  { href: "/bazaar/controller", label: "Controlador do Bazar",  description: "Entrada de pessoas no bazar" },
  { href: "/bazaar/cashier",    label: "Caixa do Bazar",        description: "Registro de vendas" },
];

export default async function EstacoesPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") {
    redirect(roleToPath(profile.role));
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Estações</h2>
        <p className="text-xs text-muted-foreground">Acesso direto a qualquer estação do evento.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {STATIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-xl border border-border bg-background px-4 py-4 hover:bg-muted/40 transition-colors space-y-1"
          >
            <p className="font-medium text-sm text-foreground">{s.label}</p>
            <p className="text-xs text-muted-foreground">{s.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
