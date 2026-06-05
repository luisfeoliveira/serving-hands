"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { FichaData } from "@/lib/types";

interface Props {
  data: FichaData;
  className?: string;
}

export function DownloadFichaButton({ data, className }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const [{ pdf }, { FichaDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./ficha-document"),
      ]);
      const blob = await pdf(<FichaDocument data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ficha-${data.person.name.replace(/\s+/g, "-")}-${data.event.date}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleDownload}
      disabled={loading}
      className={className}
    >
      {loading ? "Gerando PDF…" : "↓ Baixar Ficha"}
    </Button>
  );
}
