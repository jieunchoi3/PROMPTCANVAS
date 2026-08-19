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
    label: "아이템",
    multi: true,
    options: [
      { value: "top", label: "상의" },
      { value: "bottom", label: "하의" },
      { value: "dress", label: "원피스" },
      { value: "outer", label: "아우터" },
      { value: "set", label: "셋업" },
      { value: "bag", label: "가방" },
      { value: "shoes", label: "신발" },
      { value: "accessory", label: "악세서리" },
    ],
  },
  {
    key: "style_vibe",
    label: "감성",
    multi: true,
    options: [
      { value: "y2k", label: "Y2K" },
      { value: "simple", label: "심플" },
      { value: "street", label: "스트릿" },
      { value: "romantic", label: "로맨틱" },
      { value: "minimal", label: "미니멀" },
      { value: "vintage", label: "빈티지" },
      { value: "luxury", label: "럭셔리" },
      { value: "sporty", label: "스포티" },
    ],
  },
  {
    key: "main_color",
    label: "컬러",
    multi: true,
    options: [
      { value: "black", label: "블랙" },
      { value: "white", label: "화이트" },
      { value: "grey", label: "그레이" },
      { value: "beige", label: "베이지" },
      { value: "brown", label: "브라운" },
      { value: "blue", label: "블루" },
      { value: "pink", label: "핑크" },
      { value: "red", label: "레드" },
      { value: "green", label: "그린" },
      { value: "metallic", label: "메탈릭" },
    ],
  },
  {
    key: "material",
    label: "소재",
    multi: true,
    options: [
      { value: "denim", label: "데님" },
      { value: "leather", label: "레더" },
      { value: "knit", label: "니트" },
      { value: "cotton", label: "코튼" },
      { value: "sheer", label: "시스루" },
      { value: "metal", label: "메탈" },
    ],
  },
];
