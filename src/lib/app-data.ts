export type StockUnit = "kg" | "ons" | "gram" | "liter" | "ml" | "pcs" | "bungkus" | "botol" | "sachet";
export type IngredientUnit = StockUnit;

export interface Stock {
  id: string;
  name: string;
  quantity: number;
  unit: StockUnit;
  buyPrice: number;
  minimum: number;
  updatedAt: string;
}

export interface Ingredient {
  stockId: string;
  quantity: number;
  unit?: IngredientUnit;
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

export interface Recipe {
  id: string;
  name: string;
  category: "Makanan" | "Minuman";
  ingredients: Ingredient[];
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

export interface CartItem {
  product: Product;
  quantity: number;
}

export type Page = "cashier" | "dashboard" | "stock" | "menu" | "finance" | "report";

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
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

export function rupiah(num: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
}

export function grams(stock: Stock): number {
  switch (stock.unit) {
    case "kg":
    case "liter":
      return stock.quantity * 1000;
    case "ons":
      return stock.quantity * 100;
    default:
      return stock.quantity;
  }
}

export function usedStockUnits(ingredient: Ingredient, stock: Stock): number {
  const ingUnit = ingredient.unit || stock.unit;
  if (stock.unit === "kg" || stock.unit === "liter") {
    if (ingUnit === "gram" || ingUnit === "ml") return ingredient.quantity;
    if (ingUnit === "ons") return ingredient.quantity * 100;
    if (ingUnit === "kg" || ingUnit === "liter") return ingredient.quantity * 1000;
  }
  return ingredient.quantity;
}

export function fromBaseUnits(baseQty: number, unit: StockUnit): number {
  if (unit === "kg" || unit === "liter") return baseQty / 1000;
  if (unit === "ons") return baseQty / 100;
  return baseQty;
}

export function selectableUnits(stock?: Stock): IngredientUnit[] {
  if (!stock) return ["gram"];
  if (stock.unit === "kg" || stock.unit === "gram" || stock.unit === "ons") {
    return ["gram", "kg", "ons"];
  }
  if (stock.unit === "liter" || stock.unit === "ml") {
    return ["ml", "liter"];
  }
  return [stock.unit];
}

export function recipeUnit(ingredient: Ingredient, stock?: Stock): IngredientUnit {
  return ingredient.unit || stock?.unit || "gram";
}

export function calculateProductHpp(ingredients: Ingredient[], stocks: Stock[]): number {
  return ingredients.reduce((total, ing) => {
    const st = stocks.find((s) => s.id === ing.stockId);
    if (!st) return total;
    const baseCostPerGram = st.buyPrice / (grams(st) / (st.quantity || 1));
    const usedGram = usedStockUnits(ing, st);
    return total + baseCostPerGram * usedGram;
  }, 0);
}

// Helper Penyimpanan QRIS Toko ke LocalStorage
export const loadQrisImage = (): string => {
  return localStorage.getItem("app-qris-image") || "";
};

export const saveQrisImage = (dataUrl: string): void => {
  localStorage.setItem("app-qris-image", dataUrl);
};