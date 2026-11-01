import { useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Banknote,
  Check,
  ChevronRight,
  CircleAlert,
  Minus,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  ShoppingBasket,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import type {
  CartItem,
  Page,
  Product,
  Recipe,
  Stock,
  Transaction,
} from "../lib/app-data";
import {
  grams,
  recipeUnit,
  rupiah,
  usedStockUnits,
} from "../lib/app-data";
import { Button, Title } from "./ui";

type SalesRange = "day" | "week" | "month" | "year" | "all";
type SalesPoint = { key: string; label: string; value: number };

const dayKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const dateFromTransaction = (transaction: Transaction) => {
  const [year, month, day] = transaction.date.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const makeDayPoints = (from: Date, count: number): SalesPoint[] =>
  Array.from({ length: count }, (_, index) => {
    const date = new Date(from);
    date.setDate(from.getDate() + index);
    return {
      key: dayKey(date),
      label:
        count <= 7
          ? new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(date)
          : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(date),
      value: 0,
    };
  });

const makeMonthPoints = (from: Date, count: number): SalesPoint[] =>
  Array.from({ length: count }, (_, index) => {
    const date = new Date(from.getFullYear(), from.getMonth() + index, 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: new Intl.DateTimeFormat("id-ID", { month: "short" }).format(date),
      value: 0,
    };
  });

function salesPoints(transactions: Transaction[], range: SalesRange) {
  const today = startOfDay(new Date());
  let points: SalesPoint[];
  let allUsesMonths = true;
  if (range === "day") points = makeDayPoints(today, 1);
  else if (range === "week") {
    const from = new Date(today);
    from.setDate(today.getDate() - 6);
    points = makeDayPoints(from, 7);
  } else if (range === "month") {
    const from = new Date(today);
    from.setDate(today.getDate() - 29);
    points = makeDayPoints(from, 30);
  } else if (range === "year") {
    const from = new Date(today.getFullYear(), today.getMonth() - 11, 1);
    points = makeMonthPoints(from, 12);
  } else {
    const sales = transactions.filter((transaction) => transaction.type === "income");
    const earliest = sales.length
      ? sales.reduce((oldest, transaction) => {
          const date = dateFromTransaction(transaction);
          return date < oldest ? date : oldest;
        }, dateFromTransaction(sales[0]))
      : today;
    const months =
      (today.getFullYear() - earliest.getFullYear()) * 12 +
      today.getMonth() -
      earliest.getMonth() +
      1;
    if (months <= 12) {
      points = makeMonthPoints(
        new Date(earliest.getFullYear(), earliest.getMonth(), 1),
        months,
      );
    } else {
      allUsesMonths = false;
      points = Array.from(
        { length: today.getFullYear() - earliest.getFullYear() + 1 },
        (_, index) => ({
          key: String(earliest.getFullYear() + index),
          label: String(earliest.getFullYear() + index),
          value: 0,
        }),
      );
    }
  }

  const pointMap = new Map(points.map((point) => [point.key, point]));
  for (const transaction of transactions) {
    if (transaction.type !== "income") continue;
    const date = dateFromTransaction(transaction);
    const key =
      range === "year" || (range === "all" && allUsesMonths)
        ? `${date.getFullYear()}-${date.getMonth()}`
        : range === "all" && !allUsesMonths
          ? String(date.getFullYear())
          : dayKey(date);
    const point = pointMap.get(key);
    if (point) point.value += transaction.amount;
  }
  return points;
}

const rangeLabels: Record<SalesRange, string> = {
  day: "1H",
  week: "7H",
  month: "1B",
  year: "1TH",
  all: "Semua",
};

export function Dashboard({
  lowStock,
  transactions,
  setPage,
}: {
  lowStock: Stock[];
  transactions: Transaction[];
  setPage: (page: Page) => void;
}) {
  const [range, setRange] = useState<SalesRange>("week");
  const points = useMemo(() => salesPoints(transactions, range), [range, transactions]);
  const today = dayKey(new Date());
  const todayIncome = transactions
    .filter((transaction) => transaction.type === "income" && transaction.date === today)
    .reduce((total, transaction) => total + transaction.amount, 0);
  const todayExpense = transactions
    .filter((transaction) => transaction.type === "expense" && transaction.date === today)
    .reduce((total, transaction) => total + transaction.amount, 0);
  const totalIncome = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const totalExpense = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const rangeSales = points.reduce((total, point) => total + point.value, 0);
  const cards = [
    {
      label: "Pemasukan hari ini",
      value: rupiah(todayIncome),
      icon: ArrowUpRight,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Pengeluaran hari ini",
      value: rupiah(todayExpense),
      icon: ArrowDownToLine,
      tone: "bg-rose-50 text-rose-700",
    },
    {
      label: "Saldo kas usaha",
      value: rupiah(totalIncome - totalExpense),
      icon: Wallet,
      tone: "bg-blue-50 text-blue-700",
    },
  ];

  return (
    <>
      <Title
        title="Ringkasan Operasional"
        desc="Pantau penjualan kasir, stok, dan arus kas usaha Anda."
        action={
          <Button onClick={() => setPage("cashier")}>
            <ShoppingBasket size={18} /> Buka Kasir
          </Button>
        }
      />

      {lowStock.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-900">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-600 text-white">
              <CircleAlert size={19} />
            </div>
            <div>
              <p className="font-bold">Ada {lowStock.length} bahan yang menipis!</p>
              <p className="text-xs text-rose-700">Segera belanja bahan sebelum kehabisan saat kasir beroperasi.</p>
            </div>
          </div>
          <button
            onClick={() => setPage("stock")}
            className="rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700 active:scale-95"
          >
            Lihat Bahan
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className="min-w-0 rounded-2xl border border-line bg-white p-3 sm:p-5 shadow-2xs"
          >
            <div
              className={`mb-2.5 grid h-9 w-9 place-items-center rounded-xl sm:mb-3.5 sm:h-10 sm:w-10 ${card.tone}`}
            >
              <card.icon size={20} />
            </div>
            <p className="min-h-7 text-[10px] font-medium leading-3.5 text-slate-500 sm:min-h-0 sm:text-sm">{card.label}</p>
            <p className="mt-1 truncate text-sm font-bold tracking-tight text-ink sm:text-2xl">
              {card.value}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <section className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-2xs">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-ink sm:text-base">Grafik penjualan</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {rangeLabels[range]} · {rupiah(rangeSales)} pemasukan kasir
              </p>
            </div>
            <div className="flex rounded-lg border border-line bg-slate-50 p-0.5 text-[11px] font-bold text-slate-500">
              {(Object.keys(rangeLabels) as SalesRange[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setRange(item)}
                  className={`rounded-md px-2 py-1.5 transition sm:px-2.5 ${range === item ? "bg-white text-moss shadow-2xs" : "hover:text-ink"}`}
                >
                  {rangeLabels[item]}
                </button>
              ))}
            </div>
          </div>
          <MiniChart points={points} />
        </section>

        <section className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-2xs">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-ink sm:text-base">Status Bahan Baku</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Pengingat batas minimum stok
              </p>
            </div>
            <CircleAlert
              className={
                lowStock.length ? "text-rose-500" : "text-emerald-500"
              }
              size={20}
            />
          </div>
          {lowStock.length ? (
            <div className="space-y-2">
              {lowStock.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">{item.name}</p>
                    <p className="text-xs font-bold text-rose-600">
                      Sisa {item.quantity} {item.unit} (Min: {item.minimum} {item.unit})
                    </p>
                  </div>
                  <button
                    onClick={() => setPage("stock")}
                    className="rounded-lg bg-white p-1.5 text-slate-400 shadow-2xs hover:text-moss"
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-emerald-50 p-4 text-center text-xs font-semibold text-emerald-800">
              ✓ Semua stok bahan masih di atas batas aman.
            </div>
          )}
          <button
            onClick={() => setPage("stock")}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-moss hover:underline"
          >
            Buka manajemen stok <ChevronRight size={14} />
          </button>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-2xs">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-ink sm:text-base">Transaksi Terbaru</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Arus kas penjualan kasir dan belanja operasional
            </p>
          </div>
          <button
            onClick={() => setPage("finance")}
            className="text-xs font-bold text-moss hover:underline"
          >
            Lihat semua
          </button>
        </div>
        <TransactionList transactions={transactions.slice(0, 5)} />
      </section>
    </>
  );
}

export function MiniChart({ points }: { points: SalesPoint[] }) {
  const max = Math.max(...points.map((point) => point.value), 1);
  const labels = points.length <= 3
    ? points
    : [points[0], points[Math.floor(points.length / 2)], points[points.length - 1]];
  return (
    <>
      <div className="flex h-36 items-end gap-1 pt-4 sm:h-40 sm:gap-1.5">
      {points.map((point) => (
        <div key={point.key} className="group flex h-full min-w-0 flex-1 flex-col justify-end">
          <div
            title={`${point.label}: ${rupiah(point.value)}`}
            style={{ height: point.value ? `${Math.max((point.value / max) * 100, 5)}%` : "3px" }}
            className="w-full rounded-t-md bg-[#dcebe5] transition group-hover:bg-moss"
          />
        </div>
      ))}
      </div>
      <div className="mt-4 flex justify-between border-t border-line pt-3 text-[11px] font-medium text-slate-400">
        {labels.map((point) => <span key={point.key}>{point.label}</span>)}
      </div>
    </>
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
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "safe">("all");

  const filtered = stocks.filter((stock) => {
    const matchesSearch = stock.name.toLowerCase().includes(query.toLowerCase());
    const isLow = stock.quantity <= stock.minimum;
    if (!matchesSearch) return false;
    if (filter === "low") return isLow;
    if (filter === "safe") return !isLow;
    return true;
  });

  return (
    <>
      <Title
        title="Stok Bahan Baku"
        desc="Kelola persediaan bahan mentah agar operasional kasir tidak terputus."
        action={
          <Button onClick={onAdd}>
            <Plus size={18} /> Tambah bahan
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full max-w-md items-center gap-2 rounded-xl border border-line bg-white px-3 shadow-2xs">
          <Search size={18} className="text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama bahan..."
            className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="flex w-fit items-center gap-1.5 rounded-xl border border-line bg-white p-1 text-xs font-bold">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 transition ${filter === "all" ? "bg-moss text-white" : "text-slate-500 hover:text-ink"}`}
          >
            Semua ({stocks.length})
          </button>
          <button
            onClick={() => setFilter("low")}
            className={`rounded-lg px-3 py-1.5 transition ${filter === "low" ? "bg-rose-600 text-white" : "text-slate-500 hover:text-ink"}`}
          >
            Perlu Beli ({stocks.filter((s) => s.quantity <= s.minimum).length})
          </button>
          <button
            onClick={() => setFilter("safe")}
            className={`rounded-lg px-3 py-1.5 transition ${filter === "safe" ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-ink"}`}
          >
            Aman
          </button>
        </div>
      </div>

      {/* Tampilan Mobile: Card View Ramah Sentuhan */}
      <div className="space-y-3 sm:hidden">
        {filtered.map((stock) => {
          const isLow = stock.quantity <= stock.minimum;
          return (
            <article
              key={stock.id}
              className={`rounded-2xl border bg-white p-4 shadow-2xs transition ${isLow ? "border-rose-200" : "border-line"}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-ink">{stock.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-400">Harga: {rupiah(stock.buyPrice)}/{stock.unit}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    isLow ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {isLow ? "Perlu beli" : "Aman"}
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-2 rounded-xl bg-slate-50 p-2.5">
                <span className="text-xs text-slate-500">Stok tersisa:</span>
                <span className="text-base font-bold text-ink">
                  {stock.quantity} {stock.unit}
                </span>
                <span className="ml-auto text-xs text-slate-400">
                  Min: {stock.minimum} {stock.unit}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2 pt-2 border-t border-line">
                <button
                  onClick={() => onRestock(stock)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-moss py-2 text-xs font-bold text-white transition active:scale-95"
                >
                  <Plus size={15} /> Tambah Stok
                </button>
                <button
                  onClick={() => onEdit(stock)}
                  className="rounded-xl border border-line bg-white p-2 text-slate-600 hover:bg-slate-50 active:scale-95"
                  title="Ubah bahan"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => onDelete(stock)}
                  className="rounded-xl border border-line bg-white p-2 text-rose-600 hover:bg-rose-50 active:scale-95"
                  title="Hapus bahan"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Tidak ada bahan yang sesuai.
          </div>
        )}
      </div>

      {/* Tampilan Desktop & Tablet: Table View Lengkap */}
      <div className="hidden sm:block overflow-x-auto rounded-2xl border border-line bg-white shadow-2xs">
        <div className="min-w-180">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr_110px] gap-4 border-b border-line bg-slate-50/80 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>Nama bahan</span>
            <span>Stok tersedia</span>
            <span>Harga beli</span>
            <span>Status</span>
            <span className="text-right">Aksi</span>
          </div>
          {filtered.map((stock) => {
            const isLow = stock.quantity <= stock.minimum;
            return (
              <div
                key={stock.id}
                className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr_110px] items-center gap-4 border-b border-line px-5 py-3.5 last:border-0 hover:bg-slate-50/70 transition"
              >
                <div>
                  <p className="font-semibold text-ink">{stock.name}</p>
                  <p className="text-xs text-slate-400">Diperbarui {stock.updatedAt}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-ink">
                    {stock.quantity} {stock.unit}
                  </p>
                  <p className="text-xs text-slate-400">Batas min: {stock.minimum} {stock.unit}</p>
                </div>
                <p className="text-sm font-semibold text-ink">
                  {rupiah(stock.buyPrice)}
                  <span className="text-xs text-slate-400">/{stock.unit}</span>
                </p>
                <span
                  className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${
                    isLow ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {isLow ? "Perlu beli" : "Aman"}
                </span>
                <div className="flex justify-end gap-1">
                  <button
                    onClick={() => onRestock(stock)}
                    className="rounded-lg border border-line p-2 text-slate-600 hover:bg-slate-100 hover:text-moss"
                    title="Tambah stok"
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    onClick={() => onEdit(stock)}
                    className="rounded-lg border border-line p-2 text-slate-600 hover:bg-slate-100"
                    title="Ubah bahan"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => onDelete(stock)}
                    className="rounded-lg border border-line p-2 text-rose-600 hover:bg-rose-50"
                    title="Hapus bahan"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-500">
              Tidak ada bahan yang cocok dengan pencarian.
            </div>
          )}
        </div>
      </div>
    </>
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
  const [search, setSearch] = useState("");

  const getStock = (id: string) => stocks.find((stock) => stock.id === id);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredRecipes = recipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <Title
        title="Menu & Resep Baku"
        desc={
          tab === "menu"
            ? "Atur menu kasir yang terhubung dengan takaran bahan baku."
            : "Racikan dasar untuk memudahkan pembuatan porsi menu seragam."
        }
        action={
          <Button onClick={tab === "menu" ? onAdd : onAddRecipe}>
            <Plus size={18} /> {tab === "menu" ? "Buat menu baru" : "Buat resep baru"}
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-fit rounded-xl border border-line bg-white p-1 text-sm font-bold shadow-2xs">
          <button
            onClick={() => setTab("menu")}
            className={`rounded-lg px-4 py-2 transition ${
              tab === "menu" ? "bg-moss text-white shadow-xs" : "text-slate-500 hover:text-ink"
            }`}
          >
            Menu Kasir ({products.length})
          </button>
          <button
            onClick={() => setTab("recipe")}
            className={`rounded-lg px-4 py-2 transition ${
              tab === "recipe" ? "bg-moss text-white shadow-xs" : "text-slate-500 hover:text-ink"
            }`}
          >
            Resep Dasar ({recipes.length})
          </button>
        </div>

        <div className="flex w-full sm:w-64 items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm shadow-2xs">
          <Search size={16} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari..."
            className="w-full bg-transparent outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {tab === "menu" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => {
            const recipe = recipes.find((item) => item.id === product.recipeId);
            return (
              <article
                key={product.id}
                className="rounded-2xl border border-line bg-white p-5 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf6f2] text-moss">
                      <ReceiptText size={20} />
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => onEdit(product)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                        title="Ubah menu"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(product)}
                        className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                        title="Hapus menu"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <h3 className="mt-4 font-bold text-ink">{product.name}</h3>
                  <p className="mt-0.5 text-lg font-bold text-moss">
                    {rupiah(product.price)}
                  </p>
                  <p
                    className={`mt-2.5 w-fit rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      recipe ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {recipe
                      ? `Resep: ${recipe.name} · ${product.recipePortions || 1} porsi`
                      : "Racik langsung"}
                  </p>
                </div>

                <div className="mt-4 border-t border-line pt-3">
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Bahan per porsi kasir:
                  </p>
                  {product.ingredients.length ? (
                    <div className="space-y-1">
                      {product.ingredients.map((ingredient) => (
                        <div
                          key={ingredient.stockId}
                          className="flex justify-between text-xs text-slate-600"
                        >
                          <span className="truncate">{getStock(ingredient.stockId)?.name || "Bahan"}</span>
                          <span className="font-semibold text-slate-800">
                            {ingredient.quantity}{" "}
                            {recipeUnit(ingredient, getStock(ingredient.stockId))}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-rose-500">Belum ada takaran bahan.</p>
                  )}
                </div>
              </article>
            );
          })}
          {filteredProducts.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              Tidak ada menu yang ditemukan.
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredRecipes.map((recipe) => (
            <article
              key={recipe.id}
              className="rounded-2xl border border-line bg-white p-5 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="rounded-full bg-[#edf6f2] px-2.5 py-1 text-xs font-bold text-moss">
                    {recipe.category}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onEditRecipe(recipe)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                      title="Ubah resep"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => onDeleteRecipe(recipe)}
                      className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                      title="Hapus resep"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h3 className="mt-4 font-bold text-ink">{recipe.name}</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {recipe.ingredients.length} bahan baku
                </p>
              </div>

              <div className="mt-4 border-t border-line pt-3">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Takaran standar per resep:
                </p>
                <div className="space-y-1">
                  {recipe.ingredients.map((ingredient) => (
                    <div
                      key={ingredient.stockId}
                      className="flex justify-between text-xs text-slate-600"
                    >
                      <span className="truncate">{getStock(ingredient.stockId)?.name || "Bahan"}</span>
                      <span className="font-semibold text-slate-800">
                        {ingredient.quantity}{" "}
                        {recipeUnit(ingredient, getStock(ingredient.stockId))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
          {filteredRecipes.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              Tidak ada resep yang ditemukan.
            </div>
          )}
        </div>
      )}
    </>
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
  onAdd: (p: Product) => void;
  onUpdate: (id: string, q: number) => void;
  onCheckout: (method: string) => void;
}) {
  const [method, setMethod] = useState("Tunai");
  const [search, setSearch] = useState("");
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [menuFilter, setMenuFilter] = useState<"all" | "recipe" | "direct">("all");
  const drawerTouchStart = useRef<number | null>(null);
  const cartTouchStart = useRef<number | null>(null);

  const canFulfill = (p: Product) =>
    p.ingredients.length > 0 && p.ingredients.every((i) => {
      const s = stocks.find((st) => st.id === i.stockId);
      return s && grams(s) >= usedStockUnits(i, s);
    });

  const cartTotalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  const visibleProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      menuFilter === "all" ||
      (menuFilter === "recipe" ? Boolean(product.recipeId) : !product.recipeId);
    return matchesSearch && matchesFilter;
  });

  const renderCartContent = (isMobileDrawer = false) => (
    <div>
      <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <ShoppingBasket size={20} className="text-moss" />
          <h2 className="font-bold text-ink">Pesanan Sekarang</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
            {cartTotalQty} item
          </span>
          {isMobileDrawer && (
            <button
              onClick={() => setShowMobileCart(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {cart.length === 0 ? (
        <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-200 p-5 text-center">
          <div>
            <ShoppingBasket size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">Keranjang masih kosong</p>
            <p className="mt-0.5 text-xs text-slate-400">Pilih menu di sebelah untuk menambahkan pesanan.</p>
          </div>
        </div>
      ) : (
        <div>
          <div className="max-h-[45vh] overflow-y-auto space-y-2 pr-1">
            {cart.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center justify-between rounded-xl bg-slate-50/70 p-3"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <p className="truncate text-sm font-semibold text-ink">{item.product.name}</p>
                  <p className="text-xs text-slate-500">
                    {rupiah(item.product.price)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      onUpdate(item.product.id, item.quantity - 1)
                    }
                    className="grid h-7 w-7 place-items-center rounded-lg border border-line bg-white text-slate-700 shadow-2xs hover:bg-slate-100 active:scale-90"
                    title="Kurangi"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="w-5 text-center text-sm font-bold text-ink">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      onUpdate(item.product.id, item.quantity + 1)
                    }
                    className="grid h-7 w-7 place-items-center rounded-lg border border-line bg-white text-slate-700 shadow-2xs hover:bg-slate-100 active:scale-90"
                    title="Tambah"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-line pt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-slate-600">Total Tagihan</span>
              <span className="text-2xl font-bold tracking-tight text-ink">{rupiah(total)}</span>
            </div>

            <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Metode Pembayaran
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-3 text-sm font-semibold text-ink outline-none focus:border-moss"
              >
                <option>Tunai</option>
                <option>QRIS</option>
                <option>Transfer</option>
              </select>
            </label>

            <div className="mt-4">
              <Button
                onClick={() => {
                  onCheckout(method);
                  if (isMobileDrawer) setShowMobileCart(false);
                }}
                full
              >
                <Check size={19} /> Selesaikan Bayar ({rupiah(total)})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Title
        title="Kasir"
        desc="Pilih menu, cek pesanan, lalu selesaikan pembayaran."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="min-w-0">
          <div className="mb-5 rounded-2xl border border-line bg-white p-3 shadow-2xs sm:p-4">
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-transparent focus-within:bg-white focus-within:ring-moss/30">
              <Search size={18} className="shrink-0 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari menu..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5">
              {[
                ["all", "Semua menu"],
                ["recipe", "Pakai resep"],
                ["direct", "Racik sendiri"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setMenuFilter(id as typeof menuFilter)}
                  className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition ${menuFilter === id ? "bg-moss text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
            {visibleProducts.map((product) => {
                const ready = canFulfill(product);
                const inCart = cart.find((c) => c.product.id === product.id);
                return (
                  <button
                    key={product.id}
                    disabled={!ready}
                    onClick={() => ready && onAdd(product)}
                    className={`group relative min-h-40 rounded-2xl border bg-white p-4 text-left transition active:scale-[0.98] ${
                      ready
                        ? inCart
                          ? "border-moss bg-[#f5faf7] shadow-sm ring-1 ring-moss"
                          : "border-line hover:-translate-y-0.5 hover:border-moss/60 hover:shadow-md"
                        : "border-rose-200 bg-rose-50/30 opacity-70 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={`grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl ${ready ? "bg-[#edf6f2] text-moss" : "bg-rose-100 text-rose-600"}`}>
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <ReceiptText size={22} />
                        )}
                      </div>
                      {!ready ? (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                          Bahan kurang
                        </span>
                      ) : inCart ? (
                        <span className="rounded-full bg-moss px-2.5 py-1 text-[11px] font-bold text-white shadow-xs">
                          {inCart.quantity} dipilih
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-5">
                      <p className="truncate font-bold text-ink">{product.name}</p>
                      <p className="mt-1 text-base font-extrabold text-moss">{rupiah(product.price)}</p>
                    </div>
                    <div className="absolute inset-x-4 bottom-3 flex items-center justify-between border-t border-line pt-3 text-[11px] font-semibold">
                      <span className="text-slate-400">{product.ingredients.length} bahan</span>
                      <span className={ready ? "text-moss" : "text-rose-600"}>{ready ? "Tambah" : "Stok kurang"}</span>
                    </div>
                  </button>
                );
              })}
            {visibleProducts.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-line bg-white px-5 py-12 text-center text-sm text-slate-500">
                Menu tidak ditemukan.
              </div>
            )}
          </div>
        </section>

        <section className="hidden h-fit rounded-2xl border border-line bg-white p-5 shadow-2xs xl:sticky xl:top-22 xl:block">
          {renderCartContent(false)}
        </section>
      </div>

      {/* Floating Sticky Cart Button on Mobile */}
      {cart.length > 0 && (
        <div className="fixed bottom-16 inset-x-3 z-30 xl:hidden">
          <button
            onClick={() => setShowMobileCart(true)}
            onTouchStart={(event) => {
              cartTouchStart.current = event.touches[0].clientY;
            }}
            onTouchEnd={(event) => {
              if (cartTouchStart.current && cartTouchStart.current - event.changedTouches[0].clientY > 35) {
                setShowMobileCart(true);
              }
              cartTouchStart.current = null;
            }}
            className="flex w-full items-center justify-between rounded-2xl bg-moss px-4.5 py-3 text-white shadow-xl transition active:scale-[0.98] animate-in fade-in slide-in-from-bottom-2"
          >
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/20">
                <ShoppingBasket size={18} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold leading-tight">{cartTotalQty} Pesanan</p>
                <p className="text-sm font-extrabold">{rupiah(total)}</p>
              </div>
            </div>
            <span className="rounded-xl bg-white/20 px-3 py-1.5 text-xs font-bold">
              Tarik atau buka
            </span>
          </button>
        </div>
      )}

      {/* Mobile Cart Drawer Modal */}
      {showMobileCart && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowMobileCart(false);
          }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-xs xl:hidden"
        >
          <div
            onTouchStart={(event) => {
              drawerTouchStart.current = event.touches[0].clientY;
            }}
            onTouchEnd={(event) => {
              if (drawerTouchStart.current && event.changedTouches[0].clientY - drawerTouchStart.current > 70) {
                setShowMobileCart(false);
              }
              drawerTouchStart.current = null;
            }}
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl animate-in slide-in-from-bottom duration-200"
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
            {renderCartContent(true)}
          </div>
        </div>
      )}
    </>
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
  return (
    <>
      <Title
        title="Pembukuan & Keuangan"
        desc="Catat semua pemasukan dan pengeluaran secara otomatis dan rapi."
        action={
          <Button onClick={onAdd}>
            <Plus size={18} /> Catat transaksi manual
          </Button>
        }
      />
      <div className="grid gap-3.5 sm:grid-cols-3 sm:gap-4">
        <Metric
          label="Total Pemasukan"
          value={income}
          icon={ArrowUpRight}
          tone="text-emerald-700 bg-emerald-50"
        />
        <Metric
          label="Total Pengeluaran"
          value={expense}
          icon={ArrowDownToLine}
          tone="text-rose-700 bg-rose-50"
        />
        <Metric
          label="Saldo Kas Bersih"
          value={income - expense}
          icon={Banknote}
          tone="text-blue-700 bg-blue-50"
        />
      </div>
      <section className="mt-6 rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-2xs">
        <h2 className="mb-4 font-bold text-ink sm:text-base">Riwayat Transaksi</h2>
        <TransactionList transactions={transactions} />
      </section>
    </>
  );
}

export function Metric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Wallet;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4.5 sm:p-5 shadow-2xs">
      <div className={`mb-3.5 grid h-10 w-10 place-items-center rounded-xl ${tone}`}>
        <Icon size={19} />
      </div>
      <p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-tight text-ink sm:text-2xl">{rupiah(value)}</p>
    </div>
  );
}

export function TransactionList({
  transactions,
}: {
  transactions: Transaction[];
}) {
  if (!transactions.length) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        Belum ada riwayat transaksi yang tercatat.
      </div>
    );
  }

  return (
    <div className="divide-y divide-line">
      {transactions.map((t) => (
        <div
          key={t.id}
          className="flex items-center justify-between gap-3 py-3"
        >
          <div
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
              t.type === "income" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            {t.type === "income" ? (
              <ArrowUpRight size={19} />
            ) : (
              <ArrowDownToLine size={19} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{t.title}</p>
            <p className="mt-0.5 text-xs text-slate-400">
              {t.date} · {t.method}
            </p>
          </div>
          <p
            className={`text-sm font-bold tracking-tight ${
              t.type === "income" ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {t.type === "income" ? "+" : "-"}
            {rupiah(t.amount)}
          </p>
        </div>
      ))}
    </div>
  );
}

export function Report({
  transactions,
  income,
  expense,
}: {
  transactions: Transaction[];
  income: number;
  expense: number;
}) {
  const sold = transactions.filter((t) => t.type === "income").length;
  const net = income - expense;
  const margin = income > 0 ? Math.round((net / income) * 100) : 0;

  return (
    <>
      <Title
        title="Laporan Penjualan & Laba"
        desc="Ringkasan kinerja bisnis UMKM untuk evaluasi dan perlombaan."
        action={
          <Button secondary onClick={() => window.print()}>
            <ReceiptText size={18} /> Cetak Laporan
          </Button>
        }
      />
      <div className="rounded-2xl border border-line bg-white p-5 sm:p-7 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
          <div>
            <h2 className="text-lg font-bold text-ink">Ringkasan Keuangan Usaha</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Data akumulasi seluruh kasir dan transaksi
            </p>
          </div>
          <span className="rounded-full bg-[#edf6f2] px-3 py-1.5 text-xs font-bold text-moss">
            Operasional Aktif
          </span>
        </div>
        <div className="grid gap-4 py-6 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500">Total Pemasukan</p>
            <p className="mt-1 text-xl font-bold text-emerald-700">{rupiah(income)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500">Total Pengeluaran</p>
            <p className="mt-1 text-xl font-bold text-rose-700">{rupiah(expense)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500">Laba Bersih Operasional</p>
            <p className="mt-1 text-xl font-bold text-moss">
              {rupiah(net)}
            </p>
          </div>
        </div>
        <div className="rounded-xl bg-[#edf6f2] p-4 sm:flex sm:items-center sm:justify-between text-moss">
          <div>
            <p className="text-sm font-bold">{sold} Penjualan Kasir Sukses</p>
            <p className="mt-0.5 text-xs text-moss-dark/80">
              Semua bahan baku otomatis terkurangi sesuai transaksi di atas.
            </p>
          </div>
          <span className="mt-3 inline-block rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-moss shadow-2xs sm:mt-0">
            Profit Margin: {margin}%
          </span>
        </div>
      </div>
    </>
  );
}
