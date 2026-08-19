export type SeedSpec = {
  title: string;
  prompt: string;
  model: string;
  tags: string[];
  w: number;
  h: number;
  color: string;
};

export const SEED_ASSETS: SeedSpec[] = [
  {
    title: "하이키 뷰티",
    prompt:
      "High-key beauty portrait, porcelain skin, octa-dome softbox overhead, raised blacks, millennial pink wardrobe, shallow depth, clean seamless backdrop",
    model: "Midjourney v7",
    tags: ["high-key", "beauty"],
    w: 768,
    h: 1024,
    color: "#F2D6C9",
  },
  {
    title: "로우키 사이드",
    prompt:
      "Low-key cinematic side light, hard key from camera left, deep negative fill, charcoal wardrobe, Rembrandt triangle, film grain",
    model: "Seedream 4",
    tags: ["low-key", "cinematic"],
    w: 832,
    h: 1024,
    color: "#2B2420",
  },
  {
    title: "매크로 클로즈업",
    prompt:
      "Extreme macro close-up of an eye, specular catchlight, Pro-Mist filter bloom, shallow plane of focus, cool steel grade",
    model: "nano banana",
    tags: ["macro", "close-up"],
    w: 1024,
    h: 768,
    color: "#6E8B9A",
  },
  {
    title: "와이드 로케이션",
    prompt:
      "Wide establishing shot of a quiet street at blue hour, 24mm feel, practical neon, wet asphalt reflections, anamorphic flare",
    model: "Midjourney v7",
    tags: ["wide", "location"],
    w: 1280,
    h: 720,
    color: "#1C2A3A",
  },
  {
    title: "탑다운 테이블",
    prompt:
      "Top-down product still life, overhead softbox, linen texture, warm tungsten practical, negative space, editorial crop",
    model: "Seedream 4",
    tags: ["product", "top-down"],
    w: 1024,
    h: 1024,
    color: "#C4A882",
  },
  {
    title: "백라이트 실루엣",
    prompt:
      "Backlit silhouette in a doorway, rim light only, haze in the air, crushed blacks, long coat, 85mm compression",
    model: "Midjourney v7",
    tags: ["backlight", "silhouette"],
    w: 768,
    h: 1152,
    color: "#3A2A1C",
  },
  {
    title: "네온 스트리트",
    prompt:
      "Street fashion under magenta-cyan neon, wet cobblestone, motion blur cars, 35mm, high saturation with teal shadows",
    model: "nano banana",
    tags: ["street", "neon"],
    w: 896,
    h: 1152,
    color: "#6B1E4A",
  },
  {
    title: "소프트 윈도우",
    prompt:
      "Window-lit portrait, north light, sheer curtains as diffusion, lifted shadows, cream knit, quiet expression",
    model: "Midjourney v7",
    tags: ["window-light", "portrait"],
    w: 832,
    h: 1080,
    color: "#E6DCC8",
  },
  {
    title: "하프바디 에디토리얼",
    prompt:
      "Half-body editorial, 50mm, fashion stare, beauty dish with grid, glossy skin, muted olive backdrop",
    model: "Seedream 4",
    tags: ["editorial", "half-body"],
    w: 800,
    h: 1000,
    color: "#6A7058",
  },
  {
    title: "골든아워 프로필",
    prompt:
      "Golden hour profile, warm rim, 85mm, wind in hair, lens flare controlled, Kodak Portra grade",
    model: "Midjourney v7",
    tags: ["golden-hour", "profile"],
    w: 900,
    h: 1200,
    color: "#D9A066",
  },
  {
    title: "스튜디오 풀샷",
    prompt:
      "Full-length studio fashion, cyclorama, two-light setup, hard fashion key plus fill, long shadows, luxury vibe",
    model: "Seedream 4",
    tags: ["studio", "full-body"],
    w: 768,
    h: 1280,
    color: "#D8D2C8",
  },
  {
    title: "레인 글래스",
    prompt:
      "Through rain-streaked glass, city bokeh, cool cyan grade, shallow focus on droplets, melancholic mood",
    model: "nano banana",
    tags: ["glass", "rain"],
    w: 1024,
    h: 768,
    color: "#4A6670",
  },
  {
    title: "컬러젤 핑크",
    prompt:
      "Magenta gel key and cyan kicker, glossy makeup, high fashion, hard shadows, 1990s campaign energy",
    model: "Midjourney v7",
    tags: ["gel", "fashion"],
    w: 840,
    h: 1100,
    color: "#C45C8A",
  },
  {
    title: "미니멀 정물",
    prompt:
      "Minimal still life, one ceramic cup, soft overhead, generous negative space, desaturated beige, quiet composition",
    model: "Seedream 4",
    tags: ["still-life", "minimal"],
    w: 1024,
    h: 1024,
    color: "#D9D0C1",
  },
  {
    title: "오버숄더",
    prompt:
      "Over-the-shoulder composition, environmental portrait, 35mm, practical lamp warmth, dirty snow outside window",
    model: "Midjourney v7",
    tags: ["over-shoulder", "interior"],
    w: 1152,
    h: 768,
    color: "#8A6A4A",
  },
  {
    title: "더치앵글",
    prompt:
      "Dutch angle hallway, fluorescent green cast, tension in posture, 28mm distortion, grainy push-process look",
    model: "nano banana",
    tags: ["dutch-angle", "interior"],
    w: 800,
    h: 1200,
    color: "#3E4A3A",
  },
  {
    title: "스모키 림",
    prompt:
      "Smoke-filled set, strong rim from behind, volumetric beams, black wardrobe, cinematic contrast, 70mm",
    model: "Midjourney v7",
    tags: ["smoke", "rim-light"],
    w: 880,
    h: 1100,
    color: "#5A534C",
  },
  {
    title: "파스텔 뷰티",
    prompt:
      "Pastel beauty close-up, beauty dish, peach highlight, matte skin, analog grain, 1990s Korean magazine feel",
    model: "Seedream 4",
    tags: ["beauty", "pastel"],
    w: 900,
    h: 900,
    color: "#E8C4C4",
  },
  {
    title: "나이트 시티스케이프",
    prompt:
      "Night cityscape from a high floor, 24mm, long exposure traffic, cool moonlight mixed with sodium lamps",
    model: "Midjourney v7",
    tags: ["cityscape", "night"],
    w: 1280,
    h: 720,
    color: "#121826",
  },
  {
    title: "캐릭터 프론트",
    prompt:
      "Character sheet front view, even wrap lighting, neutral grey, consistent identity, clean edges, reference grade",
    model: "Seedream 4",
    tags: ["character", "reference"],
    w: 768,
    h: 1024,
    color: "#A8A39C",
  },
];
