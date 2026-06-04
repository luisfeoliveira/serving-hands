import { ImageResponse } from "next/og";

export const runtime = "edge";

const W = 1080;
const H = 1920;

const NAVY = "#1b3566";
const WHITE = "#ffffff";
const LIGHT_BLUE = "#e8eef8";


export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const name = searchParams.get("name") ?? "Voluntário";
  const specialty = searchParams.get("specialty") ?? "";
  const isProfessional = searchParams.get("isProfessional") === "true";

  async function fetchGoogleFont(family: string, weight: number): Promise<ArrayBuffer | null> {
    try {
      const css = await fetch(
        `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      ).then((r) => r.text());
      const url = css.match(/src: url\((.+?)\) format\(['"](?:opentype|truetype|woff2)['"]\)/)?.[1];
      return url ? fetch(url).then((r) => r.arrayBuffer()) : null;
    } catch {
      return null;
    }
  }

  const [logoRes, hashtagRes, bannerRes, regularFont, boldFont] = await Promise.all([
    fetch(`${origin}/logo.png`),
    fetch(`${origin}/hashtag.png`),
    fetch(`${origin}/banner.png`),
    fetchGoogleFont("Inclusive Sans", 400),
    fetchGoogleFont("Inter", 700),
  ]);
  const [logoBuffer, hashtagBuffer, bannerBuffer] = await Promise.all([
    logoRes.arrayBuffer(),
    hashtagRes.arrayBuffer(),
    bannerRes.arrayBuffer(),
  ]);

  function toDataUrl(buf: ArrayBuffer, mime = "image/png") {
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return `data:${mime};base64,${btoa(binary)}`;
  }

  const logoSrc = toDataUrl(logoBuffer);
  const hashtagSrc = toDataUrl(hashtagBuffer);
  const bannerSrc = toDataUrl(bannerBuffer);

  const genericBodyText = `Que ativou o modo voluntário e usou seus "superpoderes" para fazer a diferença na vida de quem mais precisava hoje.`;

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: WHITE,
          fontFamily: "'Inclusive Sans', sans-serif",
          padding: 0
        }}
      >
        {/* Top banner */}
        <img src={bannerSrc} alt="" style={{ display: "block", width: "100%", alignSelf: "stretch" }} />

        {/* Logo */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 80,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={220} height={220} alt="" style={{ objectFit: "contain" }} />
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            paddingLeft: 80,
            paddingRight: 80,
            marginTop: 64,
          }}
        >
          <span style={{ fontSize: 35, color: NAVY, lineHeight: 1.4, textAlign: "center" }}>
            {isProfessional
              ? "Nem todo herói usa capa... alguns usam o conhecimento para mudar o mundo!"
              : "Nem todo herói usa capa..."}
          </span>
          <span style={{ fontSize: 35, color: NAVY, lineHeight: 1.4, textAlign: "center" }}>
            Nosso superagradecimento a:
          </span>
        </div>

        {/* Name box */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: LIGHT_BLUE,
            borderRadius: 32,
            paddingLeft: 60,
            paddingRight: 60,
            paddingTop: 40,
            paddingBottom: 40,
            marginTop: 60,
            marginLeft: 80,
            marginRight: 80,
            width: W - 160,
          }}
        >
          <span
            style={{
              fontSize: 68,
              fontWeight: 700,
              fontFamily: "Inter, sans-serif",
              color: NAVY,
              textAlign: "center",
            }}
          >
            {name}
          </span>
        </div>

        {/* Body text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            paddingLeft: 80,
            paddingRight: 80,
            marginTop: 60,
          }}
        >
          <span style={{ fontSize: 35, color: NAVY, lineHeight: 1.5, textAlign: "center" }}>
            {isProfessional && specialty ? (
              <>
                {"Você vestiu a camisa, colocou o seu talento em "}
                <span style={{ fontWeight: 700, fontFamily: "Inter, sans-serif" }}>{specialty}</span>
                {" para jogo e fez o dia dessa comunidade muito mais feliz e saudável."}
              </>
            ) : (
              genericBodyText
            )}
          </span>
        </div>

        {/* Status */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            marginTop: 56,
          }}
        >
          <span style={{ fontSize: 35, fontWeight: 800, color: NAVY }}>
            Status da Missão:
          </span>
          <span style={{ fontSize: 35, color: NAVY, marginTop: 8 }}>
            Concluída com sucesso (e muito amor)!
          </span>
        </div>

        {/* Event info */}
        <div
          style={{
            display: "flex",
            marginTop: 48,
          }}
        >
          <span style={{ fontSize: 35, color: NAVY }}>
            06 de Junho | Escola Paulo Leivas Macalão
          </span>
        </div>

        {/* Hashtag image */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hashtagSrc} width={500} alt="" style={{ objectFit: "contain" }} />
        </div>

        {/* Bottom banner */}
        <img src={bannerSrc} alt="" style={{ display: "block", width: "100%", alignSelf: "stretch" }} />
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [
        ...(regularFont ? [{ name: "Inclusive Sans", data: regularFont, weight: 400 as const, style: "normal" as const }] : []),
        ...(boldFont ? [{ name: "Inter", data: boldFont, weight: 700 as const, style: "normal" as const }] : []),
      ],
    }
  );
}
