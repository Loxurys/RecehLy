import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import pg, { PoolClient } from "pg";
const { Pool } = pg;
import { randomUUID } from "node:crypto";

const databaseUrl = process.env.DATABASE_URL;

// Konfigurasi Pool yang lebih aman untuk Serverless Environment (Netlify)
export const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
        ? false
        : { rejectUnauthorized: false },
      max: 1, // Di serverless, gunakan max 1 koneksi per function instance
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    })
  : null;

// Error handler agar instance Pool tidak crash saat koneksi idle putus
if (pool) {
  pool.on("error", (err) => {
    console.error("Unexpected error on idle PostgreSQL client:", err);
  });
}

export const app = express();
app.use(express.json({ limit: "5mb" }));

const validCode = (code: string): boolean => /^[A-Z0-9]{6,12}$/.test(code);
const asNumber = (value: any): number => Number(value) || 0;
const unitFactor = (unit: string): number =>
  unit === "kg" || unit === "liter" ? 1000 : unit === "ons" ? 100 : 1;
const ingredientBaseUnit = (quantity: number, unit: string): number =>
  quantity * unitFactor(unit);
const stockBaseUnit = (quantity: number, unit: string): number =>
  quantity * unitFactor(unit);

let tablesReadyPromise: Promise<void> | null = null;

export async function ensureTables(): Promise<void> {
  if (!pool) return;
  if (!tablesReadyPromise) {
    tablesReadyPromise = (async () => {
      let client: PoolClient | null = null;
      try {
        client = await pool.connect();
        await client.query(`
          CREATE TABLE IF NOT EXISTS app_stores (
            access_code VARCHAR(12) PRIMARY KEY,
            demo_data BOOLEAN NOT NULL DEFAULT TRUE,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          CREATE TABLE IF NOT EXISTS stock_items (
            store_code VARCHAR(12) NOT NULL REFERENCES app_stores(access_code) ON DELETE CASCADE,
            id TEXT NOT NULL, name TEXT NOT NULL,
            quantity NUMERIC NOT NULL CHECK (quantity >= 0),
            unit TEXT NOT NULL CHECK (unit IN ('kg', 'ons', 'gram', 'liter', 'ml', 'pcs', 'bungkus', 'botol', 'sachet')),
            buy_price NUMERIC NOT NULL CHECK (buy_price >= 0),
            minimum_quantity NUMERIC NOT NULL DEFAULT 0 CHECK (minimum_quantity >= 0),
            updated_label TEXT NOT NULL,
            PRIMARY KEY (store_code, id)
          );
          CREATE TABLE IF NOT EXISTS recipes (
            store_code VARCHAR(12) NOT NULL REFERENCES app_stores(access_code) ON DELETE CASCADE,
            id TEXT NOT NULL, name TEXT NOT NULL,
            category TEXT NOT NULL CHECK (category IN ('Makanan', 'Minuman', 'Saus', 'Komponen')),
            PRIMARY KEY (store_code, id)
          );
          CREATE TABLE IF NOT EXISTS recipe_ingredients (
            store_code VARCHAR(12) NOT NULL, recipe_id TEXT NOT NULL, stock_id TEXT NOT NULL,
            quantity NUMERIC NOT NULL CHECK (quantity >= 0),
            unit TEXT NOT NULL CHECK (unit IN ('kg', 'ons', 'gram', 'liter', 'ml', 'pcs', 'bungkus', 'botol', 'sachet')),
            PRIMARY KEY (store_code, recipe_id, stock_id),
            FOREIGN KEY (store_code, recipe_id) REFERENCES recipes(store_code, id) ON DELETE CASCADE,
            FOREIGN KEY (store_code, stock_id) REFERENCES stock_items(store_code, id) ON DELETE CASCADE
          );
          CREATE TABLE IF NOT EXISTS menu_items (
            store_code VARCHAR(12) NOT NULL REFERENCES app_stores(access_code) ON DELETE CASCADE,
            id TEXT NOT NULL, name TEXT NOT NULL,
            price NUMERIC NOT NULL CHECK (price >= 0), image_url TEXT, recipe_id TEXT, recipe_portions NUMERIC,
            PRIMARY KEY (store_code, id),
            FOREIGN KEY (store_code, recipe_id) REFERENCES recipes(store_code, id) ON DELETE SET NULL
          );
          CREATE TABLE IF NOT EXISTS menu_ingredients (
            store_code VARCHAR(12) NOT NULL, menu_id TEXT NOT NULL, stock_id TEXT NOT NULL,
            quantity NUMERIC NOT NULL CHECK (quantity >= 0),
            unit TEXT NOT NULL CHECK (unit IN ('kg', 'ons', 'gram', 'liter', 'ml', 'pcs', 'bungkus', 'botol', 'sachet')),
            PRIMARY KEY (store_code, menu_id, stock_id),
            FOREIGN KEY (store_code, menu_id) REFERENCES menu_items(store_code, id) ON DELETE CASCADE,
            FOREIGN KEY (store_code, stock_id) REFERENCES stock_items(store_code, id) ON DELETE CASCADE
          );
          CREATE TABLE IF NOT EXISTS financial_transactions (
            store_code VARCHAR(12) NOT NULL REFERENCES app_stores(access_code) ON DELETE CASCADE,
            id TEXT NOT NULL, transaction_date DATE NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
            title TEXT NOT NULL, amount NUMERIC NOT NULL CHECK (amount >= 0), method TEXT NOT NULL,
            PRIMARY KEY (store_code, id)
          );
        `);
        try {
          await client.query(`
            ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_category_check;
            ALTER TABLE recipes ADD CONSTRAINT recipes_category_check CHECK (category IN ('Makanan', 'Minuman', 'Saus', 'Komponen'));
            ALTER TABLE recipe_ingredients DROP CONSTRAINT IF EXISTS recipe_ingredients_quantity_check;
            ALTER TABLE recipe_ingredients ADD CONSTRAINT recipe_ingredients_quantity_check CHECK (quantity >= 0);
            ALTER TABLE menu_ingredients DROP CONSTRAINT IF EXISTS menu_ingredients_quantity_check;
            ALTER TABLE menu_ingredients ADD CONSTRAINT menu_ingredients_quantity_check CHECK (quantity >= 0);
            ALTER TABLE stock_items DROP CONSTRAINT IF EXISTS stock_items_unit_check;
            ALTER TABLE stock_items ADD CONSTRAINT stock_items_unit_check CHECK (unit IN ('kg', 'ons', 'gram', 'liter', 'ml', 'pcs', 'bungkus', 'botol', 'sachet'));
            ALTER TABLE recipe_ingredients DROP CONSTRAINT IF EXISTS recipe_ingredients_unit_check;
            ALTER TABLE recipe_ingredients ADD CONSTRAINT recipe_ingredients_unit_check CHECK (unit IN ('kg', 'ons', 'gram', 'liter', 'ml', 'pcs', 'bungkus', 'botol', 'sachet'));
            ALTER TABLE menu_ingredients DROP CONSTRAINT IF EXISTS menu_ingredients_unit_check;
            ALTER TABLE menu_ingredients ADD CONSTRAINT menu_ingredients_unit_check CHECK (unit IN ('kg', 'ons', 'gram', 'liter', 'ml', 'pcs', 'bungkus', 'botol', 'sachet'));
            ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url TEXT;
          `);
        } catch {
          // Migration constraints handled
        }
      } catch (err) {
        tablesReadyPromise = null;
        console.error("ensureTables query error:", err);
        throw err;
      } finally {
        if (client) client.release();
      }
    })();
  }
  return tablesReadyPromise;
}

function requireDatabase(_request: Request, response: Response, next: NextFunction): void {
  if (!pool) {
    response.status(503).json({ message: "Database belum dikonfigurasi." });
    return;
  }
  next();
}

function normalizedState(input: any): any | null {
  if (!input || typeof input !== "object") return null;
  const state = input.state && typeof input.state === "object" ? input.state : input;

  if (
    !Array.isArray(state.stocks) ||
    !Array.isArray(state.recipes) ||
    !Array.isArray(state.products) ||
    !Array.isArray(state.transactions)
  ) {
    return null;
  }

  return { ...state, demoData: Boolean(state.demoData) };
}

async function writeState(client: PoolClient, code: string, state: any): Promise<void> {
  await client.query(
    `INSERT INTO app_stores (access_code, demo_data) VALUES ($1, $2)
    ON CONFLICT (access_code) DO UPDATE SET demo_data = EXCLUDED.demo_data, updated_at = NOW()`,
    [code, state.demoData]
  );
  for (const table of [
    "financial_transactions",
    "menu_ingredients",
    "recipe_ingredients",
    "menu_items",
    "recipes",
    "stock_items",
  ]) {
    await client.query(`DELETE FROM ${table} WHERE store_code = $1`, [code]);
  }
  const validStockIds = new Set<string>();
  for (const stock of state.stocks) {
    validStockIds.add(stock.id);
    await client.query(
      `INSERT INTO stock_items (store_code, id, name, quantity, unit, buy_price, minimum_quantity, updated_label)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        code,
        stock.id,
        stock.name,
        Math.max(0, asNumber(stock.quantity)),
        stock.unit,
        Math.max(0, asNumber(stock.buyPrice)),
        Math.max(0, asNumber(stock.minimum)),
        stock.updatedAt || "Baru saja",
      ]
    );
  }
  const validRecipeIds = new Set<string>();
  for (const recipe of state.recipes) {
    validRecipeIds.add(recipe.id);
    const category = ["Makanan", "Minuman", "Saus", "Komponen"].includes(recipe.category)
      ? recipe.category
      : "Makanan";
    await client.query(
      "INSERT INTO recipes (store_code, id, name, category) VALUES ($1, $2, $3, $4)",
      [code, recipe.id, recipe.name, category]
    );
  }
  for (const recipe of state.recipes) {
    const seenStocks = new Set<string>();
    for (const ingredient of recipe.ingredients) {
      if (
        !validStockIds.has(ingredient.stockId) ||
        seenStocks.has(ingredient.stockId)
      )
        continue;
      seenStocks.add(ingredient.stockId);
      await client.query(
        `INSERT INTO recipe_ingredients (store_code, recipe_id, stock_id, quantity, unit) VALUES ($1, $2, $3, $4, $5)`,
        [
          code,
          recipe.id,
          ingredient.stockId,
          Math.max(0, asNumber(ingredient.quantity)),
          ingredient.unit || "gram",
        ]
      );
    }
  }
  for (const product of state.products) {
    const recipeId =
      product.recipeId && validRecipeIds.has(product.recipeId)
        ? product.recipeId
        : null;
    await client.query(
      `INSERT INTO menu_items (store_code, id, name, price, image_url, recipe_id, recipe_portions) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        code,
        product.id,
        product.name,
        Math.max(0, asNumber(product.price)),
        product.imageUrl || null,
        recipeId,
        product.recipePortions || null,
      ]
    );
  }
  for (const product of state.products) {
    const seenStocks = new Set<string>();
    for (const ingredient of product.ingredients) {
      if (
        !validStockIds.has(ingredient.stockId) ||
        seenStocks.has(ingredient.stockId)
      )
        continue;
      seenStocks.add(ingredient.stockId);
      await client.query(
        `INSERT INTO menu_ingredients (store_code, menu_id, stock_id, quantity, unit) VALUES ($1, $2, $3, $4, $5)`,
        [
          code,
          product.id,
          ingredient.stockId,
          Math.max(0, asNumber(ingredient.quantity)),
          ingredient.unit || "gram",
        ]
      );
    }
  }
  for (const transaction of state.transactions) {
    await client.query(
      `INSERT INTO financial_transactions (store_code, id, transaction_date, type, title, amount, method) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        code,
        transaction.id,
        transaction.date,
        transaction.type,
        transaction.title,
        Math.max(0, asNumber(transaction.amount)),
        transaction.method,
      ]
    );
  }
}

async function saveState(code: string, state: any): Promise<void> {
  if (!pool) return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await writeState(client, code, state);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Database saveState error:", error);
    throw error;
  } finally {
    client.release();
  }
}

async function readState(
  source: pg.Pool | PoolClient,
  code: string
): Promise<any | null> {
  const ownsClient = source instanceof Pool;
  const client: PoolClient = ownsClient
    ? await (source as pg.Pool).connect()
    : (source as PoolClient);
  try {
    const store = await client.query(
      "SELECT demo_data, updated_at FROM app_stores WHERE access_code = $1",
      [code]
    );
    if (!store.rowCount) return null;
    const [
      stocks,
      recipes,
      recipeIngredients,
      products,
      menuIngredients,
      transactions,
    ] = [
      await client.query(
        "SELECT * FROM stock_items WHERE store_code = $1 ORDER BY name",
        [code]
      ),
      await client.query(
        "SELECT * FROM recipes WHERE store_code = $1 ORDER BY name",
        [code]
      ),
      await client.query("SELECT * FROM recipe_ingredients WHERE store_code = $1", [
        code,
      ]),
      await client.query(
        "SELECT * FROM menu_items WHERE store_code = $1 ORDER BY name",
        [code]
      ),
      await client.query("SELECT * FROM menu_ingredients WHERE store_code = $1", [
        code,
      ]),
      await client.query(
        "SELECT * FROM financial_transactions WHERE store_code = $1 ORDER BY transaction_date DESC, id DESC",
        [code]
      ),
    ];
    const groupIngredients = (rows: any[], parent: string) => {
      const grouped = new Map<string, any[]>();
      for (const row of rows) {
        const values = grouped.get(String(row[parent])) || [];
        values.push({
          stockId: String(row.stock_id),
          quantity: asNumber(row.quantity),
          unit: row.unit,
        });
        grouped.set(String(row[parent]), values);
      }
      return grouped;
    };
    const recipeParts = groupIngredients(recipeIngredients.rows, "recipe_id");
    const menuParts = groupIngredients(menuIngredients.rows, "menu_id");
    return {
      state: {
        stocks: stocks.rows.map((stock: any) => ({
          id: stock.id,
          name: stock.name,
          quantity: asNumber(stock.quantity),
          unit: stock.unit,
          buyPrice: asNumber(stock.buy_price),
          minimum: asNumber(stock.minimum_quantity),
          updatedAt: stock.updated_label,
        })),
        recipes: recipes.rows.map((recipe: any) => ({
          id: recipe.id,
          name: recipe.name,
          category: recipe.category,
          ingredients: recipeParts.get(recipe.id) || [],
        })),
        products: products.rows.map((product: any) => ({
          id: product.id,
          name: product.name,
          price: asNumber(product.price),
          imageUrl: product.image_url || undefined,
          recipeId: product.recipe_id || undefined,
          recipePortions: product.recipe_portions
            ? asNumber(product.recipe_portions)
            : undefined,
          ingredients: menuParts.get(product.id) || [],
        })),
        transactions: transactions.rows.map((transaction: any) => ({
          id: transaction.id,
          date: new Date(transaction.transaction_date)
            .toISOString()
            .slice(0, 10),
          type: transaction.type,
          title: transaction.title,
          amount: asNumber(transaction.amount),
          method: transaction.method,
        })),
        demoData: store.rows[0].demo_data,
      },
      updatedAt: store.rows[0].updated_at,
    };
  } finally {
    if (ownsClient) client.release();
  }
}

async function migrateLegacyState(code: string): Promise<boolean> {
  if (!pool) return false;
  let state: any | null = null;
  const client = await pool.connect();
  try {
    const existing = await client.query(
      "SELECT to_regclass('public.app_states') AS legacy_table"
    );
    if (!existing.rows[0].legacy_table) return false;
    const legacy = await client.query(
      "SELECT state FROM app_states WHERE access_code = $1",
      [code]
    );
    state = legacy.rowCount ? normalizedState(legacy.rows[0].state) : null;
  } finally {
    // Lepas koneksi dulu: pool hanya punya 1 koneksi, saveState butuh koneksi sendiri
    client.release();
  }
  if (!state) return false;
  await saveState(code, state);
  return true;
}

const apiRouter = express.Router();

apiRouter.get("/health", (_request: Request, response: Response) => {
  response.json({ database: Boolean(pool) });
});

apiRouter.get("/state/:code", requireDatabase, async (request: Request, response: Response) => {
  const code = String(request.params.code).toUpperCase();
  if (!validCode(code)) {
    response.status(400).json({ message: "Kode akses tidak valid." });
    return;
  }
  try {
    let result = await readState(pool!, code);
    if (!result && (await migrateLegacyState(code)))
      result = await readState(pool!, code);
    if (!result) {
      response.status(404).json({ message: "Data belum dibuat." });
      return;
    }
    response.json(result);
  } catch (error) {
    console.error("Read state error:", error);
    response.status(500).json({ message: "Gagal membaca data." });
  }
});

apiRouter.put("/state/:code", requireDatabase, async (request: Request, response: Response) => {
  const code = String(request.params.code).toUpperCase();
  const state = normalizedState(request.body);
  if (!validCode(code) || !state) {
    response.status(400).json({ message: "Data atau kode akses tidak valid." });
    return;
  }
  try {
    await saveState(code, state);
    const saved = await readState(pool!, code);
    response.json({ updatedAt: saved.updatedAt });
  } catch (error) {
    console.error("PUT state error:", error);
    response.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Data tidak bisa disimpan. Cek isi stok atau resep.",
    });
  }
});

apiRouter.post(
  "/state/:code/checkout",
  requireDatabase,
  async (request: Request, response: Response) => {
    const code = String(request.params.code).toUpperCase();
    const items = request.body?.items;
    const method = String(request.body?.method || "Tunai");
    if (!validCode(code) || !Array.isArray(items) || !items.length) {
      response.status(400).json({ message: "Data kasir tidak valid." });
      return;
    }
    if (!pool) return;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const selected = new Map<string, number>(
        items.map((item: any) => [String(item.productId), asNumber(item.quantity)])
      );
      if (
        [...selected.values()].some(
          (quantity) => !Number.isFinite(quantity) || quantity <= 0
        )
      )
        throw new Error("Jumlah menu tidak valid");
      const menuRows = await client.query(
        `SELECT menu.id, menu.name, menu.price, ingredient.stock_id, ingredient.quantity, ingredient.unit
      FROM menu_items menu LEFT JOIN menu_ingredients ingredient ON ingredient.store_code = menu.store_code AND ingredient.menu_id = menu.id
      WHERE menu.store_code = $1 AND menu.id = ANY($2::text[])`,
        [code, [...selected.keys()]]
      );
      const names = new Map<string, string>();
      const prices = new Map<string, number>();
      const required = new Map<string, number>();
      const menusWithIngredients = new Set<string>();
      for (const row of menuRows.rows) {
        const count = selected.get(row.id) || 0;
        names.set(row.id, row.name);
        prices.set(row.id, asNumber(row.price));
        if (row.stock_id) {
          menusWithIngredients.add(row.id);
          required.set(
            row.stock_id,
            (required.get(row.stock_id) || 0) +
              ingredientBaseUnit(asNumber(row.quantity), row.unit) * count
          );
        }
      }
      if (names.size !== selected.size)
        throw new Error("Menu tidak ditemukan");
      if (menusWithIngredients.size !== selected.size)
        throw new Error("Menu belum punya bahan");
      const stockIds = [...required.keys()];
      const stockRows = stockIds.length
        ? await client.query(
            `SELECT id, quantity, unit FROM stock_items WHERE store_code = $1 AND id = ANY($2::text[]) FOR UPDATE`,
            [code, stockIds]
          )
        : { rows: [] };
      for (const stockId of stockIds) {
        const stock = stockRows.rows.find((row: any) => row.id === stockId);
        if (
          !stock ||
          stockBaseUnit(asNumber(stock.quantity), stock.unit) <
            (required.get(stockId) || 0)
        )
          throw new Error("Stok bahan kurang");
      }
      for (const stockId of stockIds) {
        const stock = stockRows.rows.find((row: any) => row.id === stockId);
        const remaining =
          stockBaseUnit(asNumber(stock.quantity), stock.unit) -
          (required.get(stockId) || 0);
        await client.query(
          `UPDATE stock_items SET quantity = $3, updated_label = 'Baru saja' WHERE store_code = $1 AND id = $2`,
          [code, stockId, remaining / unitFactor(stock.unit)]
        );
      }
      const amount = items.reduce(
        (total: number, item: any) =>
          total +
          (prices.get(String(item.productId)) || 0) * asNumber(item.quantity),
        0
      );
      const title = items
        .map((item: any) => `${names.get(String(item.productId))} x${item.quantity}`)
        .join(", ");
      const sale = {
        id: randomUUID(),
        date: new Date().toISOString().slice(0, 10),
        type: "income",
        title,
        amount,
        method,
      };
      await client.query(
        `INSERT INTO financial_transactions (store_code, id, transaction_date, type, title, amount, method) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          code,
          sale.id,
          sale.date,
          sale.type,
          sale.title,
          sale.amount,
          sale.method,
        ]
      );
      await client.query(
        "UPDATE app_stores SET updated_at = NOW() WHERE access_code = $1",
        [code]
      );
      await client.query("COMMIT");
      // Pakai client yang sama: pool hanya punya 1 koneksi
      const state = await readState(client, code);
      response.json({ ...state, sale });
    } catch (error) {
      await client.query("ROLLBACK");
      response.status(400).json({
        message:
          error instanceof Error ? error.message : "Checkout gagal.",
      });
    } finally {
      client.release();
    }
  }
);

app.use("/api", apiRouter);
app.use("/.netlify/functions/api", apiRouter);
app.use("/", apiRouter);