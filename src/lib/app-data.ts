export type Stock = {
  id: string;
  name: string;
  quantity: number;
  unit: "kg" | "gram" | "pcs";
  buyPrice: number;
  minimum: number;
  updatedAt: string;
};
export type IngredientUnit = "gram" | "kg" | "pcs";
export type Ingredient = {
  stockId: string;
  quantity: number;
  unit?: IngredientUnit;
};
export type RecipeCategory = "Makanan" | "Minuman" | "Saus" | "Komponen";
export type Recipe = {
  id: string;
  name: string;
  category: RecipeCategory;
  ingredients: Ingredient[];
};
export type Product = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  ingredients: Ingredient[];
  recipeId?: string;
  recipePortions?: number;
};
export type Transaction = {
  id: string;
  date: string;
  type: "income" | "expense";
  title: string;
  amount: number;
  method: string;
};
export type CartItem = { product: Product; quantity: number };
export type Page =
  | "dashboard"
  | "stock"
  | "menu"
  | "cashier"
  | "finance"
  | "report";

export const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
export const grams = (stock: Stock) =>
  stock.unit === "kg" ? stock.quantity * 1000 : stock.quantity;
export const displayQty = (value: number, unit: Stock["unit"]) =>
  unit === "kg"
    ? `${(value / 1000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg`
    : `${value.toLocaleString("id-ID")} ${unit}`;
export const recipeUnit = (
  ingredient: Ingredient,
  stock?: Stock,
): IngredientUnit =>
  ingredient.unit || (stock?.unit === "kg" ? "gram" : stock?.unit || "gram");
export const usedStockUnits = (ingredient: Ingredient, stock: Stock) =>
  recipeUnit(ingredient, stock) === "kg"
    ? ingredient.quantity * 1000
    : ingredient.quantity;
export const selectableUnits = (stock?: Stock): IngredientUnit[] =>
  stock?.unit === "pcs" ? ["pcs"] : ["gram", "kg"];
export const initialStock: Stock[] = [
  {
    id: "bahan-1",
    name: "Bahan 1",
    quantity: 7.5,
    unit: "kg",
    buyPrice: 120000,
    minimum: 2,
    updatedAt: "Hari ini, 08.15",
  },
  {
    id: "bahan-2",
    name: "Bahan 2",
    quantity: 4,
    unit: "kg",
    buyPrice: 18000,
    minimum: 1,
    updatedAt: "Hari ini, 08.15",
  },
  {
    id: "bahan-3",
    name: "Bahan 3",
    quantity: 30,
    unit: "pcs",
    buyPrice: 1500,
    minimum: 10,
    updatedAt: "Kemarin, 17.42",
  },
  {
    id: "bahan-4",
    name: "Bahan 4",
    quantity: 850,
    unit: "gram",
    buyPrice: 42000,
    minimum: 300,
    updatedAt: "Kemarin, 17.42",
  },
  {
    id: "bahan-5",
    name: "Bahan 5",
    quantity: 18,
    unit: "pcs",
    buyPrice: 850,
    minimum: 20,
    updatedAt: "Kemarin, 17.42",
  },
];
export const initialRecipes: Recipe[] = [
  {
    id: "resep-1",
    name: "Resep 1",
    category: "Makanan",
    ingredients: [
      { stockId: "bahan-1", quantity: 180, unit: "gram" },
      { stockId: "bahan-2", quantity: 60, unit: "gram" },
      { stockId: "bahan-3", quantity: 1, unit: "pcs" },
      { stockId: "bahan-5", quantity: 1, unit: "pcs" },
    ],
  },
  {
    id: "resep-2",
    name: "Resep 2",
    category: "Makanan",
    ingredients: [
      { stockId: "bahan-3", quantity: 1, unit: "pcs" },
      { stockId: "bahan-4", quantity: 20, unit: "gram" },
      { stockId: "bahan-5", quantity: 1, unit: "pcs" },
    ],
  },
];
export const initialProducts: Product[] = [
  {
    id: "menu-1",
    name: "Menu 1",
    price: 15000,
    recipeId: "resep-1",
    recipePortions: 1,
    ingredients: [
      { stockId: "bahan-1", quantity: 180, unit: "gram" },
      { stockId: "bahan-2", quantity: 60, unit: "gram" },
      { stockId: "bahan-3", quantity: 1, unit: "pcs" },
      { stockId: "bahan-5", quantity: 1, unit: "pcs" },
    ],
  },
  {
    id: "menu-2",
    name: "Menu 2",
    price: 20000,
    ingredients: [
      { stockId: "bahan-1", quantity: 250, unit: "gram" },
      { stockId: "bahan-2", quantity: 70, unit: "gram" },
      { stockId: "bahan-3", quantity: 1, unit: "pcs" },
      { stockId: "bahan-5", quantity: 1, unit: "pcs" },
    ],
  },
  {
    id: "menu-3",
    name: "Menu 3",
    price: 14000,
    recipeId: "resep-2",
    recipePortions: 1,
    ingredients: [
      { stockId: "bahan-3", quantity: 1, unit: "pcs" },
      { stockId: "bahan-4", quantity: 20, unit: "gram" },
      { stockId: "bahan-5", quantity: 1, unit: "pcs" },
    ],
  },
];

const sampleDate = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const initialTransactions: Transaction[] = [
  {
    id: "t1",
    date: sampleDate(0),
    type: "income",
    title: "Penjualan menu 1",
    amount: 60000,
    method: "Tunai",
  },
  {
    id: "t2",
    date: sampleDate(0),
    type: "income",
    title: "Penjualan menu 3",
    amount: 42000,
    method: "QRIS",
  },
  {
    id: "t3",
    date: sampleDate(2),
    type: "expense",
    title: "Belanja bahan",
    amount: 178000,
    method: "Tunai",
  },
  {
    id: "t4",
    date: sampleDate(4),
    type: "income",
    title: "Penjualan menu 2",
    amount: 100000,
    method: "Tunai",
  },
];

export function load<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "") as T;
  } catch {
    return fallback;
  }
}
