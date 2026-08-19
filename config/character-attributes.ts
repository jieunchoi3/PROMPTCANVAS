export type AttrOption = {
  value: string;
  label: string;
};

export type AttrDef = {
  key: string;
  label: string;
  multi: boolean;
  options: readonly AttrOption[];
};

export const CHARACTER_ATTRIBUTES: readonly AttrDef[] = [
  {
    key: "gender",
    label: "성별",
    multi: false,
    options: [
      { value: "female", label: "여성" },
      { value: "male", label: "남성" },
      { value: "androgynous", label: "중성" },
      { value: "non-human", label: "비인간" },
    ],
  },
  {
    key: "ethnicity",
    label: "외모",
    multi: false,
    options: [
      { value: "east-asian", label: "동양인" },
      { value: "white", label: "서양인" },
      { value: "black", label: "흑인" },
      { value: "southeast-asian", label: "동남아시아" },
      { value: "south-asian", label: "남아시아" },
      { value: "latina", label: "라틴" },
      { value: "middle-eastern", label: "중동" },
      { value: "mixed", label: "혼혈" },
    ],
  },
  {
    key: "age_band",
    label: "연령",
    multi: false,
    options: [
      { value: "child", label: "아동" },
      { value: "teen", label: "10대" },
      { value: "20s", label: "20대" },
      { value: "30s", label: "30대" },
      { value: "40s+", label: "40대+" },
    ],
  },
  {
    key: "hair",
    label: "헤어",
    multi: true,
    options: [
      { value: "short bob", label: "단발" },
      { value: "long straight", label: "생머리" },
      { value: "wavy", label: "웨이브" },
      { value: "curly", label: "컬" },
      { value: "bangs", label: "앞머리" },
      { value: "updo", label: "업스타일" },
      { value: "shaved", label: "숏컷" },
    ],
  },
  {
    key: "build",
    label: "체형",
    multi: false,
    options: [
      { value: "slim", label: "슬림" },
      { value: "athletic", label: "탄탄" },
      { value: "curvy", label: "글래머" },
      { value: "plus", label: "플러스" },
    ],
  },
  {
    key: "vibe",
    label: "무드",
    multi: true,
    options: [
      { value: "cute", label: "큐트" },
      { value: "editorial", label: "에디토리얼" },
      { value: "y2k", label: "Y2K" },
      { value: "ethereal", label: "에더리얼" },
      { value: "street", label: "스트릿" },
      { value: "luxury", label: "럭셔리" },
      { value: "sporty", label: "스포티" },
    ],
  },
  {
    key: "wardrobe",
    label: "의상",
    multi: true,
    options: [
      { value: "casual", label: "캐주얼" },
      { value: "formal", label: "포멀" },
      { value: "swim", label: "스윔" },
      { value: "sportswear", label: "스포츠" },
      { value: "traditional", label: "전통" },
      { value: "fantasy", label: "판타지" },
    ],
  },
];

export const PRIMARY_ATTR_KEYS = ["gender", "ethnicity"] as const;
