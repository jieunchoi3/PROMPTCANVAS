import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B0B0D",
          borderRadius: 40,
        }}
      >
        <div
          style={{
            width: 118,
            height: 118,
            borderRadius: 28,
            border: "10px solid #D9B382",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#D9B382",
            fontSize: 72,
            fontWeight: 700,
            fontFamily: "Georgia, 'Times New Roman', serif",
            letterSpacing: -2,
          }}
        >
          P
        </div>
      </div>
    ),
    { ...size },
  );
}
