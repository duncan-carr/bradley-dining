export interface Station {
  id: number;
  name: string;
  description: string | null;
  image: string | null;
  position: number;
}

export interface MealPeriod {
  id: number;
  name: string;
  position: number;
}

export interface LocationData {
  commerceAttributes: {
    uid: string;
    url_key: string;
    timezone: string;
    children: Station[];
    meal_periods: MealPeriod[];
    maxMenusDate: string;
    hasActiveMenus: boolean;
  };
  aemAttributes: {
    name: string;
  };
}

export interface ProductAttribute {
  name: string;
  value: string | string[];
}

export interface MenuItem {
  id: string;
  name: string;
  sku: string;
  images: { label: string; roles: string[]; url: string }[];
  attributes: ProductAttribute[];
  price?: {
    final: {
      amount: {
        currency: string;
        value: number;
      };
    };
  };
}

export interface StationSkuMap {
  id: number;
  skus: string[];
}

export interface RecipesData {
  locationRecipesMap: {
    skus: string[];
    stationSkuMap: StationSkuMap[];
    dateSkuMap: {
      date: string;
      stations: {
        id: string;
        skus: { simple: string[] };
      }[];
    }[];
  } | null;
  products: {
    items: MenuItem[];
  } | null;
}

export type AllergenStatus = "known" | "none" | "unknown";

const DIETARY_LABEL_MAP: Record<string, string> = {
  "96": "Vegan",
  "99": "Vegetarian",
  "78": "Gluten Free",
};

export interface ParsedMenuItem extends MenuItem {
  marketingName: string;
  marketingDescription: string;
  allergenStatement: string;
  allergens: string[];
  allergenStatus: AllergenStatus;
  calories: string;
  protein: string;
  totalFat: string;
  totalCarbs: string;
  servingSize: string;
  sodium: string;
  saturatedFat: string;
  cholesterol: string;
  sugars: string;
  dietaryFiber: string;
  transFat: string;
  servingCombined: string;
  ingredients: string;
  hasDetailedNutrition: boolean;
  dietaryLabels: string[];
}

export function parseMenuItem(item: MenuItem): ParsedMenuItem {
  const attr = (name: string): string => {
    const v = item.attributes.find((a) => a.name === name)?.value;
    if (v == null) return "";
    return Array.isArray(v) ? v.join(", ") : v;
  };

  const statement = attr("allergen_statement");
  let allergens: string[] = [];
  let allergenStatus: AllergenStatus = "unknown";
  if (statement.startsWith("Contains:")) {
    const list = statement.replace("Contains:", "").trim();
    allergens = list ? list.split(",").map((s) => s.trim()).filter(Boolean) : [];
    allergenStatus = allergens.length > 0 ? "known" : "none";
  }

  const sodium = attr("sodium");
  const saturatedFat = attr("saturated_fat");
  const cholesterol = attr("cholesterol");
  const sugars = attr("sugars");
  const dietaryFiber = attr("dietary_fiber");
  const transFat = attr("trans_fat");
  const servingCombined = attr("serving_combined");
  const ingredients = attr("recipe_ingredients");

  const hasDetailedNutrition = !!(sodium || saturatedFat || cholesterol || sugars || dietaryFiber || transFat);

  const rawRecipeAttrs = item.attributes.find((a) => a.name === "recipe_attributes")?.value;
  let recipeAttrIds: string[] = [];
  if (Array.isArray(rawRecipeAttrs)) {
    recipeAttrIds = rawRecipeAttrs.map(String);
  } else if (typeof rawRecipeAttrs === "string" && rawRecipeAttrs && rawRecipeAttrs !== "0") {
    recipeAttrIds = rawRecipeAttrs.split(",").map((s) => s.trim()).filter(Boolean);
  }
  const dietaryLabels = recipeAttrIds
    .map((id) => DIETARY_LABEL_MAP[id])
    .filter((label): label is string => !!label);

  return {
    ...item,
    marketingName: attr("marketing_name") || item.name,
    marketingDescription: attr("marketing_description"),
    allergenStatement: statement,
    allergens,
    allergenStatus,
    calories: attr("calories"),
    protein: attr("protein"),
    totalFat: attr("total_fat"),
    totalCarbs: attr("total_carbohydrates"),
    servingSize: attr("serving_size"),
    sodium,
    saturatedFat,
    cholesterol,
    sugars,
    dietaryFiber,
    transFat,
    servingCombined,
    ingredients,
    hasDetailedNutrition,
    dietaryLabels,
  };
}
