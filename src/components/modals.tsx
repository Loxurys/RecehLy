import { useState } from "react";
import { AlertCircle, Check, ImagePlus, Plus, Smartphone, Trash2 } from "lucide-react";
import type {
  Ingredient,
  IngredientUnit,
  Product,
  Recipe,
  Stock,
  Transaction,
} from "../lib/app-data";
import { recipeUnit, rupiah, selectableUnits } from "../lib/app-data";
import { makeAccessCode, normalizeAccessCode } from "../lib/remote-store";
import { Button, Field, Modal } from "./ui";

export function StockModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (stock: Stock) => void;
}) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState<Stock["unit"]>("kg");
  const [priceMode, setPriceMode] = useState<"unit" | "total">("unit");
  const [unitPrice, setUnitPrice] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [minimum, setMinimum] = useState("");
  const [error, setError] = useState("");

  const price =
    priceMode === "total" && Number(qty)
      ? Number(totalPrice) / Number(qty)
      : Number(unitPrice);

  const save = () => {
    if (!name.trim()) {
      setError("Nama bahan harus diisi.");
      return;
    }
    const q = Number(qty);
    if (!qty || Number.isNaN(q) || q <= 0) {
      setError("Jumlah dibeli harus lebih dari 0.");
      return;
    }
    if (!price || Number.isNaN(price) || price < 0) {
      setError("Harga pembelian harus valid.");
      return;
    }
    setError("");
    onSave({
      id: crypto.randomUUID(),
      name: name.trim(),
      quantity: q,
      unit,
      buyPrice: price,
      minimum: Math.max(0, Number(minimum) || 0),
      updatedAt: "Baru saja",
    });
  };

  return (
    <Modal title="Tambah bahan baru" onClose={onClose}>
      <div className="grid gap-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        <Field label="Nama bahan">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Daging sapi"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jumlah dibeli">
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Satuan">
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as Stock["unit"])}
            >
              <option value="kg">Kilogram</option>
              <option vaule="Ons">Ons</option>
              <option value="gram">Gram</option>
              <option value="pcs">Pcs</option>
            </select>
          </Field>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            Harga pembelian
          </p>
          <div className="mb-3 grid grid-cols-2 rounded-xl border border-line p-1 text-sm">
            <button
              type="button"
              onClick={() => setPriceMode("unit")}
              className={`rounded-lg px-3 py-2 font-bold transition ${priceMode === "unit" ? "bg-moss text-white shadow-xs" : "text-slate-500 hover:text-ink"}`}
            >
              Per satuan
            </button>
            <button
              type="button"
              onClick={() => setPriceMode("total")}
              className={`rounded-lg px-3 py-2 font-bold transition ${priceMode === "total" ? "bg-moss text-white shadow-xs" : "text-slate-500 hover:text-ink"}`}
            >
              Total belanja
            </button>
          </div>
          <input
            type="number"
            inputMode="numeric"
            value={priceMode === "unit" ? unitPrice : totalPrice}
            onChange={(e) =>
              priceMode === "unit"
                ? setUnitPrice(e.target.value)
                : setTotalPrice(e.target.value)
            }
            placeholder="0"
            className="w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-moss"
          />
          {priceMode === "total" && (
            <p className="mt-2 text-xs font-medium text-moss">
              Harga per {unit}: {price ? rupiah(price) : "-"}
            </p>
          )}
        </div>
        <Field label="Pengingat stok menipis">
          <input
            type="number"
            inputMode="decimal"
            step="any"
            value={minimum}
            onChange={(e) => setMinimum(e.target.value)}
            placeholder="Sisa berapa baru diingatkan"
          />
        </Field>
        <Button onClick={save} full>
          Simpan bahan & pengeluaran
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
  const [priceMode, setPriceMode] = useState<"unit" | "total">("unit");
  const [unitPrice, setUnitPrice] = useState(String(stock.buyPrice));
  const [totalPrice, setTotalPrice] = useState("");
  const [method, setMethod] = useState("Tunai");
  const [error, setError] = useState("");

  const price =
    priceMode === "total" && Number(quantity)
      ? Number(totalPrice) / Number(quantity)
      : Number(unitPrice);
  const total = Number(quantity) * price;

  const save = () => {
    const q = Number(quantity);
    if (!quantity || Number.isNaN(q) || q <= 0) {
      setError("Jumlah tambahan stok harus lebih dari 0.");
      return;
    }
    if (!price || Number.isNaN(price) || price < 0) {
      setError("Harga pembelian harus valid.");
      return;
    }
    setError("");
    onSave(q, price, method);
  };

  return (
    <Modal title={`Tambah stok: ${stock.name}`} onClose={onClose}>
      <div className="grid gap-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        <div className="rounded-xl bg-slate-50 p-3 text-sm">
          <p className="text-xs text-slate-500">Stok saat ini</p>
          <p className="mt-0.5 font-bold text-ink">
            {stock.quantity} {stock.unit}
          </p>
        </div>
        <Field label={`Jumlah dibeli (${stock.unit})`}>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
          />
        </Field>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            Harga pembelian
          </p>
          <div className="mb-3 grid grid-cols-2 rounded-xl border border-line p-1 text-sm">
            <button
              type="button"
              onClick={() => setPriceMode("unit")}
              className={`rounded-lg px-3 py-2 font-bold transition ${priceMode === "unit" ? "bg-moss text-white shadow-xs" : "text-slate-500 hover:text-ink"}`}
            >
              Per satuan
            </button>
            <button
              type="button"
              onClick={() => setPriceMode("total")}
              className={`rounded-lg px-3 py-2 font-bold transition ${priceMode === "total" ? "bg-moss text-white shadow-xs" : "text-slate-500 hover:text-ink"}`}
            >
              Total belanja
            </button>
          </div>
          <input
            type="number"
            inputMode="numeric"
            value={priceMode === "unit" ? unitPrice : totalPrice}
            onChange={(e) =>
              priceMode === "unit"
                ? setUnitPrice(e.target.value)
                : setTotalPrice(e.target.value)
            }
            placeholder="0"
            className="w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-moss"
          />
          {priceMode === "total" && (
            <p className="mt-2 text-xs font-medium text-moss">
              Harga per {stock.unit}: {price ? rupiah(price) : "-"}
            </p>
          )}
        </div>
        <Field label="Metode pembayaran belanja">
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option>Tunai</option>
            <option>QRIS</option>
            <option>Transfer</option>
          </select>
        </Field>
        <div className="rounded-xl bg-[#edf6f2] px-3.5 py-2.5 text-xs font-semibold text-moss">
          Total biaya: {total ? rupiah(total) : rupiah(0)} (otomatis dicatat di pengeluaran)
        </div>
        <Button onClick={save} full>
          Tambah stok & catat belanja
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
  const [unit, setUnit] = useState<Stock["unit"]>(stock.unit);
  const [priceMode, setPriceMode] = useState<"unit" | "total">("unit");
  const [unitPrice, setUnitPrice] = useState(String(stock.buyPrice));
  const [totalPrice, setTotalPrice] = useState(
    String(stock.buyPrice * stock.quantity),
  );
  const [minimum, setMinimum] = useState(String(stock.minimum));
  const [error, setError] = useState("");

  const price =
    priceMode === "total" && Number(quantity)
      ? Number(totalPrice) / Number(quantity)
      : Number(unitPrice);

  const save = () => {
    if (!name.trim()) {
      setError("Nama bahan harus diisi.");
      return;
    }
    const q = Number(quantity);
    if (Number.isNaN(q) || q < 0) {
      setError("Jumlah stok tidak boleh negatif.");
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      setError("Harga pembelian harus valid.");
      return;
    }
    setError("");
    onSave({
      ...stock,
      name: name.trim(),
      quantity: q,
      unit,
      buyPrice: price,
      minimum: Math.max(0, Number(minimum) || 0),
      updatedAt: "Baru saja",
    });
  };

  return (
    <Modal title="Ubah bahan" onClose={onClose}>
      <div className="grid gap-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        <Field label="Nama bahan">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Daging sapi"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Stok tersedia">
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Field>
          <Field label="Satuan">
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as Stock["unit"])}
            >
              <option value="kg">Kilogram</option>
              <option> value="Ons"</option>
              <option value="gram">Gram</option>
              <option value="pcs">Pcs</option>
            </select>
          </Field>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            Harga beli satuan
          </p>
          <div className="mb-3 grid grid-cols-2 rounded-xl border border-line p-1 text-sm">
            <button
              type="button"
              onClick={() => setPriceMode("unit")}
              className={`rounded-lg px-3 py-2 font-bold transition ${priceMode === "unit" ? "bg-moss text-white shadow-xs" : "text-slate-500 hover:text-ink"}`}
            >
              Per satuan
            </button>
            <button
              type="button"
              onClick={() => setPriceMode("total")}
              className={`rounded-lg px-3 py-2 font-bold transition ${priceMode === "total" ? "bg-moss text-white shadow-xs" : "text-slate-500 hover:text-ink"}`}
            >
              Total nilai stok
            </button>
          </div>
          <input
            type="number"
            inputMode="numeric"
            value={priceMode === "unit" ? unitPrice : totalPrice}
            onChange={(e) =>
              priceMode === "unit"
                ? setUnitPrice(e.target.value)
                : setTotalPrice(e.target.value)
            }
            className="w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-moss"
          />
          {priceMode === "total" && (
            <p className="mt-2 text-xs font-medium text-moss">
              Harga per {unit}: {price ? rupiah(price) : "-"}
            </p>
          )}
        </div>
        <Field label="Pengingat stok menipis">
          <input
            type="number"
            inputMode="decimal"
            step="any"
            value={minimum}
            onChange={(e) => setMinimum(e.target.value)}
          />
        </Field>
        <Button onClick={save} full>
          Simpan perubahan
        </Button>
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
  const label =
    target.type === "stock"
      ? "bahan"
      : target.type === "recipe"
        ? "resep"
        : "menu";
  return (
    <Modal title={`Hapus ${label}`} onClose={onClose}>
      <p className="text-sm leading-6 text-slate-600">
        Yakin ingin menghapus <strong className="text-ink">{target.name}</strong>? Tindakan ini tidak dapat dibatalkan.
      </p>
      <div className="mt-5 flex gap-3">
        <Button secondary onClick={onClose} full>
          Batal
        </Button>
        <button
          onClick={onDelete}
          className="w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-700 active:scale-[0.98]"
        >
          Ya, Hapus
        </button>
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
    product?.recipeId ? "recipe" : "direct",
  );
  const [recipeId, setRecipeId] = useState(
    product?.recipeId || recipes[0]?.id || "",
  );
  const [recipePortions, setRecipePortions] = useState(
    String(product?.recipePortions || 1),
  );
  const [ingredientId, setIngredientId] = useState(stocks[0]?.id || "");
  const selectedStock = stocks.find((stock) => stock.id === ingredientId);
  const [ingredientUnit, setIngredientUnit] = useState<IngredientUnit>(
    selectableUnits(selectedStock)[0] || "gram",
  );
  const [ingredientQty, setIngredientQty] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    product?.ingredients || [],
  );
  const [error, setError] = useState("");

  const selectedRecipe = recipes.find((recipe) => recipe.id === recipeId);

  const selectPhoto = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Pilih file gambar.");
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
          setError("Foto terlalu besar. Pilih foto lain yang lebih sederhana.");
          return;
        }
        setImageUrl(compressed);
        setError("");
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const selectIngredient = (id: string) => {
    const stock = stocks.find((item) => item.id === id);
    setIngredientId(id);
    setIngredientUnit(selectableUnits(stock)[0] || "gram");
  };

  const addIngredient = () => {
    const q = Number(ingredientQty);
    if (!ingredientId || !ingredientQty || Number.isNaN(q) || q <= 0) {
      setError("Jumlah takaran bahan harus lebih dari 0.");
      return;
    }
    setError("");
    setIngredients((current) => {
      const next = {
        stockId: ingredientId,
        quantity: q,
        unit: ingredientUnit,
      };
      return current.some((item) => item.stockId === ingredientId)
        ? current.map((item) => (item.stockId === ingredientId ? next : item))
        : [...current, next];
    });
    setIngredientQty("");
  };

  const save = () => {
    if (!name.trim()) {
      setError("Nama menu harus diisi.");
      return;
    }
    const p = Number(price);
    if (!price || Number.isNaN(p) || p < 0) {
      setError("Harga jual harus diisi angka yang valid.");
      return;
    }

    const portions = Math.max(1, Number(recipePortions) || 1);
    let finalIngredients: Ingredient[] = [];

    if (source === "recipe") {
      if (!selectedRecipe) {
        setError("Pilih resep terlebih dahulu.");
        return;
      }
      if (!selectedRecipe.ingredients.length) {
        setError("Resep ini belum memiliki bahan. Isi bahan pada menu Resep terlebih dahulu.");
        return;
      }
      finalIngredients = selectedRecipe.ingredients.map((ingredient) => ({
        ...ingredient,
        quantity: ingredient.quantity * portions,
      }));
    } else {
      if (!ingredients.length) {
        setError("Tambahkan minimal 1 bahan untuk menu ini.");
        return;
      }
      finalIngredients = ingredients;
    }

    if (finalIngredients.some((i) => i.quantity <= 0)) {
      setError("Semua bahan harus memiliki takaran lebih dari 0.");
      return;
    }

    setError("");
    onSave({
      id: product?.id || crypto.randomUUID(),
      name: name.trim(),
      price: p,
      imageUrl: imageUrl.trim() || undefined,
      recipeId: source === "recipe" ? recipeId : undefined,
      recipePortions: source === "recipe" ? portions : undefined,
      ingredients: finalIngredients,
    });
  };

  return (
    <Modal title={product ? "Ubah menu" : "Buat menu baru"} onClose={onClose}>
      <div className="grid gap-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        <Field label="Nama menu">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Contoh: Bakso Telur"
          />
        </Field>
        <Field label="Harga jual (Rp)">
          <input
            type="number"
            inputMode="numeric"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="0"
          />
        </Field>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Foto menu, opsional</p>
          <div className="mt-2 flex items-center gap-3 rounded-xl border border-dashed border-line bg-slate-50 p-3">
            {imageUrl ? (
              <img src={imageUrl} alt="Pratinjau menu" className="h-16 w-16 rounded-lg object-cover" />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-lg bg-white text-slate-400">
                <ImagePlus size={22} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <label className="inline-flex cursor-pointer rounded-lg bg-white px-3 py-2 text-xs font-bold text-moss shadow-2xs ring-1 ring-line hover:bg-[#edf6f2]">
                Pilih dari galeri
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => selectPhoto(event.target.files?.[0])} />
              </label>
              {imageUrl && <button type="button" onClick={() => setImageUrl("")} className="ml-3 text-xs font-bold text-rose-600">Hapus</button>}
              <p className="mt-1.5 text-[11px] text-slate-500">Foto diperkecil otomatis sebelum disimpan.</p>
            </div>
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            Sumber bahan baku
          </p>
          <div className="grid grid-cols-2 rounded-xl border border-line p-1 text-sm">
            <button
              type="button"
              onClick={() => setSource("recipe")}
              className={`rounded-lg px-3 py-2 font-bold transition ${
                source === "recipe"
                  ? "bg-moss text-white shadow-xs"
                  : "text-slate-500 hover:text-ink"
              }`}
            >
              Pakai resep
            </button>
            <button
              type="button"
              onClick={() => setSource("direct")}
              className={`rounded-lg px-3 py-2 font-bold transition ${
                source === "direct"
                  ? "bg-moss text-white shadow-xs"
                  : "text-slate-500 hover:text-ink"
              }`}
            >
              Racik sendiri
            </button>
          </div>
        </div>

        {source === "recipe" ? (
          <div className="rounded-xl bg-slate-50 p-3.5">
            {recipes.length === 0 ? (
              <p className="text-xs text-rose-600">
                Belum ada resep. Buat resep dulu di tab Resep, atau gunakan pilihan "Racik sendiri".
              </p>
            ) : (
              <>
                <Field label="Pilih resep">
                  <select
                    value={recipeId}
                    onChange={(event) => setRecipeId(event.target.value)}
                  >
                    {recipes.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.name} ({recipe.category})
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="mt-3">
                  <Field label="Jumlah porsi resep per sajian menu">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0.1"
                      step="any"
                      value={recipePortions}
                      onChange={(event) => setRecipePortions(event.target.value)}
                      placeholder="1"
                    />
                  </Field>
                </div>
                {selectedRecipe && (
                  <div className="mt-3 border-t border-slate-200/80 pt-2.5">
                    <p className="text-xs font-bold text-slate-600">Bahan dalam resep ini:</p>
                    <div className="mt-1.5 space-y-1">
                      {selectedRecipe.ingredients.map((ing) => {
                        const st = stocks.find((s) => s.id === ing.stockId);
                        const mult = Number(recipePortions) || 1;
                        return (
                          <div key={ing.stockId} className="flex justify-between text-xs text-slate-600">
                            <span>{st?.name || "Bahan"}</span>
                            <span className="font-semibold">
                              {(ing.quantity * mult).toLocaleString("id-ID")} {ing.unit || st?.unit}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-slate-50 p-3.5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Bahan baku langsung
            </p>
            <div className="grid grid-cols-[1fr_80px_72px_auto] gap-2">
              <select
                value={ingredientId}
                onChange={(event) => selectIngredient(event.target.value)}
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
                onChange={(event) => setIngredientQty(event.target.value)}
                placeholder="Takaran"
              />
              <select
                value={ingredientUnit}
                onChange={(event) =>
                  setIngredientUnit(event.target.value as IngredientUnit)
                }
              >
                {selectableUnits(selectedStock).map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addIngredient}
                className="grid h-11 w-11 place-items-center rounded-xl bg-moss text-white transition active:scale-95"
                title="Tambah bahan"
              >
                <Plus size={18} />
              </button>
            </div>
            {ingredients.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {ingredients.map((ingredient) => {
                  const st = stocks.find((stock) => stock.id === ingredient.stockId);
                  return (
                    <div
                      key={ingredient.stockId}
                      className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm shadow-2xs"
                    >
                      <span className="font-medium text-slate-800">{st?.name || "Bahan"}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-moss">
                          {ingredient.quantity} {recipeUnit(ingredient, st)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setIngredients((current) =>
                              current.filter(
                                (item) => item.stockId !== ingredient.stockId,
                              ),
                            )
                          }
                          className="rounded-lg p-1 text-rose-500 hover:bg-rose-50"
                          title="Hapus"
                        >
                          <Trash2 size={15} />
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
          {product ? "Simpan perubahan menu" : "Simpan menu baru"}
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
  const [category, setCategory] = useState<Recipe["category"]>(
    recipe?.category || "Makanan",
  );
  const [ingredientId, setIngredientId] = useState(stocks[0]?.id || "");
  const selectedStock = stocks.find((stock) => stock.id === ingredientId);
  const [ingredientQty, setIngredientQty] = useState("");
  const [ingredientUnit, setIngredientUnit] = useState<IngredientUnit>(
    selectableUnits(selectedStock)[0] || "gram",
  );
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recipe?.ingredients || [],
  );
  const [error, setError] = useState("");

  const selectIngredient = (id: string) => {
    const stock = stocks.find((item) => item.id === id);
    setIngredientId(id);
    setIngredientUnit(selectableUnits(stock)[0] || "gram");
  };

  const addIngredient = () => {
    const q = Number(ingredientQty);
    if (!ingredientId || !ingredientQty || Number.isNaN(q) || q <= 0) {
      setError("Masukkan takaran bahan lebih dari 0.");
      return;
    }
    setError("");
    const next = {
      stockId: ingredientId,
      quantity: q,
      unit: ingredientUnit,
    };
    setIngredients((current) =>
      current.some((ingredient) => ingredient.stockId === ingredientId)
        ? current.map((ingredient) =>
            ingredient.stockId === ingredientId ? next : ingredient,
          )
        : [...current, next],
    );
    setIngredientQty("");
  };

  const updateIngredient = (
    stockId: string,
    field: "quantity" | "unit",
    value: number | IngredientUnit,
  ) =>
    setIngredients((current) =>
      current.map((ingredient) =>
        ingredient.stockId === stockId
          ? { ...ingredient, [field]: value }
          : ingredient,
      ),
    );

  const save = () => {
    if (!name.trim()) {
      setError("Nama resep harus diisi.");
      return;
    }
    if (!ingredients.length) {
      setError("Tambahkan minimal 1 bahan baku untuk resep ini.");
      return;
    }
    if (ingredients.some((ingredient) => ingredient.quantity <= 0)) {
      setError("Semua takaran bahan harus bernilai lebih dari 0.");
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
    <Modal title={recipe ? "Ubah resep" : "Buat resep baru"} onClose={onClose}>
      <div className="grid gap-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        <Field label="Nama resep">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Contoh: Es Teh Manis"
          />
        </Field>
        <Field label="Kategori menu">
          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as Recipe["category"])
            }
          >
            <option>Makanan</option>
            <option>Minuman</option>
          </select>
        </Field>
        <div className="rounded-xl bg-slate-50 p-3.5">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            Bahan dan takaran per porsi
          </p>
          <div className="grid grid-cols-[1fr_80px_72px_auto] gap-2">
            <select
              value={ingredientId}
              onChange={(event) => selectIngredient(event.target.value)}
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
              onChange={(event) => setIngredientQty(event.target.value)}
              placeholder="Takaran"
            />
            <select
              value={ingredientUnit}
              onChange={(event) =>
                setIngredientUnit(event.target.value as IngredientUnit)
              }
            >
              {selectableUnits(selectedStock).map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addIngredient}
              className="grid h-11 w-11 place-items-center rounded-xl bg-moss text-white transition active:scale-95"
              title="Tambah bahan"
            >
              <Plus size={18} />
            </button>
          </div>
          {ingredients.map((ingredient) => {
            const stock = stocks.find((item) => item.id === ingredient.stockId);
            return (
              <div
                key={ingredient.stockId}
                className="mt-2 grid grid-cols-[1fr_75px_72px_auto] items-center gap-2 rounded-xl bg-white p-2 text-sm shadow-2xs"
              >
                <span className="font-medium text-slate-800 truncate">{stock?.name || "Bahan"}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={ingredient.quantity || ""}
                  onChange={(event) =>
                    updateIngredient(
                      ingredient.stockId,
                      "quantity",
                      Number(event.target.value),
                    )
                  }
                  className="w-full rounded-lg border border-line px-2 py-1.5 text-xs text-center"
                />
                <select
                  value={recipeUnit(ingredient, stock)}
                  onChange={(event) =>
                    updateIngredient(
                      ingredient.stockId,
                      "unit",
                      event.target.value as IngredientUnit,
                    )
                  }
                  className="rounded-lg border border-line bg-white px-2 py-1.5 text-xs"
                >
                  {selectableUnits(stock).map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    setIngredients((current) =>
                      current.filter(
                        (item) => item.stockId !== ingredient.stockId,
                      ),
                    )
                  }
                  className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                  title="Hapus bahan"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
        <Button onClick={save} full>
          {recipe ? "Simpan perubahan resep" : "Simpan resep baru"}
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
  const [error, setError] = useState("");

  const save = () => {
    if (!title.trim()) {
      setError("Keterangan transaksi harus diisi.");
      return;
    }
    const a = Number(amount);
    if (!amount || Number.isNaN(a) || a <= 0) {
      setError("Nominal harus lebih dari 0.");
      return;
    }
    setError("");
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
    <Modal title="Catat transaksi keuangan" onClose={onClose}>
      <div className="grid gap-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        <Field label="Jenis transaksi">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "income" | "expense")}
          >
            <option value="expense">Pengeluaran (Biaya)</option>
            <option value="income">Pemasukan (Lain-lain)</option>
          </select>
        </Field>
        <Field label="Keterangan">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Belanja gas LPG / Sayur"
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
        <Field label="Metode pembayaran">
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option>Tunai</option>
            <option>QRIS</option>
            <option>Transfer</option>
          </select>
        </Field>
        <Button onClick={save} full>
          Simpan transaksi
        </Button>
      </div>
    </Modal>
  );
}

export function ReceiptModal({
  sale,
  onClose,
}: {
  sale: Transaction;
  onClose: () => void;
}) {
  const [phone, setPhone] = useState("");
  const send = () => {
    const normalized = phone.replace(/^0/, "62").replace(/\D/g, "");
    if (!normalized) return;
    const message = encodeURIComponent(
      `*E-STRUK PEMBELIAN*\n------------------------\n${sale.title}\nTotal: *${rupiah(sale.amount)}*\nMetode: ${sale.method}\nTanggal: ${sale.date}\n------------------------\nTerima kasih atas kunjungan Anda! 🙏`,
    );
    window.open(`https://wa.me/${normalized}?text=${message}`, "_blank");
  };

  return (
    <Modal title="Pembayaran berhasil" onClose={onClose}>
      <div className="rounded-2xl bg-emerald-50 p-5 text-center text-emerald-900">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-600 text-white shadow-sm">
          <Check size={24} />
        </div>
        <p className="text-2xl font-bold tracking-tight text-emerald-950">{rupiah(sale.amount)}</p>
        <p className="mt-1 text-xs font-semibold text-emerald-700">
          Metode: {sale.method} · Stok & Pembukuan Otomatis Terpotong
        </p>
      </div>
      <div className="mt-5">
        <Field label="Kirim e-Struk via WhatsApp (Opsional)">
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Nomor HP WhatsApp (Contoh: 08123456789)"
          />
        </Field>
        <div className="mt-4 flex gap-3">
          <Button secondary onClick={onClose} full>
            Selesai
          </Button>
          <Button onClick={send} full>
            <Smartphone size={18} /> Kirim WhatsApp
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function TutorialModal({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      title: "Isi stok",
      description: "Tambahkan bahan dan batas pengingat stok menipis.",
      videoFile: "01-stok-bahan-480p24.mp4",
      details: ["Buka Stok Bahan", "Tekan Tambah bahan", "Isi jumlah, satuan, harga, dan pengingat"],
    },
    {
      title: "Buat menu",
      description: "Pilih resep atau racik sendiri. Foto menu boleh ditambah.",
      videoFile: "02-buat-menu-480p24.mp4",
      details: ["Buka Menu & Resep", "Tekan Buat menu baru", "Pilih foto dari galeri bila diperlukan", "Atur bahan atau pilih resep"],
    },
    {
      title: "Pakai kasir",
      description: "Pilih menu, cek pesanan, lalu selesaikan pembayaran.",
      videoFile: "03-kasir-480p24.mp4",
      details: ["Buka Kasir", "Tekan menu yang dipesan", "Buka keranjang di tombol bawah pada HP", "Pilih metode pembayaran dan selesaikan"],
    },
    {
      title: "Sambungkan HP",
      description: "Gunakan kode sinkronisasi yang sama di perangkat keluarga.",
      videoFile: "04-sinkron-perangkat-480p24.mp4",
      details: ["Tekan status koneksi", "Buat atau masukkan kode sinkronisasi", "Masukkan kode yang sama di HP lain"],
    },
  ];
  const [selected, setSelected] = useState<number | null>(null);
  const [videoUnavailable, setVideoUnavailable] = useState<Record<string, boolean>>({});
  const selectedStep = selected ?? 0;
  const current = selected === null ? null : steps[selectedStep];
  return (
    <Modal title="Cara pakai" onClose={onClose}>
      {current ? (
        <div>
          <button onClick={() => setSelected(null)} className="mb-4 text-xs font-bold text-moss">Kembali ke daftar langkah</button>
          <div className="overflow-hidden rounded-2xl border border-dashed border-moss/30 bg-[#edf6f2] p-3 text-center">
            {videoUnavailable[current.videoFile] ? (
              <div className="mx-auto grid h-36 max-w-xs place-items-center rounded-xl bg-white text-slate-400 shadow-2xs">
                <div><ImagePlus size={26} className="mx-auto" /><p className="mt-1 text-[11px] font-bold">Video belum ditambahkan</p></div>
              </div>
            ) : (
              <video
                className="mx-auto aspect-video w-full max-w-xs rounded-xl bg-slate-900"
                controls
                playsInline
                preload="metadata"
                onError={() => setVideoUnavailable((items) => ({ ...items, [current.videoFile]: true }))}
              >
                <source src={`/tutorial/${current.videoFile}`} type="video/mp4" />
              </video>
            )}
          </div>
          <p className="mt-4 text-sm font-bold text-ink">{current.title}</p>
          <p className="mt-1 font-mono text-[10px] text-slate-400">public/tutorial/{current.videoFile} · 480p · 24fps</p>
          <ol className="mt-3 space-y-2">
            {current.details.map((detail, index) => (
              <li key={detail} className="flex items-start gap-2 text-xs leading-5 text-slate-600"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-moss">{index + 1}</span>{detail}</li>
            ))}
          </ol>
          <div className="mt-5 flex gap-3">
            <Button secondary onClick={() => setSelected(Math.max(0, selectedStep - 1))} disabled={selectedStep === 0} full>Sebelumnya</Button>
            <Button onClick={() => selectedStep === steps.length - 1 ? onClose() : setSelected(selectedStep + 1)} full>{selectedStep === steps.length - 1 ? "Selesai" : "Berikutnya"}</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {steps.map((step, index) => (
            <button key={step.title} onClick={() => setSelected(index)} className="flex gap-3 rounded-xl bg-slate-50 p-3.5 text-left transition hover:bg-[#edf6f2]">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-moss text-xs font-bold text-white">{index + 1}</span>
              <div><p className="text-sm font-bold text-ink">{step.title}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{step.description}</p></div>
            </button>
          ))}
          <Button onClick={onClose} full>Tutup</Button>
        </div>
      )}
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
  busy: boolean;
  onClose: () => void;
  onConnect: (code: string) => void;
  onDisconnect: () => void;
}) {
  const [code, setCode] = useState(currentCode || makeAccessCode());
  const valid = code.length >= 6;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (valid && !busy) {
      onConnect(code);
    }
  };

  return (
    <Modal title="Sinkronisasi antar perangkat" onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="rounded-xl bg-blue-50/70 p-3.5 text-xs text-blue-900 leading-relaxed">
          Pakai kode yang sama di setiap perangkat. Data akan tersimpan dan diperbarui dari database online.
        </div>
        <Field label="Kode sinkronisasi (6–12 karakter)">
          <input
            value={code}
            onChange={(event) => setCode(normalizeAccessCode(event.target.value))}
            maxLength={12}
            className="font-mono uppercase tracking-[0.2em] font-bold text-center text-lg"
            placeholder="CONTOH12"
            autoFocus
          />
        </Field>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCode(makeAccessCode())}
            className="text-xs font-bold text-moss hover:underline"
          >
            + Buat kode acak otomatis
          </button>
          {currentCode && (
            <span className="text-xs font-semibold text-emerald-700">
              Aktif: {currentCode}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button disabled={!valid || busy} onClick={() => onConnect(code)} full>
            {busy ? "Menyambungkan..." : currentCode === code ? "Segarkan koneksi" : "Sambungkan perangkat"}
          </Button>
          {currentCode && (
            <Button secondary onClick={onDisconnect} full>
              Gunakan data perangkat
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
