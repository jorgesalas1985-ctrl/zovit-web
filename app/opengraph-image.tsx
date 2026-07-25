import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ZOVIT — Solicita un servicio. Paga al aprobar.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background:
            "radial-gradient(circle at 12% 18%, rgba(124,58,237,0.45), transparent 42%), radial-gradient(circle at 88% 20%, rgba(14,165,233,0.35), transparent 40%), linear-gradient(135deg, #050816 0%, #0b1020 55%, #11182b 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              fontWeight: 800,
              background: "linear-gradient(90deg, #7c3aed, #2563eb, #06b6d4)",
            }}
          >
            Z
          </div>
          <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1 }}>ZOVIT</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 900 }}>
          <div style={{ fontSize: 54, fontWeight: 750, lineHeight: 1.15, letterSpacing: -1.5 }}>
            Solicita un servicio. Paga solo cuando el trabajo esté aprobado.
          </div>
          <div style={{ fontSize: 28, color: "#cbd5e1", lineHeight: 1.4 }}>
            Profesionales verificados en Chile. Pago protegido por Zovit.
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 22, color: "#94a3b8" }}>zovit.cl</div>
      </div>
    ),
    { ...size }
  );
}
