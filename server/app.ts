import express, { Request, Response, NextFunction } from "express";
import { Pool } from "pg";

export const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const databaseUrl = process.env.DATABASE_URL;

export const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 1,
      idleTimeoutMillis: 3000,
      connectionTimeoutMillis: 10000,
    })
  : null;

let tablesEnsured = false;

export async function ensureTables() {
  if (!pool || tablesEnsured) return;
  let client;
  try {
    client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_stores (
        code VARCHAR(32) PRIMARY KEY,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS stock_items (
        id VARCHAR(64) NOT NULL,
        store_code VARCHAR(32) NOT NULL,
        name VARCHAR(255) NOT NULL,
        quantity NUMERIC(12, 3) NOT NULL DEFAULT 0,
        unit VARCHAR(32) NOT NULL CHECK (unit IN ('kg', 'ons', 'gram', 'liter', 'ml', 'pcs', 'bungkus', 'botol', 'sachet')),
        buy_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
        minimum NUMERIC(12, 3) NOT NULL DEFAULT 0,
        updated_at VARCHAR(64) NOT NULL DEFAULT 'Baru saja',
        PRIMARY KEY (store_code, id),
        CONSTRAINT fk_stock_items_store FOREIGN KEY (store_code) REFERENCES app_stores(code) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS recipes (
        id VARCHAR(64) NOT NULL,
        store_code VARCHAR(32) NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(64) NOT NULL,
        PRIMARY KEY (store_code, id),
        CONSTRAINT fk_recipes_store FOREIGN KEY (store_code) REFERENCES app_stores(code) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        recipe_id VARCHAR(64) NOT NULL,
        store_code VARCHAR(32) NOT NULL,
        stock_id VARCHAR(64) NOT NULL,
        quantity NUMERIC(12, 3) NOT NULL DEFAULT 0,
        unit VARCHAR(32) NOT NULL CHECK (unit IN ('kg', 'ons', 'gram', 'liter', 'ml', 'pcs', 'bungkus', 'botol', 'sachet')),
        PRIMARY KEY (store_code, recipe_id, stock_id),
        CONSTRAINT fk_recipe_ingredients_recipe FOREIGN KEY (store_code, recipe_id) REFERENCES recipes(store_code, id) ON DELETE CASCADE,
        CONSTRAINT fk_recipe_ingredients_stock FOREIGN KEY (store_code, stock_id) REFERENCES stock_items(store_code, id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS menu_items (
        id VARCHAR(64) NOT NULL,
        store_code VARCHAR(32) NOT NULL,
        name VARCHAR(255) NOT NULL,
        price NUMERIC(12, 2) NOT NULL DEFAULT 0,
        recipe_id VARCHAR(64),
        recipe_portions NUMERIC(12, 3) DEFAULT 1,
        PRIMARY KEY (store_code, id),
        CONSTRAINT fk_menu_items_store FOREIGN KEY (store_code) REFERENCES app_stores(code) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS menu_ingredients (
        menu_id VARCHAR(64) NOT NULL,
        store_code VARCHAR(32) NOT NULL,
        stock_id VARCHAR(64) NOT NULL,
        quantity NUMERIC(12, 3) NOT NULL DEFAULT 0,
        unit VARCHAR(32) NOT NULL CHECK (unit IN ('kg', 'ons', 'gram', 'liter', 'ml', 'pcs', 'bungkus', 'botol', 'sachet')),
        PRIMARY KEY (store_code, menu_id, stock_id),
        CONSTRAINT fk_menu_ingredients_menu FOREIGN KEY (store_code, menu_id) REFERENCES menu_items(store_code, id) ON DELETE CASCADE,
        CONSTRAINT fk_menu_ingredients_stock FOREIGN KEY (store_code, stock_id) REFERENCES stock_items(store_code, id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(64) NOT NULL,
        store_code VARCHAR(32) NOT NULL,
        date VARCHAR(32) NOT NULL,
        type VARCHAR(32) NOT NULL CHECK (type IN ('income', 'expense')),
        title VARCHAR(255) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        method VARCHAR(64) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (store_code, id),
        CONSTRAINT fk_transactions_store FOREIGN KEY (store_code) REFERENCES app_stores(code) ON DELETE CASCADE
      );
    `);
    tablesEnsured = true;
  } catch (error) {
    console.error("ensureTables error:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

const requireDatabase = async (req: Request, res: Response, next: NextFunction) => {
  if (!pool) {
    res.status(500).json({ message: "DATABASE_URL belum dikonfigurasi di Netlify." });
    return;
  }
  try {
    await ensureTables();
    next();
  } catch (err) {
    console.error("Database connection failed:", err);
    res.status(500).json({
      message: "Gagal terhubung ke database Neon.",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
};

const validCode = (code: string): boolean => /^[A-Z0-9]{6,12}\$/.test(code);

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

  return {
    stocks: state.stocks,
    recipes: state.recipes,
    products: state.products,
    transactions: state.transactions,
    demoData: Boolean(state.demoData),
  };
}

async function readState(pgPool: Pool, code: string) {
  const storeRes = await pgPool.query("SELECT updated_at FROM app_stores WHERE code = \$1", [code]);
  if (storeRes.rows.length === 0) return null;

  const stocksRes = await pgPool.query(
    "SELECT id, name, quantity::float, unit, buy_price::float as \"buyPrice\", minimum::float, updated_at as \"updatedAt\" FROM stock_items WHERE store_code = \$1",
    [code]
  );
  const recipesRes = await pgPool.query(
    "SELECT id, name, category FROM recipes WHERE store_code = \$1",
    [code]
  );
  const recipeIngRes = await pgPool.query(
    "SELECT recipe_id, stock_id as \"stockId\", quantity::float, unit FROM recipe_ingredients WHERE store_code = \$1",
    [code]
  );
  const productsRes = await pgPool.query(
    "SELECT id, name, price::float, recipe_id as \"recipeId\", recipe_portions::float as \"recipePortions\" FROM menu_items WHERE store_code = \$1",
    [code]
  );
  const menuIngRes = await pgPool.query(
    "SELECT menu_id, stock_id as \"stockId\", quantity::float, unit FROM menu_ingredients WHERE store_code = \$1",
    [code]
  );
  const txRes = await pgPool.query(
    "SELECT id, date, type, title, amount::float, method FROM transactions WHERE store_code = \$1 ORDER BY created_at DESC",
    [code]
  );

  const recipes = recipesRes.rows.map((r) => ({
    ...r,
    ingredients: recipeIngRes.rows
      .filter((ing) => ing.recipe_id === r.id)
      .map(({ recipe_id, ...rest }) => rest),
  }));

  const products = productsRes.rows.map((p) => ({
    ...p,
    ingredients: menuIngRes.rows
      .filter((ing) => ing.menu_id === p.id)
      .map(({ menu_id, ...rest }) => rest),
  }));

  return {
    state: {
      stocks: stocksRes.rows,
      recipes,
      products,
      transactions: txRes.rows,
      demoData: false,
    },
    updatedAt: storeRes.rows[0].updated_at.toISOString(),
  };
}

async function saveState(code: string, state: any) {
  if (!pool) throw new Error("Pool database tidak tersedia.");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      "INSERT INTO app_stores (code, updated_at) VALUES (\$1, NOW()) ON CONFLICT (code) DO UPDATE SET updated_at = NOW()",
      [code]
    );

    await client.query("DELETE FROM stock_items WHERE store_code = \$1", [code]);
    for (const s of state.stocks) {
      await client.query(
        "INSERT INTO stock_items (id, store_code, name, quantity, unit, buy_price, minimum, updated_at) VALUES (\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8)",
        [s.id, code, s.name, s.quantity, s.unit, s.buyPrice || 0, s.minimum || 0, s.updatedAt || "Baru saja"]
      );
    }

    await client.query("DELETE FROM recipes WHERE store_code = \$1", [code]);
    for (const r of state.recipes) {
      await client.query(
        "INSERT INTO recipes (id, store_code, name, category) VALUES (\$1, \$2, \$3, \$4)",
        [r.id, code, r.name, r.category]
      );
      if (Array.isArray(r.ingredients)) {
        for (const ing of r.ingredients) {
          await client.query(
            "INSERT INTO recipe_ingredients (recipe_id, store_code, stock_id, quantity, unit) VALUES (\$1, \$2, \$3, \$4, \$5)",
            [r.id, code, ing.stockId, ing.quantity, ing.unit]
          );
        }
      }
    }

    await client.query("DELETE FROM menu_items WHERE store_code = \$1", [code]);
    for (const p of state.products) {
      await client.query(
        "INSERT INTO menu_items (id, store_code, name, price, recipe_id, recipe_portions) VALUES (\$1, \$2, \$3, \$4, \$5, \$6)",
        [p.id, code, p.name, p.price, p.recipeId || null, p.recipePortions || 1]
      );
      if (Array.isArray(p.ingredients)) {
        for (const ing of p.ingredients) {
          await client.query(
            "INSERT INTO menu_ingredients (menu_id, store_code, stock_id, quantity, unit) VALUES (\$1, \$2, \$3, \$4, \$5)",
            [p.id, code, ing.stockId, ing.quantity, ing.unit]
          );
        }
      }
    }

    await client.query("DELETE FROM transactions WHERE store_code = \$1", [code]);
    for (const t of state.transactions) {
      await client.query(
        "INSERT INTO transactions (id, store_code, date, type, title, amount, method) VALUES (\$1, \$2, \$3, \$4, \$5, \$6, \$7)",
        [t.id, code, t.date, t.type, t.title, t.amount, t.method]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

const apiRouter = express.Router();

apiRouter.get("/state/:code", requireDatabase, async (req: Request, res: Response) => {
  const code = String(req.params.code).toUpperCase();
  if (!validCode(code)) {
    res.status(400).json({ message: "Kode akses tidak valid." });
    return;
  }

  try {
    const data = await readState(pool!, code);
    if (!data) {
      res.status(404).json({ message: "Data belum dibuat." });
      return;
    }
    res.json(data);
  } catch (error) {
    console.error("GET state error:", error);
    res.status(500).json({
      message: "Gagal membaca data dari server.",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});

apiRouter.put("/state/:code", requireDatabase, async (req: Request, res: Response) => {
  const code = String(req.params.code).toUpperCase();

  if (!validCode(code)) {
    res.status(400).json({ message: "Kode akses harus 6-12 karakter alfanumerik." });
    return;
  }

  const state = normalizedState(req.body);
  if (!state) {
    res.status(400).json({ message: "Format data JSON state tidak lengkap (butuh array stocks, recipes, products, transactions)." });
    return;
  }

  try {
    await saveState(code, state);
    const saved = await readState(pool!, code);
    res.json({ updatedAt: saved?.updatedAt || new Date().toISOString() });
  } catch (error) {
    console.error("PUT state error:", error);
    res.status(400).json({
      message: error instanceof Error ? error.message : "Gagal menyimpan data ke database.",
    });
  }
});

app.use("/api", apiRouter);