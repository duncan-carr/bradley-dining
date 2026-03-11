import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_URL =
  "https://api.elevate-dxp.com/api/mesh/c087f756-cc72-4649-a36f-3a41b700c519/graphql";

const API_HEADERS: Record<string, string> = {
  store: "ch_bradley_en",
  "magento-customer-group": "b6589fc6ab0dc82cf12099d1c2d40ab994e8410c",
  "x-api-key": "ElevateAPIProd",
  "Magento-Website-Code": "ch_bradley",
  "Magento-Store-View-Code": "ch_bradley_en",
  "Magento-Store-Code": "ch_bradley",
};

const LOCATION_QUERY = `query getLocation($campus_url_key: String!, $location_url_key: String!) {
  getLocation(campusUrlKey: $campus_url_key, locationUrlKey: $location_url_key) {
    commerceAttributes {
      uid url_key timezone
      children { id name description image position }
      meal_periods { id name position }
      maxMenusDate
      hasActiveMenus
    }
    aemAttributes { name }
  }
}`;

const RECIPES_QUERY = `query getLocationRecipes(
  $campusUrlKey: String!
  $locationUrlKey: String!
  $date: String!
  $mealPeriod: Int
  $viewType: Commerce_MenuViewType!
) {
  getLocationRecipes(
    campusUrlKey: $campusUrlKey
    locationUrlKey: $locationUrlKey
    date: $date
    mealPeriod: $mealPeriod
    viewType: $viewType
  ) {
    locationRecipesMap {
      skus
      stationSkuMap { id skus }
      dateSkuMap { date stations { id skus { simple } } }
    }
    products {
      items {
        id name sku
        images { label roles url }
        attributes { name value }
        ... on Catalog_SimpleProductView {
          price { final { amount { currency value } } }
        }
      }
    }
  }
}`;

async function fetchGraphQL(query: string, operationName: string, variables: Record<string, unknown>) {
  const params = new URLSearchParams({
    query,
    operationName,
    variables: JSON.stringify(variables),
  });

  const res = await fetch(`${API_URL}?${params.toString()}`, {
    method: "GET",
    headers: API_HEADERS,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  try {
    if (type === "location") {
      const data = await fetchGraphQL(LOCATION_QUERY, "getLocation", {
        campus_url_key: "campus",
        location_url_key: "williams-dining",
      });
      return NextResponse.json(data, {
        headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800" },
      });
    }

    if (type === "recipes") {
      const date = searchParams.get("date") || (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      })();
      const mealPeriod = searchParams.get("mealPeriod");

      const variables: Record<string, unknown> = {
        campusUrlKey: "campus",
        locationUrlKey: "williams-dining",
        date,
        viewType: "DAILY",
      };
      if (mealPeriod) {
        variables.mealPeriod = parseInt(mealPeriod, 10);
      }

      const data = await fetchGraphQL(RECIPES_QUERY, "getLocationRecipes", variables);
      return NextResponse.json(data, {
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=120" },
      });
    }

    return NextResponse.json({ error: "Invalid type parameter. Use 'location' or 'recipes'." }, { status: 400 });
  } catch (err) {
    console.error("Dining API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 502 }
    );
  }
}
