export type IngredientUnit =
  | "kg"
  | "ons"
  | "gram"
  | "liter"
  | "ml"
  | "pcs"
  | "bungkus"
  | "botol"
  | "sachet";

export type RecipeCategory = "Makanan" | "Minuman" | "Saus" | "Komponen";
export type Page = "cashier" | "dashboard" | "stock" | "menu" | "finance" | "report";

export interface Ingredient {
  stockId: string;
  quantity: number;
  unit: IngredientUnit;
}

export interface Stock {
  id: string;
  name: string;
  quantity: number;
  unit: IngredientUnit;
  buyPrice: number;
  minimum: number;
  updatedAt: string;
}

export interface Recipe {
  id: string;
  name: string;
  category: RecipeCategory;
  ingredients: Ingredient[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  recipeId?: string;
  recipePortions?: number;
  ingredients: Ingredient[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Transaction {
  id: string;
  date: string;
  type: "income" | "expense";
  title: string;
  amount: number;
  method: string;
  category?: string;
}

// 1. Pilihan Satuan Baku
export const selectableUnits = (stock?: Stock): IngredientUnit[] => {
  if (!stock) return ["gram", "kg", "ons", "ml", "liter", "pcs", "bungkus", "botol", "sachet"];
  const u = stock.unit;
  if (u === "kg" || u === "ons" || u === "gram") return ["gram", "ons", "kg"];
  if (u === "liter" || u === "ml") return ["ml", "liter"];
  return [u];
};

export const usedStockUnits = (ingredient: Ingredient, stock?: Stock): number => {
  if (!ingredient) return 0;
  const ingQty = ingredient.quantity || 0;
  const ingUnit = ingredient.unit;
  const stockUnit = stock?.unit || ingUnit;

  // Konversi ke basis gram / ml
  const baseQty = grams(ingQty, ingUnit);
  // Kembalikan ke satuan stok
  return fromBaseUnits(baseQty, stockUnit);
};

// 2. Formatting & Konversi Unit
export function rupiah(value: number): string {
  return "Rp " + Math.round(value || 0).toLocaleString("id-ID");
}

export function grams(target: number | Stock, unit?: IngredientUnit): number {
  if (typeof target === "object" && target !== null) {
    return grams(target.quantity, target.unit);
  }
  const q = Number(target) || 0;
  const u = unit || "gram";
  switch (u) {
    case "kg":
      return q * 1000;
    case "ons":
      return q * 100;
    case "liter":
      return q * 1000;
    case "ml":
    case "gram":
    default:
      return q;
  }
}

export function fromBaseUnits(quantity: number, targetUnit: IngredientUnit): number {
  const q = Number(quantity) || 0;
  switch (targetUnit) {
    case "kg":
      return q / 1000;
    case "ons":
      return q / 100;
    case "liter":
      return q / 1000;
    case "ml":
    case "gram":
    default:
      return q;
  }
}

export function recipeUnit(ingredient: Ingredient, stock?: Stock): string {
  if (!ingredient) return "";
  return ingredient.unit || stock?.unit || "";
}

// 3. Kalkulasi HPP Menu
export function calculateProductHpp(
  ingredientsOrProduct: Ingredient[] | Product,
  stocks: Stock[]
): number {
  const ingredients = Array.isArray(ingredientsOrProduct)
    ? ingredientsOrProduct
    : ingredientsOrProduct?.ingredients || [];

  if (!ingredients.length) return 0;

  return ingredients.reduce((total, ing) => {
    const stock = stocks.find((s) => s.id === ing.stockId);
    if (!stock || stock.quantity <= 0) return total;

    const stockBaseQty = grams(stock.quantity, stock.unit);
    const costPerBaseUnit = stockBaseQty > 0 ? stock.buyPrice / stockBaseQty : 0;
    const ingBaseQty = grams(ing.quantity, ing.unit);

    return total + ingBaseQty * costPerBaseUnit;
  }, 0);
}

// 4. Manajemen Gambar QRIS LocalStorage
const QRIS_STORAGE_KEY = "recehly_qris_image";

export function loadQrisImage(): string {
  try {
    return localStorage.getItem(QRIS_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function saveQrisImage(dataUrl: string): void {
  try {
    if (dataUrl) {
      localStorage.setItem(QRIS_STORAGE_KEY, dataUrl);
    } else {
      localStorage.removeItem(QRIS_STORAGE_KEY);
    }
  } catch (err) {
    console.error("Gagal menyimpan QRIS:", err);
  }
}

// 5. Data Default / Initial State
export const initialStock: Stock[] = [
  { id: "s1", name: "Daging Sapi", quantity: 5, unit: "kg", buyPrice: 120000, minimum: 2, updatedAt: "Hari ini" },
  { id: "s2", name: "Tepung Tapioka", quantity: 10, unit: "kg", buyPrice: 12000, minimum: 3, updatedAt: "Hari ini" },
  { id: "s3", name: "Bawang Putih", quantity: 1, unit: "kg", buyPrice: 35000, minimum: 0.5, updatedAt: "Hari ini" },
  { id: "s4", name: "Es Batu", quantity: 20, unit: "pcs", buyPrice: 2000, minimum: 5, updatedAt: "Hari ini" },
  { id: "s5", name: "Sirup Teh", quantity: 5, unit: "botol", buyPrice: 18000, minimum: 1, updatedAt: "Hari ini" },
];

export const initialRecipes: Recipe[] = [
  {
    id: "r1",
    name: "Adonan Bakso Sapi",
    category: "Makanan",
    ingredients: [
      { stockId: "s1", quantity: 200, unit: "gram" },
      { stockId: "s2", quantity: 50, unit: "gram" },
      { stockId: "s3", quantity: 10, unit: "gram" },
    ],
  },
  {
    id: "r2",
    name: "Racikan Es Teh",
    category: "Minuman",
    ingredients: [
      { stockId: "s5", quantity: 50, unit: "ml" },
      { stockId: "s4", quantity: 1, unit: "pcs" },
    ],
  },
];

export const initialProducts: Product[] = [
  {
    id: "p1",
    name: "Bakso Sapi Spesial",
    price: 20000,
    recipeId: "r1",
    recipePortions: 1,
    ingredients: [
      { stockId: "s1", quantity: 200, unit: "gram" },
      { stockId: "s2", quantity: 50, unit: "gram" },
      { stockId: "s3", quantity: 10, unit: "gram" },
    ],
  },
  {
    id: "p2",
    name: "Es Teh Manis Jumbo",
    price: 5000,
    recipeId: "r2",
    recipePortions: 1,
    ingredients: [
      { stockId: "s5", quantity: 50, unit: "ml" },
      { stockId: "s4", quantity: 1, unit: "pcs" },
    ],
  },
];

export const initialTransactions: Transaction[] = [
  {
    id: "t1",
    date: new Date().toISOString().slice(0, 10),
    type: "income",
    title: "Bakso Sapi Spesial x2, Es Teh Manis Jumbo x2",
    amount: 50000,
    method: "Tunai",
  },
];

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}