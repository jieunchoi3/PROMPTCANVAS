import { t } from "@/lib/locale";

export type WardrobeAttrOption = {
  value: string;
  label: string;
};

export type WardrobeAttrDef = {
  key: string;
  label: string;
  multi: boolean;
  options: readonly WardrobeAttrOption[];
};

export const WARDROBE_ATTRIBUTES: readonly WardrobeAttrDef[] = [
  {
    key: "item_type",
    label: t("아이템", "Item"),
    multi: true,
    options: [
      { value: "top", label: t("상의", "Top") },
      { value: "bottom", label: t("하의", "Bottom") },
      { value: "dress", label: t("원피스", "Dress") },
      { value: "outer", label: t("아우터", "Outerwear") },
      { value: "set", label: t("셋업", "Set") },
      { value: "bag", label: t("가방", "Bag") },
      { value: "shoes", label: t("신발", "Shoes") },
      { value: "accessory", label: t("악세서리", "Accessory") },
    ],
  },
  {
    key: "style_vibe",
    label: t("감성", "Vibe"),
    multi: true,
    options: [
      { value: "y2k", label: "Y2K" },
      { value: "simple", label: t("심플", "Simple") },
      { value: "street", label: t("스트릿", "Street") },
      { value: "romantic", label: t("로맨틱", "Romantic") },
      { value: "minimal", label: t("미니멀", "Minimal") },
      { value: "vintage", label: t("빈티지", "Vintage") },
      { value: "luxury", label: t("럭셔리", "Luxury") },
      { value: "sporty", label: t("스포티", "Sporty") },
    ],
  },
  {
    key: "main_color",
    label: t("컬러", "Colour"),
    multi: true,
    options: [
      { value: "black", label: t("블랙", "Black") },
      { value: "white", label: t("화이트", "White") },
      { value: "grey", label: t("그레이", "Grey") },
      { value: "beige", label: t("베이지", "Beige") },
      { value: "brown", label: t("브라운", "Brown") },
      { value: "blue", label: t("블루", "Blue") },
      { value: "pink", label: t("핑크", "Pink") },
      { value: "red", label: t("레드", "Red") },
      { value: "green", label: t("그린", "Green") },
      { value: "metallic", label: t("메탈릭", "Metallic") },
    ],
  },
  {
    key: "material",
    label: t("소재", "Material"),
    multi: true,
    options: [
      { value: "denim", label: t("데님", "Denim") },
      { value: "leather", label: t("레더", "Leather") },
      { value: "knit", label: t("니트", "Knit") },
      { value: "cotton", label: t("코튼", "Cotton") },
      { value: "sheer", label: t("시스루", "Sheer") },
      { value: "metal", label: t("메탈", "Metal") },
    ],
  },
];
