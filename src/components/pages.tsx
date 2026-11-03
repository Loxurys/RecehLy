import { useState } from "react";
import {
  Package,
  Plus,
  ReceiptText,
  Search,
  ShoppingBasket,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type {
  CartItem,
  Page,
  Product,
  Recipe,
  Stock,
  Transaction,
} from "../lib/app-data";
import { grams, recipeUnit, rupiah, usedStockUnits } from "../lib/app-data";
import { Button, Title } from "./ui";

export function Dashboard({
  lowStock,
  transactions,
  setPage,
}: {
  lowStock: Stock[];
  transactions: Transaction[];
  setPage: (page: Page) => void;
}) {
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      <Title
        title="Dashboard"
        desc="Ringkasan performa penjualan dan status persediaan bahan baku."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-3xl border border-line bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Pemasukan
            </span>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <TrendingUp size={20} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-ink">
            {rupiah(totalIncome)}
          </p>
        </div>

        <div className="rounded-3xl border border-line bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Pengeluaran
            </span>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-50 text-rose-600">
              <TrendingDown size={20} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-ink">
            {rupiah(totalExpense)}
          </p>
        </div>

        <div className="rounded-3xl border border-line bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Stok Menipis
            </span>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-50 text-amber-600">
              <Package size={20} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-ink">
            {lowStock.length} <span className="text-sm font-normal text-slate-400">Bahan</span>
          </p>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-amber-900">
              Peringatan Stok Menipis
            </h3>
            <button
              onClick={() => setPage("stock")}
              className="text-xs font-medium text-amber-700 hover:underline"
            >
              Lihat Semua Stok
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {lowStock.map((stock) => (
              <div
                key={stock.id}
                className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-2xs"
              >
                <span className="text-xs font-medium text-ink">{stock.name}</span>
                <span className="text-xs font-semibold text-rose-600">
                  Sisa: {stock.quantity} {stock.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Cashier({
  products,
  stocks,
  cart,
  total,
  onAdd,
  onUpdate,
  onCheckout,
}: {
  products: Product[];
  stocks: Stock[];
  cart: CartItem[];
  total: number;
  onAdd: (product: Product) => void;
  onUpdate: (id: string, quantity: number) => void;
  onCheckout: (method: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("Tunai");
  const [showMobileCart, setShowMobileCart] = useState(false);

  const visibleProducts = products.filter((product) =>
    product.name.toLowerCase().includes(query.toLowerCase())
  );

  const canFulfill = (product: Product) =>
    product.ingredients.length > 0 &&
    product.ingredients.every((ingredient) => {
      const stock = stocks.find((s) => s.id === ingredient.stockId);
      return (
        stock &&
        grams(stock) >= usedStockUnits(ingredient, stock)
      );
    });

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="relative pb-28 lg:pb-0">
      <Title
        title="Kasir"
        desc="Pilih menu, cek pesanan, lalu selesaikan pembayaran."
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Kolom Daftar Produk */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="mb-4 rounded-3xl border border-line bg-white p-3 shadow-2xs">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari menu..."
                className="w-full rounded-2xl bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium text-ink outline-none focus:bg-white focus:ring-2 focus:ring-moss"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
            {visibleProducts.map((product) => {
              const ready = canFulfill(product);
              const inCart = cart.find((c) => c.product.id === product.id);
              return (
                <button
                  key={product.id}
                  disabled={!ready}
                  onClick={() => ready && onAdd(product)}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border text-left transition duration-200 active:scale-[0.97] ${
                    ready
                      ? inCart
                        ? "border-moss bg-white shadow-md ring-2 ring-moss"
                        : "border-line bg-white hover:border-moss/40 shadow-2xs hover:shadow-md"
                      : "border-rose-200 bg-rose-50/40 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <div className="relative h-32 w-full overflow-hidden bg-slate-100 sm:h-44">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#edf6f2] text-moss">
                        <ReceiptText size={32} />
                      </div>
                    )}

                    <div className="absolute top-2 right-2 z-10 flex gap-1">
                      {!ready ? (
                        <span className="rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-semibold text-white shadow-xs">
                          Habis
                        </span>
                      ) : inCart ? (
                        <span className="rounded-full bg-moss px-2.5 py-1 text-[10px] font-semibold text-white shadow-md">
                          {inCart.quantity}x
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-3 sm:p-4">
                    <div>
                      <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-ink sm:text-base">
                        {product.name}
                      </h3>
                      <p className="mt-1 text-[10px] font-normal text-slate-400 sm:text-[11px]">
                        {product.ingredients.length} bahan baku
                      </p>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between border-t border-line/60 pt-2">
                      <span className="text-xs font-bold text-moss sm:text-base">
                        {rupiah(product.price)}
                      </span>
                      <span
                        className={`flex items-center gap-1 rounded-xl px-2 py-0.5 text-[11px] font-semibold transition sm:px-2.5 sm:py-1 sm:text-xs ${
                          ready
                            ? "bg-[#edf6f2] text-moss group-hover:bg-moss group-hover:text-white"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        + Tambah
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop Panel Keranjang */}
        <div className="hidden lg:col-span-5 lg:block xl:col-span-4">
          <div className="sticky top-20 rounded-3xl border border-line bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-ink">
              Ringkasan Pesanan
            </h2>

            {cart.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <ShoppingBasket size={40} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs font-medium">Keranjang masih kosong</p>
              </div>
            ) : (
              <>
                <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center justify-between rounded-2xl bg-slate-50 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-ink">
                          {item.product.name}
                        </p>
                        <p className="text-[11px] font-medium text-moss">
                          {rupiah(item.product.price * item.quantity)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            onUpdate(item.product.id, item.quantity - 1)
                          }
                          className="grid h-7 w-7 place-items-center rounded-xl border border-line bg-white text-xs font-semibold hover:bg-slate-100"
                        >
                          -
                        </button>
                        <span className="w-5 text-center text-xs font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            onUpdate(item.product.id, item.quantity + 1)
                          }
                          className="grid h-7 w-7 place-items-center rounded-xl bg-moss text-xs font-semibold text-white shadow-2xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 border-t border-line pt-4">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">
                      Total Bayar
                    </span>
                    <span className="text-lg font-bold text-moss">
                      {rupiah(total)}
                    </span>
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-2">
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

                  <Button full onClick={() => onCheckout(method)}>
                    Bayar Sekarang
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floating Bar Mobile (Posisi Ditinggikan ke bottom-24) */}
      {cart.length > 0 && (
        <div className="fixed inset-x-4 bottom-26 z-20 flex items-center justify-between rounded-2xl bg-[#212b28] p-3.5 text-white shadow-2xl lg:hidden">
          <div className="flex items-center gap-3 pl-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-moss font-mono text-xs font-bold text-white">
              {totalCartCount}
            </div>
            <div>
              <p className="text-[10px] text-slate-300">Total Pesanan</p>
              <p className="text-sm font-bold text-emerald-400">{rupiah(total)}</p>
            </div>
          </div>
          <button
            onClick={() => setShowMobileCart(true)}
            className="rounded-xl bg-moss px-4 py-2.5 text-xs font-semibold text-white shadow-sm active:scale-95 transition"
          >
            Cek Pesanan
          </button>
        </div>
      )}

      {/* Mobile Bottom Sheet Modal Keranjang (Tinggi Ditinggikan ke h-[90vh]) */}
      {showMobileCart && (
        <div
          onClick={(e) => e.target === e.currentTarget && setShowMobileCart(false)}
          className="fixed inset-0 z-50 flex items-end bg-slate-950/50 p-0 backdrop-blur-xs lg:hidden"
        >
          <div className="w-full rounded-t-3xl bg-white p-5 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 h-[90vh] flex flex-col">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200 shrink-0" />
            <div className="mb-4 flex items-center justify-between shrink-0 border-b border-line/60 pb-3">
              <div>
                <h2 className="text-base font-semibold text-ink">Ringkasan Pesanan</h2>
                <p className="text-[11px] font-normal text-slate-400">{totalCartCount} item dipilih</p>
              </div>
              <button
                onClick={() => setShowMobileCart(false)}
                className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
              >
                Tutup
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-ink">
                      {item.product.name}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-moss">
                      {rupiah(item.product.price * item.quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdate(item.product.id, item.quantity - 1)}
                      className="grid h-8 w-8 place-items-center rounded-xl border border-line bg-white text-xs font-semibold active:scale-95"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-xs font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdate(item.product.id, item.quantity + 1)}
                      className="grid h-8 w-8 place-items-center rounded-xl bg-moss text-xs font-semibold text-white active:scale-95 shadow-2xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-line pt-4 shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Total Bayar</span>
                <span className="text-lg font-bold text-moss">{rupiah(total)}</span>
              </div>

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

              <Button
                full
                onClick={() => {
                  setShowMobileCart(false);
                  onCheckout(method);
                }}
              >
                Bayar Sekarang
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function StockPage({
  stocks,
  onAdd,
  onRestock,
  onEdit,
  onDelete,
}: {
  stocks: Stock[];
  onAdd: () => void;
  onRestock: (stock: Stock) => void;
  onEdit: (stock: Stock) => void;
  onDelete: (stock: Stock) => void;
}) {
  return (
    <div>
      <Title
        title="Stok Bahan Baku"
        desc="Kelola persediaan bahan baku dan riwayat pembaruan stok."
        action={
          <Button onClick={onAdd}>
            <Plus size={18} /> Tambah Stok
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stocks.map((stock) => {
          const isLow = stock.quantity <= stock.minimum;
          return (
            <div
              key={stock.id}
              className={`flex flex-col justify-between rounded-3xl border p-5 shadow-2xs transition ${
                isLow ? "border-amber-300 bg-amber-50/30" : "border-line bg-white"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-ink">
                    {stock.name}
                  </h3>
                  {isLow && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800">
                      Menipis
                    </span>
                  )}
                </div>
                <p className="mt-2 text-2xl font-bold text-moss">
                  {stock.quantity}{" "}
                  <span className="text-xs font-normal text-slate-400">
                    {stock.unit}
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Harga Beli: {rupiah(stock.buyPrice)} / {stock.unit}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(stock)}
                    className="text-xs font-medium text-slate-500 hover:text-ink"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(stock)}
                    className="text-xs font-medium text-rose-500 hover:text-rose-700"
                  >
                    Hapus
                  </button>
                </div>
                <button
                  onClick={() => onRestock(stock)}
                  className="rounded-xl bg-[#edf6f2] px-3 py-1.5 text-xs font-semibold text-moss hover:bg-moss hover:text-white transition"
                >
                  + Restok
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MenuPage({
  products,
  recipes,
  stocks,
  onAdd,
  onEdit,
  onDelete,
  onAddRecipe,
  onEditRecipe,
  onDeleteRecipe,
}: {
  products: Product[];
  recipes: Recipe[];
  stocks: Stock[];
  onAdd: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onAddRecipe: () => void;
  onEditRecipe: (recipe: Recipe) => void;
  onDeleteRecipe: (recipe: Recipe) => void;
}) {
  const [tab, setTab] = useState<"menu" | "recipe">("menu");

  return (
    <div>
      <Title
        title="Menu & Resep"
        desc="Kelola menu produk dan resep racikan bahan dasar."
        action={
          <Button onClick={tab === "menu" ? onAdd : onAddRecipe}>
            <Plus size={18} /> {tab === "menu" ? "Tambah Menu" : "Tambah Resep"}
          </Button>
        }
      />

      <div className="mb-6 flex gap-2 rounded-2xl border border-line bg-white p-1 w-fit shadow-2xs">
        <button
          onClick={() => setTab("menu")}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
            tab === "menu" ? "bg-moss text-white shadow-2xs" : "text-slate-500"
          }`}
        >
          Daftar Menu ({products.length})
        </button>
        <button
          onClick={() => setTab("recipe")}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
            tab === "recipe" ? "bg-moss text-white shadow-2xs" : "text-slate-500"
          }`}
        >
          Resep Dasar ({recipes.length})
        </button>
      </div>

      {tab === "menu" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex flex-col justify-between rounded-3xl border border-line bg-white p-4 shadow-2xs"
            >
              <div>
                <div className="h-32 w-full overflow-hidden rounded-2xl bg-slate-100">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                      <ReceiptText size={32} />
                    </div>
                  )}
                </div>
                <h3 className="mt-3 text-base font-semibold text-ink">
                  {product.name}
                </h3>
                <p className="mt-1 text-sm font-bold text-moss">
                  {rupiah(product.price)}
                </p>
                <div className="mt-2 space-y-1">
                  <p className="text-[11px] font-semibold text-slate-400">
                    Bahan Baku ({product.ingredients.length}):
                  </p>
                  <ul className="text-xs text-slate-600 font-normal">
                    {product.ingredients.map((ing) => {
                      const st = stocks.find((s) => s.id === ing.stockId);
                      return (
                        <li key={ing.stockId} className="truncate">
                          • {st?.name}: {ing.quantity} {recipeUnit(ing, st)}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 border-t border-line/60 pt-3">
                <button
                  onClick={() => onEdit(product)}
                  className="rounded-xl border border-line px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(product)}
                  className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="flex flex-col justify-between rounded-3xl border border-line bg-white p-5 shadow-2xs"
            >
              <div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">
                  {recipe.category}
                </span>
                <h3 className="mt-2 text-base font-semibold text-ink">
                  {recipe.name}
                </h3>
                <div className="mt-3 space-y-1">
                  <p className="text-[11px] font-semibold text-slate-400">
                    Komposisi Takaran:
                  </p>
                  <ul className="text-xs text-slate-600 font-normal">
                    {recipe.ingredients.map((ing) => {
                      const st = stocks.find((s) => s.id === ing.stockId);
                      return (
                        <li key={ing.stockId} className="truncate">
                          • {st?.name}: {ing.quantity} {recipeUnit(ing, st)}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 border-t border-line/60 pt-3">
                <button
                  onClick={() => onEditRecipe(recipe)}
                  className="rounded-xl border border-line px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDeleteRecipe(recipe)}
                  className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Finance({
  transactions,
  income,
  expense,
  onAdd,
}: {
  transactions: Transaction[];
  income: number;
  expense: number;
  onAdd: () => void;
}) {
  const profit = income - expense;

  return (
    <div className="space-y-6">
      <Title
        title="Keuangan & Laporan"
        desc="Ringkasan laba bersih, arus kas, dan riwayat transaksi operasional."
        action={
          <Button onClick={onAdd}>
            <Plus size={18} /> Transaksi Manual
          </Button>
        }
      />

      {/* Kartu Ringkasan Laporan Laba & Arus Kas */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-line bg-white p-5 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Pemasukan
          </span>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            {rupiah(income)}
          </p>
        </div>

        <div className="rounded-3xl border border-line bg-white p-5 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Pengeluaran
          </span>
          <p className="mt-2 text-2xl font-bold text-rose-600">
            {rupiah(expense)}
          </p>
        </div>

        <div className="rounded-3xl border border-line bg-white p-5 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Estimasi Laba Bersih
          </span>
          <p className={`mt-2 text-2xl font-bold ${profit >= 0 ? "text-moss" : "text-rose-600"}`}>
            {rupiah(profit)}
          </p>
        </div>
      </div>

      {/* Tabel Riwayat Transaksi */}
      <div className="rounded-3xl border border-line bg-white p-5 shadow-2xs">
        <h3 className="mb-4 text-base font-semibold text-ink">
          Riwayat Transaksi
        </h3>
        <div className="space-y-3">
          {transactions.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5"
            >
              <div>
                <p className="text-xs font-semibold text-ink">{t.title}</p>
                <p className="text-[11px] font-normal text-slate-400">
                  {t.date} • {t.method}
                </p>
              </div>
              <span
                className={`text-xs font-semibold ${
                  t.type === "income" ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {t.type === "income" ? "+" : "-"} {rupiah(t.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}