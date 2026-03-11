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
  value: string;
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
}

export function parseMenuItem(item: MenuItem): ParsedMenuItem {
  const attr = (name: string) =>
    item.attributes.find((a) => a.name === name)?.value ?? "";

  const statement = attr("allergen_statement");
  let allergens: string[] = [];
  let allergenStatus: AllergenStatus = "unknown";
  if (statement.startsWith("Contains:")) {
    const list = statement.replace("Contains:", "").trim();
    allergens = list ? list.split(",").map((s) => s.trim()).filter(Boolean) : [];
    allergenStatus = allergens.length > 0 ? "known" : "none";
  }

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
  };
}
