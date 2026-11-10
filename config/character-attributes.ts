import { t } from "@/lib/locale";

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
    label: t("성별", "Gender"),
    multi: false,
    options: [
      { value: "female", label: t("여성", "Female") },
      { value: "male", label: t("남성", "Male") },
      { value: "androgynous", label: t("중성", "Androgynous") },
      { value: "non-human", label: t("비인간", "Non-human") },
    ],
  },
  {
    key: "ethnicity",
    label: t("외모", "Look"),
    multi: false,
    options: [
      { value: "east-asian", label: t("동양인", "East Asian") },
      { value: "white", label: t("서양인", "White") },
      { value: "black", label: t("흑인", "Black") },
      { value: "southeast-asian", label: t("동남아시아", "Southeast Asian") },
      { value: "south-asian", label: t("남아시아", "South Asian") },
      { value: "latina", label: t("라틴", "Latina") },
      { value: "middle-eastern", label: t("중동", "Middle Eastern") },
      { value: "mixed", label: t("혼혈", "Mixed") },
    ],
  },
  {
    key: "age_band",
    label: t("연령", "Age"),
    multi: false,
    options: [
      { value: "child", label: t("아동", "Child") },
      { value: "teen", label: t("10대", "Teens") },
      { value: "20s", label: t("20대", "20s") },
      { value: "30s", label: t("30대", "30s") },
      { value: "40s+", label: t("40대+", "40s+") },
    ],
  },
  {
    key: "hair",
    label: t("헤어", "Hair"),
    multi: true,
    options: [
      { value: "short bob", label: t("단발", "Short bob") },
      { value: "long straight", label: t("생머리", "Long straight") },
      { value: "wavy", label: t("웨이브", "Wavy") },
      { value: "curly", label: t("컬", "Curly") },
      { value: "bangs", label: t("앞머리", "Bangs") },
      { value: "updo", label: t("업스타일", "Updo") },
      { value: "shaved", label: t("숏컷", "Short cut") },
    ],
  },
  {
    key: "build",
    label: t("체형", "Build"),
    multi: false,
    options: [
      { value: "slim", label: t("슬림", "Slim") },
      { value: "athletic", label: t("탄탄", "Athletic") },
      { value: "curvy", label: t("글래머", "Curvy") },
      { value: "plus", label: t("플러스", "Plus") },
    ],
  },
  {
    key: "vibe",
    label: t("무드", "Mood"),
    multi: true,
    options: [
      { value: "cute", label: t("큐트", "Cute") },
      { value: "editorial", label: t("에디토리얼", "Editorial") },
      { value: "y2k", label: "Y2K" },
      { value: "ethereal", label: t("에더리얼", "Ethereal") },
      { value: "street", label: t("스트릿", "Street") },
      { value: "luxury", label: t("럭셔리", "Luxury") },
      { value: "sporty", label: t("스포티", "Sporty") },
    ],
  },
  {
    key: "wardrobe",
    label: t("의상", "Wardrobe"),
    multi: true,
    options: [
      { value: "casual", label: t("캐주얼", "Casual") },
      { value: "formal", label: t("포멀", "Formal") },
      { value: "swim", label: t("스윔", "Swimwear") },
      { value: "sportswear", label: t("스포츠", "Sportswear") },
      { value: "traditional", label: t("전통", "Traditional") },
      { value: "fantasy", label: t("판타지", "Fantasy") },
    ],
  },
];

export const PRIMARY_ATTR_KEYS = ["gender", "ethnicity"] as const;
