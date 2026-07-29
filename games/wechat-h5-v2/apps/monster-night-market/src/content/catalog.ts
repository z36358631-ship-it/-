import type {
  CustomerDefinition,
  CustomerId,
  IngredientId,
  RecipeDefinition,
  StallDefinition,
  UpgradeDefinition,
} from "../domain/types";

export const INGREDIENTS: readonly {
  readonly id: IngredientId;
  readonly label: string;
  readonly silhouette: string;
}[] = [
  { id: "chili", label: "火椒", silhouette: "long" },
  { id: "tofu", label: "灵豆腐", silhouette: "cube" },
  { id: "mushroom", label: "月蘑", silhouette: "cap" },
  { id: "lotus", label: "莲片", silhouette: "ring" },
  { id: "fish", label: "云鱼", silhouette: "fish" },
  { id: "riceCake", label: "年糕", silhouette: "bar" },
  { id: "ice", label: "玄冰", silhouette: "crystal" },
  { id: "broth", label: "高汤", silhouette: "drop" },
];

export const RECIPES: readonly RecipeDefinition[] = [
  {
    id: "emberTofu",
    label: "火纹豆腐",
    ingredients: ["tofu", "chili"],
    arrangement: "ordered",
    stall: "grill",
  },
  {
    id: "mushroomSkewer",
    label: "月蘑串",
    ingredients: ["mushroom", "tofu"],
    arrangement: "adjacent",
    stall: "grill",
  },
  {
    id: "lotusIce",
    label: "莲花冰盏",
    ingredients: ["lotus", "ice"],
    arrangement: "ordered",
    stall: "dessert",
  },
  {
    id: "fishBroth",
    label: "云鱼高汤",
    ingredients: ["fish", "broth"],
    arrangement: "adjacent",
    stall: "hotpot",
  },
  {
    id: "spicyRiceCake",
    label: "火椒年糕",
    ingredients: ["riceCake", "chili"],
    arrangement: "ordered",
    stall: "grill",
  },
  {
    id: "frozenTofu",
    label: "玄冰豆腐",
    ingredients: ["ice", "tofu"],
    arrangement: "adjacent",
    stall: "dessert",
  },
  {
    id: "doubleSkewer",
    label: "双味串",
    ingredients: ["mushroom", "tofu", "chili"],
    arrangement: "line",
    stall: "grill",
  },
  {
    id: "borrowedFireSoup",
    label: "借火汤",
    ingredients: ["broth", "mushroom", "chili"],
    arrangement: "ordered",
    stall: "hotpot",
  },
  {
    id: "coldLotusCup",
    label: "冰莲杯",
    ingredients: ["ice", "lotus", "riceCake"],
    arrangement: "line",
    stall: "dessert",
  },
  {
    id: "sharedHotpot",
    label: "共享火锅",
    ingredients: ["fish", "tofu", "broth"],
    arrangement: "ordered",
    stall: "hotpot",
  },
  {
    id: "vipTwinDish",
    label: "贵客双拼",
    ingredients: ["chili", "fish", "lotus"],
    arrangement: "line",
    stall: "grill",
  },
  {
    id: "midnightFeast",
    label: "子夜盛宴",
    ingredients: ["broth", "fish", "mushroom", "tofu"],
    arrangement: "ordered",
    stall: "hotpot",
  },
];

function customer(
  id: CustomerId,
  patienceMoves: number,
  preferredStall: CustomerDefinition["preferredStall"],
): CustomerDefinition {
  return { id, patienceMoves, preferredStall };
}

export const CUSTOMERS: readonly CustomerDefinition[] = [
  customer("fireCub", 5, "grill"),
  customer("iceHare", 6, "dessert"),
  customer("lanternFox", 5, "grill"),
  customer("stoneOgre", 8, "hotpot"),
  customer("cloudCrane", 4, "dessert"),
  customer("riverImp", 6, "hotpot"),
  customer("moonCat", 5, "dessert"),
  customer("gluttonKing", 10, "hotpot"),
];

export const STALLS: readonly StallDefinition[] = [
  { id: "grill", rule: "adjacentBonus" },
  { id: "dessert", rule: "frozenBonus" },
  { id: "hotpot", rule: "reserveBroth" },
];

export const UPGRADES: readonly UpgradeDefinition[] = [
  { id: "borrowFire", rule: "substituteFire" },
  { id: "crossFlavor", rule: "extraOrder" },
  { id: "coldStorage", rule: "freezeNeighbor" },
  { id: "rushOrder", rule: "orderedVip" },
  { id: "sharedPlate", rule: "shareStep" },
  { id: "emberEcho", rule: "repeatFire" },
  { id: "sweetEncore", rule: "repeatSweet" },
  { id: "brothReserve", rule: "keepBroth" },
  { id: "patientQueue", rule: "addPatience" },
  { id: "doublePrep", rule: "doublePreview" },
  { id: "festivalSpark", rule: "festivalMeter" },
  { id: "cleanCounter", rule: "clearFreeze" },
];
