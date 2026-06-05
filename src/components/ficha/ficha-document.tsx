// NOTE: This file is imported dynamically (client-side only) — no "use client" directive needed.
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import type { FichaData, ToothSurface, SurfaceState, ToothCondition } from "@/lib/types";
import { SERVICE_LABELS, REGISTRATION_LABEL } from "@/lib/types";

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    color: "#1a1a1a",
  },
  // Header
  header: {
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#7c3aed",
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#7c3aed",
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 9,
    color: "#6b7280",
  },
  // Section
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 3,
  },
  row: {
    flexDirection: "row",
    marginBottom: 3,
  },
  label: {
    fontSize: 9,
    color: "#6b7280",
    width: 100,
    flexShrink: 0,
  },
  value: {
    fontSize: 10,
    flex: 1,
  },
  valueBold: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  // Vitals grid
  vitalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  vitalBox: {
    borderWidth: 0.5,
    borderColor: "#d1d5db",
    borderRadius: 4,
    padding: 6,
    minWidth: 90,
  },
  vitalLabel: {
    fontSize: 7,
    color: "#9ca3af",
    marginBottom: 2,
  },
  vitalValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  vitalUnit: {
    fontSize: 8,
    color: "#6b7280",
  },
  // Text block
  textBlock: {
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
    borderRadius: 3,
    padding: 8,
    backgroundColor: "#f9fafb",
    minHeight: 40,
  },
  textContent: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#374151",
  },
  // Odontogram list
  odontogramItem: {
    flexDirection: "row",
    marginBottom: 2,
  },
  odontogramTooth: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    width: 50,
    color: "#374151",
  },
  odontogramDetail: {
    fontSize: 9,
    flex: 1,
    color: "#6b7280",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 36,
    left: 40,
    right: 40,
  },
  footerDivider: {
    borderTopWidth: 0.5,
    borderTopColor: "#d1d5db",
    marginBottom: 10,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  signatureBlock: {
    alignItems: "center",
    width: 200,
  },
  signatureLine: {
    borderTopWidth: 0.5,
    borderTopColor: "#374151",
    width: 180,
    marginBottom: 4,
  },
  signatureName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  signatureReg: {
    fontSize: 8,
    color: "#6b7280",
  },
  footerNote: {
    fontSize: 7,
    color: "#9ca3af",
    textAlign: "right",
    maxWidth: 150,
  },
  // Referral badge
  referralBadge: {
    alignSelf: "flex-start",
    borderWidth: 0.5,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  referralText: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCPF(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const REFERRAL_LABELS: Record<string, string> = {
  resolved: "Resolvido no local",
  sus: "Encaminhar ao SUS",
  other: "Outro",
};

const REFERRAL_COLORS: Record<string, string> = {
  resolved: "#16a34a",
  sus: "#d97706",
  other: "#7c3aed",
};

const SURFACE_LABELS: Record<ToothSurface, string> = {
  V: "Vestibular",
  L: "Lingual/Palatina",
  M: "Mesial",
  D: "Distal",
  O: "Oclusal/Incisal",
};

const SURFACE_STATE_LABELS: Record<SurfaceState, string> = {
  carie: "Cárie",
  restauracao: "Restauração",
  restauracao_satisfatoria: "Restauração satisfatória",
};

const CONDITION_LABELS: Record<ToothCondition, string> = {
  extracao: "Extração indicada",
};

// ─── Document ─────────────────────────────────────────────────────────────────

export function FichaDocument({ data }: { data: FichaData }) {
  const regLabel = REGISTRATION_LABEL[data.professional.role];
  const serviceLabel = SERVICE_LABELS[data.serviceType] ?? data.serviceType;

  // Build odontogram text summary
  const odontogramEntries = data.odontogram
    ? Object.entries(data.odontogram)
        .filter(([, d]) => d && (d.condition || (d.surfaces && Object.keys(d.surfaces).length > 0)))
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([tooth, toothData]) => {
          if (!toothData) return null;
          const parts: string[] = [];
          if (toothData.condition) {
            parts.push(CONDITION_LABELS[toothData.condition] ?? toothData.condition);
          }
          const bySurface: Partial<Record<SurfaceState, ToothSurface[]>> = {};
          for (const [surf, state] of Object.entries(toothData.surfaces ?? {})) {
            if (!bySurface[state as SurfaceState]) bySurface[state as SurfaceState] = [];
            bySurface[state as SurfaceState]!.push(surf as ToothSurface);
          }
          for (const [state, surfs] of Object.entries(bySurface) as [SurfaceState, ToothSurface[]][]) {
            const surfNames = (surfs as ToothSurface[]).map(s => SURFACE_LABELS[s]).join(", ");
            parts.push(`${SURFACE_STATE_LABELS[state]}: ${surfNames}`);
          }
          return { tooth, detail: parts.join(" · ") };
        })
        .filter(Boolean)
    : [];

  const hasVitals =
    data.vitals &&
    (data.vitals.bp_systolic ||
      data.vitals.blood_glucose ||
      data.vitals.weight ||
      data.vitals.temperature);

  return (
    <Document>
      <Page size="A4" style={S.page}>
        {/* ── Header ── */}
        <View style={S.header}>
          <Text style={S.headerTitle}>Ficha de Atendimento — {serviceLabel}</Text>
          <Text style={S.headerSub}>
            {data.event.name} · {formatDate(data.event.date)}
            {data.completedAt ? `  ·  Atendido às ${new Date(data.completedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}
          </Text>
        </View>

        {/* ── Patient ── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Dados do Paciente</Text>
          <View style={S.row}>
            <Text style={S.label}>Nome</Text>
            <Text style={S.valueBold}>{data.person.name}</Text>
          </View>
          <View style={S.row}>
            <Text style={S.label}>Idade</Text>
            <Text style={S.value}>{data.person.age} anos</Text>
          </View>
          <View style={S.row}>
            <Text style={S.label}>CPF</Text>
            <Text style={S.value}>{formatCPF(data.person.cpf)}</Text>
          </View>
        </View>

        {/* ── Vitals ── */}
        {hasVitals && data.vitals && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Sinais Vitais</Text>
            <View style={S.vitalsGrid}>
              {data.vitals.bp_systolic && data.vitals.bp_diastolic && (
                <View style={S.vitalBox}>
                  <Text style={S.vitalLabel}>Pressão Arterial</Text>
                  <Text style={S.vitalValue}>
                    {data.vitals.bp_systolic}/{data.vitals.bp_diastolic}{" "}
                    <Text style={S.vitalUnit}>mmHg</Text>
                  </Text>
                </View>
              )}
              {data.vitals.blood_glucose && (
                <View style={S.vitalBox}>
                  <Text style={S.vitalLabel}>Glicemia</Text>
                  <Text style={S.vitalValue}>
                    {data.vitals.blood_glucose}{" "}
                    <Text style={S.vitalUnit}>mg/dL</Text>
                  </Text>
                </View>
              )}
              {data.vitals.weight && (
                <View style={S.vitalBox}>
                  <Text style={S.vitalLabel}>Peso</Text>
                  <Text style={S.vitalValue}>
                    {data.vitals.weight}{" "}
                    <Text style={S.vitalUnit}>kg</Text>
                  </Text>
                </View>
              )}
              {data.vitals.temperature && (
                <View style={S.vitalBox}>
                  <Text style={S.vitalLabel}>Temperatura</Text>
                  <Text style={S.vitalValue}>
                    {data.vitals.temperature}{" "}
                    <Text style={S.vitalUnit}>°C</Text>
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Chief complaint ── */}
        {data.chief_complaint && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Queixa Principal</Text>
            <View style={S.textBlock}>
              <Text style={S.textContent}>{data.chief_complaint}</Text>
            </View>
          </View>
        )}

        {/* ── Observação (medicina only) ── */}
        {data.observacao && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Observações Clínicas</Text>
            <View style={S.textBlock}>
              <Text style={S.textContent}>{data.observacao}</Text>
            </View>
          </View>
        )}

        {/* ── Odontogram ── */}
        {odontogramEntries.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Odontograma</Text>
            {odontogramEntries.map((item) =>
              item ? (
                <View key={item.tooth} style={S.odontogramItem}>
                  <Text style={S.odontogramTooth}>Dente {item.tooth}</Text>
                  <Text style={S.odontogramDetail}>{item.detail}</Text>
                </View>
              ) : null
            )}
          </View>
        )}

        {/* ── Referral ── */}
        {data.referral && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Encaminhamento</Text>
            <View style={[S.referralBadge, { borderColor: REFERRAL_COLORS[data.referral] ?? "#374151" }]}>
              <Text style={[S.referralText, { color: REFERRAL_COLORS[data.referral] ?? "#374151" }]}>
                {REFERRAL_LABELS[data.referral] ?? data.referral}
              </Text>
            </View>
            {data.referral_notes && (
              <View style={[S.textBlock, { marginTop: 6 }]}>
                <Text style={S.textContent}>{data.referral_notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Footer / Signature ── */}
        <View style={S.footer}>
          <View style={S.footerDivider} />
          <View style={S.footerRow}>
            <View style={S.signatureBlock}>
              <View style={S.signatureLine} />
              <Text style={S.signatureName}>{data.professional.name}</Text>
              {regLabel && data.professional.registration_number ? (
                <Text style={S.signatureReg}>
                  {regLabel} {data.professional.registration_number}
                </Text>
              ) : regLabel ? (
                <Text style={S.signatureReg}>{regLabel} — não informado</Text>
              ) : null}
            </View>
            <Text style={S.footerNote}>
              Documento gerado automaticamente.{"\n"}
              Ação Social · {data.event.name}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
