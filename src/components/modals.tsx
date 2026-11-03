import { useState } from "react";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import type {
  Ingredient,
  IngredientUnit,
  Product,
  Recipe,
  RecipeCategory,
  Stock,
  Transaction,
} from "../lib/app-data";
import { recipeUnit, selectableUnits } from "../lib/app-data";
import { Button, Field, Modal } from "./ui";

export function StockModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (stock: Stock) => void;
}) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<IngredientUnit>("gram");
  const [buyPrice, setBuyPrice] = useState("");
  const [minimum, setMinimum] = useState("");

  const save = () => {
    if (!name.trim()) return;
    const q = Number(quantity);
    const p = Number(buyPrice);
    const m = Number(minimum);
    if (Number.isNaN(q) || Number.isNaN(p) || Number.isNaN(m)) return;

    onSave({
      id: crypto.randomUUID(),
      name: name.trim(),
      quantity: q,
      unit,
      buyPrice: p,
      minimum: m,
      updatedAt: "Baru saja",
    });
  };

  return (
    <Modal title="Tambah Stok Bahan" onClose={onClose}>
      <div className="grid gap-4">
        <Field label="Nama bahan">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Daging Ayam"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jumlah stok">
            <input
              type="number"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Satuan">
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as IngredientUnit)}
            >
              <option value="gram">gram</option>
              <option value="kg">kg</option>
              <option value="ml">ml</option>
              <option value="liter">liter</option>
              <option value="pcs">pcs</option>
            </select>
          </Field>
        </div>
        <Field label="Harga beli per unit (Rp)">
          <input
            type="number"
            inputMode="numeric"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="Batas stok minimum">
          <input
            type="number"
            inputMode="decimal"
            value={minimum}
            onChange={(e) => setMinimum(e.target.value)}
            placeholder="0"
          />
        </Field>
        <Button onClick={save} full>
          Simpan Bahan
        </Button>
      </div>
    </Modal>
  );
}

export function RestockModal({
  stock,
  onClose,
  onSave,
}: {
  stock: Stock;
  onClose: () => void;
  onSave: (quantity: number, buyPrice: number, method: string) => void;
}) {
  const [quantity, setQuantity] = useState("");
  const [buyPrice, setBuyPrice] = useState(String(stock.buyPrice));
  const [method, setMethod] = useState("Tunai");

  const save = () => {
    const q = Number(quantity);
    const p = Number(buyPrice);
    if (!quantity || Number.isNaN(q) || q <= 0 || Number.isNaN(p) || p < 0) return;
    onSave(q, p, method);
  };

  return (
    <Modal title={`Restok ${stock.name}`} onClose={onClose}>
      <div className="grid gap-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-400">Stok Saat Ini</p>
          <p className="text-lg font-bold text-ink">
            {stock.quantity} {stock.unit}
          </p>
        </div>
        <Field label={`Jumlah Tambahan (${stock.unit})`}>
          <input
            type="number"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="Harga Beli Per Unit Baru (Rp)">
          <input
            type="number"
            inputMode="numeric"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
          />
        </Field>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Metode Pembayaran
          </p>
          <div className="grid grid-cols-2 gap-2">
            {["Tunai", "QRIS"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`rounded-xl py-2.5 text-xs font-semibold transition ${
                  method === m
                    ? "bg-moss text-white shadow-2xs"
                    : "border border-line bg-slate-50 text-slate-600"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={save} full>
          Konfirmasi Restok
        </Button>
      </div>
    </Modal>
  );
}

export function EditStockModal({
  stock,
  onClose,
  onSave,
}: {
  stock: Stock;
  onClose: () => void;
  onSave: (stock: Stock) => void;
}) {
  const [name, setName] = useState(stock.name);
  const [quantity, setQuantity] = useState(String(stock.quantity));
  const [unit, setUnit] = useState<IngredientUnit>(stock.unit);
  const [buyPrice, setBuyPrice] = useState(String(stock.buyPrice));
  const [minimum, setMinimum] = useState(String(stock.minimum));

  const save = () => {
    if (!name.trim()) return;
    const q = Number(quantity);
    const p = Number(buyPrice);
    const m = Number(minimum);
    if (Number.isNaN(q) || Number.isNaN(p) || Number.isNaN(m)) return;

    onSave({
      ...stock,
      name: name.trim(),
      quantity: q,
      unit,
      buyPrice: p,
      minimum: m,
      updatedAt: "Baru saja",
    });
  };

  return (
    <Modal title="Edit Stok Bahan" onClose={onClose}>
      <div className="grid gap-4">
        <Field label="Nama bahan">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jumlah stok">
            <input
              type="number"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Field>
          <Field label="Satuan">
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as IngredientUnit)}
            >
              <option value="gram">gram</option>
              <option value="kg">kg</option>
              <option value="ml">ml</option>
              <option value="liter">liter</option>
              <option value="pcs">pcs</option>
            </select>
          </Field>
        </div>
        <Field label="Harga beli per unit (Rp)">
          <input
            type="number"
            inputMode="numeric"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
          />
        </Field>
        <Field label="Batas stok minimum">
          <input
            type="number"
            inputMode="decimal"
            value={minimum}
            onChange={(e) => setMinimum(e.target.value)}
          />
        </Field>
        <Button onClick={save} full>
          Simpan Perubahan
        </Button>
      </div>
    </Modal>
  );
}

export function MenuModal({
  stocks,
  recipes,
  product,
  onClose,
  onSave,
}: {
  stocks: Stock[];
  recipes: Recipe[];
  product?: Product;
  onClose: () => void;
  onSave: (product: Product) => void;
}) {
  const [name, setName] = useState(product?.name || "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || "");
  const [source, setSource] = useState<"recipe" | "direct">(
    product?.recipeId || (product as any)?.selectedRecipes?.length ? "recipe" : "direct"
  );

  const [selectedRecipes, setSelectedRecipes] = useState<
    { recipeId: string; portions: number }[]
  >(() => {
    if ((product as any)?.selectedRecipes?.length) {
      return (product as any).selectedRecipes;
    }
    if (product?.recipeId) {
      return [{ recipeId: product.recipeId, portions: product.recipePortions || 1 }];
    }
    return recipes[0] ? [{ recipeId: recipes[0].id, portions: 1 }] : [];
  });

  const [inputRecipeId, setInputRecipeId] = useState(recipes[0]?.id || "");
  const [inputPortions, setInputPortions] = useState("1");

  const [ingredientId, setIngredientId] = useState(stocks[0]?.id || "");
  const selectedStock = stocks.find((stock) => stock.id === ingredientId);
  const [ingredientUnit, setIngredientUnit] = useState<IngredientUnit>(
    selectableUnits(selectedStock)[0] || "gram"
  );
  const [ingredientQty, setIngredientQty] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    product?.ingredients || []
  );
  const [error, setError] = useState("");

  const selectPhoto = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Format berkas harus berupa gambar.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const longestSide = 640;
        const ratio = Math.min(1, longestSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * ratio);
        canvas.height = Math.round(image.height * ratio);
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL("image/webp", 0.68);
        if (compressed.length > 260_000) {
          setError("Ukuran foto terlalu besar.");
          return;
        }
        setImageUrl(compressed);
        setError("");
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const addRecipeItem = () => {
    const p = Number(inputPortions);
    if (!inputRecipeId || !inputPortions || Number.isNaN(p) || p <= 0) {
      setError("Porsi resep harus lebih dari 0.");
      return;
    }
    setError("");
    setSelectedRecipes((cur) => {
      const exists = cur.some((item) => item.recipeId === inputRecipeId);
      if (exists) {
        return cur.map((item) =>
          item.recipeId === inputRecipeId ? { ...item, portions: item.portions + p } : item
        );
      }
      return [...cur, { recipeId: inputRecipeId, portions: p }];
    });
    setInputPortions("1");
  };

  const removeRecipeItem = (id: string) => {
    setSelectedRecipes((cur) => cur.filter((item) => item.recipeId !== id));
  };

  const addIngredient = () => {
    const q = Number(ingredientQty);
    if (!ingredientId || !ingredientQty || Number.isNaN(q) || q <= 0) {
      setError("Takaran bahan harus lebih dari 0.");
      return;
    }
    setError("");
    setIngredients((current) => {
      const next = { stockId: ingredientId, quantity: q, unit: ingredientUnit };
      return current.some((item) => item.stockId === ingredientId)
        ? current.map((item) => (item.stockId === ingredientId ? next : item))
        : [...current, next];
    });
    setIngredientQty("");
  };

  const save = () => {
    if (!name.trim()) {
      setError("Nama menu wajib diisi.");
      return;
    }
    const p = Number(price);
    if (!price || Number.isNaN(p) || p < 0) {
      setError("Harga jual tidak valid.");
      return;
    }

    let finalIngredients: Ingredient[] = [];

    if (source === "recipe") {
      if (!selectedRecipes.length) {
        setError("Tambahkan minimal 1 resep dasar.");
        return;
      }
      const ingredientMap = new Map<string, { quantity: number; unit: IngredientUnit }>();
      for (const rItem of selectedRecipes) {
        const targetRecipe = recipes.find((r) => r.id === rItem.recipeId);
        if (!targetRecipe) continue;
        for (const ing of targetRecipe.ingredients) {
          const addedQty = ing.quantity * rItem.portions;
          const current = ingredientMap.get(ing.stockId);

          const stockData = stocks.find((s) => s.id === ing.stockId);
          const safeUnit: IngredientUnit = ing.unit || selectableUnits(stockData)[0] || "gram";

          if (current) {
            current.quantity += addedQty;
          } else {
            ingredientMap.set(ing.stockId, { quantity: addedQty, unit: safeUnit });
          }
        }
      }
      finalIngredients = Array.from(ingredientMap.entries()).map(([stockId, val]) => ({
        stockId,
        quantity: val.quantity,
        unit: val.unit,
      }));
    } else {
      if (!ingredients.length) {
        setError("Tambahkan minimal 1 bahan baku.");
        return;
      }
      finalIngredients = ingredients;
    }

    setError("");
    onSave({
      id: product?.id || crypto.randomUUID(),
      name: name.trim(),
      price: p,
      imageUrl: imageUrl || undefined,
      recipeId: source === "recipe" ? selectedRecipes[0]?.recipeId : undefined,
      recipePortions: source === "recipe" ? selectedRecipes[0]?.portions : undefined,
      selectedRecipes: source === "recipe" ? selectedRecipes : undefined,
      ingredients: finalIngredients,
    } as any);
  };

  return (
    <Modal title={product ? "Edit Menu" : "Tambah Menu Baru"} onClose={onClose}>
      <div className="grid gap-4">
        {error && (
          <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-3.5 text-xs font-semibold text-rose-700">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        <Field label="Nama menu">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Wonton Keju"
          />
        </Field>
        <Field label="Harga jual (Rp)">
          <input
            type="number"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0"
          />
        </Field>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Foto Menu (opsional)</p>
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-dashed border-line bg-slate-50 p-3">
            {imageUrl ? (
              <img src={imageUrl} alt="Pratinjau menu" className="h-16 w-16 rounded-xl object-cover shadow-2xs" />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-xl bg-white text-xs font-semibold text-slate-400 border border-line">
                Foto
              </div>
            )}
            <div className="min-w-0 flex-1">
              <label className="inline-flex cursor-pointer rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-moss shadow-2xs ring-1 ring-line hover:bg-[#edf6f2] transition active:scale-95">
                Unggah Foto
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => selectPhoto(event.target.files?.[0])}
                />
              </label>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="ml-3 text-xs font-semibold text-rose-600 hover:underline"
                >
                  Hapus
                </button>
              )}
              <p className="mt-1.5 text-[11px] text-slate-400">Gambar dioptimalkan secara otomatis.</p>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Metode Racikan
          </p>
          <div className="grid grid-cols-2 rounded-2xl border border-line bg-slate-50 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSource("recipe")}
              className={`rounded-xl py-2.5 transition ${
                source === "recipe" ? "bg-moss text-white shadow-2xs" : "text-slate-500 font-normal"
              }`}
            >
              Gunakan Resep
            </button>
            <button
              type="button"
              onClick={() => setSource("direct")}
              className={`rounded-xl py-2.5 transition ${
                source === "direct" ? "bg-moss text-white shadow-2xs" : "text-slate-500 font-normal"
              }`}
            >
              Racik Manual
            </button>
          </div>
        </div>

        {source === "recipe" ? (
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Tambah Resep Dasar
            </p>
            <div className="grid grid-cols-[1fr_80px_auto] gap-2">
              <select
                value={inputRecipeId}
                onChange={(e) => setInputRecipeId(e.target.value)}
              >
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name} ({recipe.category})
                  </option>
                ))}
              </select>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0.1"
                value={inputPortions}
                onChange={(e) => setInputPortions(e.target.value)}
                placeholder="Porsi"
              />
              <button
                type="button"
                onClick={addRecipeItem}
                className="grid h-12 w-12 place-items-center rounded-2xl bg-moss text-white transition active:scale-95"
                title="Tambah Resep"
              >
                <Plus size={18} />
              </button>
            </div>

            {selectedRecipes.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {selectedRecipes.map((rItem) => {
                  const rData = recipes.find((r) => r.id === rItem.recipeId);
                  return (
                    <div
                      key={rItem.recipeId}
                      className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 text-xs font-semibold shadow-2xs"
                    >
                      <span className="text-ink font-medium">{rData?.name || "Resep"}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-moss">{rItem.portions} Porsi</span>
                        <button
                          type="button"
                          onClick={() => removeRecipeItem(rItem.recipeId)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Tambah Komposisi Bahan
            </p>
            <div className="grid grid-cols-[1fr_80px_auto] gap-2">
              <select
                value={ingredientId}
                onChange={(e) => {
                  setIngredientId(e.target.value);
                  const st = stocks.find((s) => s.id === e.target.value);
                  setIngredientUnit(selectableUnits(st)[0] || "gram");
                }}
              >
                {stocks.map((stock) => (
                  <option key={stock.id} value={stock.id}>
                    {stock.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={ingredientQty}
                onChange={(e) => setIngredientQty(e.target.value)}
                placeholder="Takaran"
              />
              <button
                type="button"
                onClick={addIngredient}
                className="grid h-12 w-12 place-items-center rounded-2xl bg-moss text-white transition active:scale-95"
              >
                <Plus size={18} />
              </button>
            </div>
            {ingredients.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {ingredients.map((ing) => {
                  const st = stocks.find((s) => s.id === ing.stockId);
                  return (
                    <div
                      key={ing.stockId}
                      className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-semibold shadow-2xs"
                    >
                      <span className="text-ink font-medium">{st?.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-moss">
                          {ing.quantity} {recipeUnit(ing, st)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setIngredients((cur) =>
                              cur.filter((i) => i.stockId !== ing.stockId)
                            )
                          }
                          className="text-rose-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <Button onClick={save} full>
          {product ? "Simpan Perubahan Menu" : "Buat Menu Baru"}
        </Button>
      </div>
    </Modal>
  );
}

export function RecipeModal({
  stocks,
  recipe,
  onClose,
  onSave,
}: {
  stocks: Stock[];
  recipe?: Recipe;
  onClose: () => void;
  onSave: (recipe: Recipe) => void;
}) {
  const [name, setName] = useState(recipe?.name || "");
  const [category, setCategory] = useState(recipe?.category || "Makanan");
  const [ingredientId, setIngredientId] = useState(stocks[0]?.id || "");
  const selectedStock = stocks.find((stock) => stock.id === ingredientId);
  const [ingredientUnit, setIngredientUnit] = useState<IngredientUnit>(
    selectableUnits(selectedStock)[0] || "gram"
  );
  const [ingredientQty, setIngredientQty] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recipe?.ingredients || []
  );
  const [error, setError] = useState("");

  const addIngredient = () => {
    const q = Number(ingredientQty);
    if (!ingredientId || !ingredientQty || Number.isNaN(q) || q <= 0) {
      setError("Takaran bahan harus lebih dari 0.");
      return;
    }
    setError("");
    setIngredients((current) => {
      const next = { stockId: ingredientId, quantity: q, unit: ingredientUnit };
      return current.some((item) => item.stockId === ingredientId)
        ? current.map((item) => (item.stockId === ingredientId ? next : item))
        : [...current, next];
    });
    setIngredientQty("");
  };

  const save = () => {
    if (!name.trim()) {
      setError("Nama resep wajib diisi.");
      return;
    }
    if (!ingredients.length) {
      setError("Tambahkan minimal 1 bahan baku.");
      return;
    }
    setError("");
    onSave({
      id: recipe?.id || crypto.randomUUID(),
      name: name.trim(),
      category,
      ingredients,
    });
  };

  return (
    <Modal title={recipe ? "Edit Resep" : "Tambah Resep Baru"} onClose={onClose}>
      <div className="grid gap-4">
        {error && (
          <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-3.5 text-xs font-semibold text-rose-700">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        <Field label="Nama resep">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Adonan Wonton"
          />
        </Field>
        <Field label="Kategori">
          <select value={category} onChange={(e) => setCategory(e.target.value as RecipeCategory)}>
            <option value="Makanan">Makanan</option>
            <option value="Minuman">Minuman</option>
          </select>
        </Field>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Tambah Komposisi Bahan
          </p>
          <div className="grid grid-cols-[1fr_80px_auto] gap-2">
            <select
              value={ingredientId}
              onChange={(e) => {
                setIngredientId(e.target.value);
                const st = stocks.find((s) => s.id === e.target.value);
                setIngredientUnit(selectableUnits(st)[0] || "gram");
              }}
            >
              {stocks.map((stock) => (
                <option key={stock.id} value={stock.id}>
                  {stock.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={ingredientQty}
              onChange={(e) => setIngredientQty(e.target.value)}
              placeholder="Takaran"
            />
            <button
              type="button"
              onClick={addIngredient}
              className="grid h-12 w-12 place-items-center rounded-2xl bg-moss text-white transition active:scale-95"
            >
              <Plus size={18} />
            </button>
          </div>

          {ingredients.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {ingredients.map((ing) => {
                const st = stocks.find((s) => s.id === ing.stockId);
                return (
                  <div
                    key={ing.stockId}
                    className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-semibold shadow-2xs"
                  >
                    <span className="text-ink font-medium">{st?.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-moss">
                        {ing.quantity} {recipeUnit(ing, st)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setIngredients((cur) =>
                            cur.filter((i) => i.stockId !== ing.stockId)
                          )
                        }
                        className="text-rose-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Button onClick={save} full>
          {recipe ? "Simpan Perubahan Resep" : "Buat Resep Baru"}
        </Button>
      </div>
    </Modal>
  );
}

export function FinanceModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
}) {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Tunai");

  const save = () => {
    if (!title.trim()) return;
    const a = Number(amount);
    if (!amount || Number.isNaN(a) || a <= 0) return;

    onSave({
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      type,
      title: title.trim(),
      amount: a,
      method,
    });
  };

  return (
    <Modal title="Tambah Transaksi Manual" onClose={onClose}>
      <div className="grid gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Tipe Transaksi
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={`rounded-xl py-2.5 text-xs font-semibold transition ${
                type === "expense"
                  ? "bg-rose-600 text-white shadow-2xs"
                  : "border border-line bg-slate-50 text-slate-600"
              }`}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={`rounded-xl py-2.5 text-xs font-semibold transition ${
                type === "income"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "border border-line bg-slate-50 text-slate-600"
              }`}
            >
              Pemasukan
            </button>
          </div>
        </div>
        <Field label="Keterangan">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Operasional Kebersihan"
          />
        </Field>
        <Field label="Nominal (Rp)">
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
        </Field>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Metode Pembayaran
          </p>
          <div className="grid grid-cols-2 gap-2">
            {["Tunai", "QRIS"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`rounded-xl py-2.5 text-xs font-semibold transition ${
                  method === m
                    ? "bg-moss text-white shadow-2xs"
                    : "border border-line bg-slate-50 text-slate-600"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={save} full>
          Simpan Transaksi
        </Button>
      </div>
    </Modal>
  );
}

export function ConnectionModal({
  currentCode,
  busy,
  onClose,
  onConnect,
  onDisconnect,
}: {
  currentCode: string | null;
  busy?: boolean;
  onClose: () => void;
  onConnect: (code: string) => void;
  onDisconnect: () => void;
}) {
  const [code, setCode] = useState(currentCode || "");

  // Fungsi untuk membuat kode akses acak 6 karakter
  const generateNewCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let newCode = "";
    for (let i = 0; i < 6; i++) {
      newCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(newCode);
  };

  return (
    <Modal title="Sinkronisasi HP / Toko" onClose={onClose}>
      <div className="grid gap-4">
        <p className="text-xs font-normal text-slate-500">
          Masukkan atau buat kode akses toko untuk menyambungkan transaksi dan stok antar HP secara otomatis.
        </p>

        <Field label="Kode Akses Toko">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder=""
            maxLength={12}
          />
        </Field>

        {/* Tombol Buat Kode Baru jika belum terhubung */}
        {!currentCode && (
          <button
            type="button"
            onClick={generateNewCode}
            className="w-fit text-xs font-semibold text-moss hover:underline"
          >
            + Buat Kode Baru Otomatis
          </button>
        )}

        <div className="flex gap-2 pt-2">
          <Button disabled={busy || !code.trim()} onClick={() => onConnect(code)} full>
            {busy ? "Menyambungkan..." : "Hubungkan Perangkat"}
          </Button>
          {currentCode && (
            <Button secondary disabled={busy} onClick={onDisconnect}>
              Putus
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function DeleteModal({
  target,
  onClose,
  onDelete,
}: {
  target: { type: "stock" | "menu" | "recipe"; id: string; name: string };
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <Modal title="Konfirmasi Hapus" onClose={onClose}>
      <div className="grid gap-4">
        <p className="text-sm font-normal text-slate-600">
          Apakah kamu yakin ingin menghapus{" "}
          <strong className="text-ink font-semibold">{target.name}</strong>? Tindakan ini tidak dapat dibatalkan.
        </p>
        <div className="flex gap-2">
          <Button secondary onClick={onClose} full>
            Batal
          </Button>
          <button
            onClick={onDelete}
            className="w-full rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 active:scale-95 transition"
          >
            Hapus Sekarang
          </button>
        </div>
      </div>
    </Modal>
  );
}