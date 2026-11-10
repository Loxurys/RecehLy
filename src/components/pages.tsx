import { useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Banknote,
  Check,
  ChevronRight,
  CircleAlert,
  CreditCard,
  Download,
  History,
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
import ExcelJS from "exceljs";
import type {
  CartItem,
  Page,
  Product,
  Recipe,
  Stock,
  Transaction,
} from "../lib/app-data";
import {
  calculateProductHpp,
  grams,
  recipeUnit,
  rupiah,
  usedStockUnits,
} from "../lib/app-data";
import { Button, Title } from "./ui";
import { PaymentModal, QrisUploadSection } from "./modals";

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
        title="Menu & Bahan Baku"
        desc={
          tab === "menu"
            ? "Atur menu kasir yang terhubung dengan takaran bahan baku."
            : "Bahan dasar untuk memudahkan pembuatan porsi menu seragam."
        }
        action={
          <Button onClick={tab === "menu" ? onAdd : onAddRecipe}>
            <Plus size={18} /> {tab === "menu" ? "Buat menu baru" : "Buat resep baru"}
          </Button>
        }
      />

      {/* Bagian Upload QRIS Toko */}
      <QrisUploadSection />

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
            Bahan Dasar ({recipes.length})
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
                  <div className="mt-1 flex items-baseline justify-between gap-2">
                    <p className="text-lg font-bold text-moss">
                      {rupiah(product.price)}
                    </p>
                    <span className="text-[11px] font-bold text-slate-400">
                      Harga Jual
                    </span>
                  </div>

                  {(() => {
                    const hpp = calculateProductHpp(product.ingredients, stocks);
                    const profit = product.price - hpp;
                    const margin = product.price > 0 ? Math.round((profit / product.price) * 100) : 0;
                    return (
                      <div className="mt-2.5 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 text-xs">
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">HPP Modal</p>
                          <p className="font-bold text-slate-700">{rupiah(hpp)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Laba / Porsi</p>
                          <p className={`font-bold ${profit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                            {rupiah(profit)} <span className="text-[10px] font-medium">({margin}%)</span>
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                  <p
                    className={`mt-2.5 w-fit rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      recipe ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {recipe
                      ? `Resep: ${recipe.name} · ${product.recipePortions || 1} porsi`
                      : "Bahan dasar sendiri "}
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
  const [search, setSearch] = useState("");
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
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
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-sm font-semibold text-slate-600">Total Tagihan</span>
              <span className="text-2xl font-bold tracking-tight text-ink">{rupiah(total)}</span>
            </div>

            <Button
              onClick={() => {
                setShowPaymentModal(true);
                if (isMobileDrawer) setShowMobileCart(false);
              }}
              full
            >
              <Check size={19} /> Bayar ({rupiah(total)})
            </Button>
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
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
            {visibleProducts.map((product) => {
              const ready = canFulfill(product);
              const inCart = cart.find((c) => c.product.id === product.id);

              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={!ready}
                  onClick={() => ready && onAdd(product)}
                  className={`group min-w-0 overflow-hidden rounded-2xl border bg-white text-left shadow-2xs transition active:scale-[0.98] ${
                    ready
                      ? inCart
                        ? "border-moss bg-[#f5faf7] ring-1 ring-moss"
                        : "border-line hover:border-moss/60 hover:shadow-md"
                      : "cursor-not-allowed border-rose-200 opacity-70"
                  }`}
                >
                  <div className={`relative aspect-[4/3] w-full overflow-hidden ${
                    ready ? "bg-[#edf6f2]" : "bg-rose-100"
                  }`}>
                    {product.imageUrl ? (
                      <>
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                          onError={(event) => {
                            event.currentTarget.classList.add("hidden");
                            event.currentTarget.nextElementSibling?.classList.remove("hidden");
                          }}
                          className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                        <div className="hidden h-full w-full flex-col items-center justify-center gap-1 text-moss">
                          <ReceiptText size={30} />
                          <span className="text-[10px] font-bold text-slate-400">Belum ada foto</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-moss">
                        <ReceiptText size={30} />
                        <span className="text-[10px] font-bold text-slate-400">Belum ada foto</span>
                      </div>
                    )}

                    {inCart && (
                      <span className="absolute right-2 top-2 rounded-full bg-moss px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                        {inCart.quantity} dipilih
                      </span>
                    )}
                    {!ready && (
                      <span className="absolute left-2 top-2 rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-bold text-white">
                        Stok kurang
                      </span>
                    )}
                  </div>

                  <div className="p-3">
                    <p className="truncate text-sm font-bold text-ink">{product.name}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-extrabold text-moss">
                        {rupiah(product.price)}
                      </span>
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                        ready
                          ? "bg-moss text-white"
                          : "bg-slate-100 text-slate-400"
                      }`}>
                        {ready ? <Plus size={17} /> : <X size={16} />}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[10px] font-medium text-slate-400">
                      {product.ingredients.length} bahan
                    </p>
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

      {cart.length > 0 && (
        <div className="fixed bottom-24 inset-x-3 z-30 xl:hidden">
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

      {showPaymentModal && (
        <PaymentModal
          total={total}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={(selectedMethod) => {
            onCheckout(selectedMethod);
            setShowPaymentModal(false);
          }}
        />
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
  stocks = [],
  income,
  expense,
}: {
  transactions: Transaction[];
  stocks?: Stock[];
  income: number;
  expense: number;
}) {
  const [activeTab, setActiveTab] = useState<"all" | "sales" | "restock">("all");

  const sold = transactions.filter((t) => t.type === "income").length;
  const net = income - expense;
  const margin = income > 0 ? Math.round((net / income) * 100) : 0;

  const filteredTransactions = transactions.filter((t) => {
    if (activeTab === "sales") return t.type === "income";
    if (activeTab === "restock") return t.type === "expense";
    return true;
  });

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Laporan Keuangan", {
      views: [{ showGridLines: true }],
    });

    worksheet.columns = [
      { header: "No", key: "no", width: 6 },
      { header: "ID Transaksi", key: "id", width: 36 },
      { header: "Tanggal", key: "date", width: 14 },
      { header: "Jenis Transaksi", key: "type", width: 26 },
      { header: "Keterangan", key: "title", width: 32 },
      { header: "Metode Pembayaran", key: "method", width: 20 },
      { header: "Nominal (Rp)", key: "amount", width: 18 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2D6A4F" },
      };
      cell.font = {
        name: "Arial",
        size: 11,
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF1B4332" } },
        bottom: { style: "medium", color: { argb: "FF1B4332" } },
        left: { style: "thin", color: { argb: "FF1B4332" } },
        right: { style: "thin", color: { argb: "FF1B4332" } },
      };
    });

    filteredTransactions.forEach((t, index) => {
      const row = worksheet.addRow({
        no: index + 1,
        id: t.id,
        date: t.date,
        type: t.type === "income" ? "Penjualan (Kasir)" : "Pengeluaran (Belanja Stok)",
        title: t.title,
        method: t.method,
        amount: t.amount,
      });

      row.height = 22;

      row.eachCell((cell, colNumber) => {
        cell.font = { name: "Arial", size: 10 };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
        cell.alignment = { vertical: "middle" };

        if ([1, 3, 6].includes(colNumber)) {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        }

        if (colNumber === 7) {
          cell.numFmt = '"Rp "#,##0';
          cell.alignment = { vertical: "middle", horizontal: "right" };
          cell.font = {
            name: "Arial",
            size: 10,
            bold: true,
            color: {
              argb: t.type === "income" ? "FF047857" : "FFBE123C",
            },
          };
        }
      });
    });

    const totalRow = worksheet.addRow({
      no: "",
      id: "",
      date: "",
      type: "",
      title: "",
      method: "TOTAL AKUMULASI",
      amount: filteredTransactions.reduce(
        (sum, t) => sum + (t.type === "income" ? t.amount : -t.amount),
        0,
      ),
    });

    totalRow.height = 24;
    totalRow.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 11, bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" },
      };
      cell.border = {
        top: { style: "medium", color: { argb: "FF94A3B8" } },
        bottom: { style: "double", color: { argb: "FF94A3B8" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      if (colNumber === 6) {
        cell.alignment = { vertical: "middle", horizontal: "right" };
      }
      if (colNumber === 7) {
        cell.numFmt = '"Rp "#,##0';
        cell.alignment = { vertical: "middle", horizontal: "right" };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Laporan_Keuangan_POS_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <>
      <Title
        title="Laporan Penjualan & Laba"
        desc="Ringkasan kinerja bisnis, riwayat belanja stok, dan export data."
        action={
          <div className="flex flex-wrap gap-2">
            <Button secondary onClick={exportToExcel}>
              <Download size={18} /> Export Excel (.xlsx)
            </Button>
            <Button secondary onClick={() => window.print()}>
              <ReceiptText size={18} /> Cetak Laporan
            </Button>
          </div>
        }
      />

      <div className="rounded-2xl border border-line bg-white p-5 sm:p-7 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
          <div>
            <h2 className="text-lg font-bold text-ink">Ringkasan Keuangan Usaha</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Data akumulasi seluruh kasir dan transaksi belanja bahan baku
            </p>
          </div>
          <span className="rounded-full bg-[#edf6f2] px-3 py-1.5 text-xs font-bold text-moss">
            Operasional Aktif
          </span>
        </div>

        <div className="grid gap-4 py-6 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500">Total Pemasukan (Kasir)</p>
            <p className="mt-1 text-xl font-bold text-emerald-700">{rupiah(income)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500">Total Pengeluaran (Belanja Stok)</p>
            <p className="mt-1 text-xl font-bold text-rose-700">{rupiah(expense)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500">Laba Bersih Operasional</p>
            <p className="mt-1 text-xl font-bold text-moss">{rupiah(net)}</p>
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

      <section className="mt-6 rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-2xs">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-ink sm:text-base">Detail Riwayat Transaksi & Belanja</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Pantau arus masuk kasir dan arus keluar belanja bahan baku
            </p>
          </div>

          <div className="flex rounded-xl border border-line bg-slate-50 p-1 text-xs font-bold">
            <button
              onClick={() => setActiveTab("all")}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeTab === "all" ? "bg-white text-ink shadow-2xs" : "text-slate-500"
              }`}
            >
              Semua ({transactions.length})
            </button>
            <button
              onClick={() => setActiveTab("sales")}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeTab === "sales" ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-500"
              }`}
            >
              Penjualan Kasir
            </button>
            <button
              onClick={() => setActiveTab("restock")}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeTab === "restock" ? "bg-white text-rose-700 shadow-2xs" : "text-slate-500"
              }`}
            >
              Pembelian Stok
            </button>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            Tidak ada transaksi pada kategori ini.
          </div>
        ) : (
          <div className="divide-y divide-line">
            {filteredTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                    t.type === "income" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {t.type === "income" ? <ArrowUpRight size={19} /> : <ArrowDownToLine size={19} />}
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
        )}
      </section>
    </>
  );
}

export function TransactionsPage({
  transactions,
  onAddTransaction,
}: {
  transactions: Transaction[];
  onAddTransaction?: () => void;
}) {
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterMethod, setFilterMethod] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<"all" | "today" | "week" | "month">("all");

  const todayStr = new Date().toISOString().slice(0, 10);
  const sevenDaysAgoStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const filtered = transactions.filter((t) => {
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterMethod !== "all" && t.method.toLowerCase() !== filterMethod.toLowerCase()) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchMethod = t.method.toLowerCase().includes(q);
      const matchDate = t.date.includes(q);
      if (!matchTitle && !matchMethod && !matchDate) return false;
    }
    if (dateRange === "today" && t.date !== todayStr) return false;
    if (dateRange === "week" && t.date < sevenDaysAgoStr) return false;
    if (dateRange === "month" && t.date < thirtyDaysAgoStr) return false;
    return true;
  });

  const totalIn = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const netCash = totalIn - totalOut;

  const paymentBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const t of filtered) {
      const cur = map.get(t.method) || { count: 0, total: 0 };
      cur.count += 1;
      cur.total += t.type === "income" ? t.amount : -t.amount;
      map.set(t.method, cur);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <>
      <Title
        title="Riwayat Transaksi & Pembayaran"
        desc="Pantau seluruh arus kas masuk, pengeluaran belanja, dan histori metode pembayaran."
        action={
          onAddTransaction && (
            <Button onClick={onAddTransaction}>
              <Plus size={18} /> Catat Transaksi
            </Button>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <div className="rounded-2xl border border-line bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
              <ArrowUpRight size={15} />
            </span>
            Total Pemasukan (Tersaring)
          </div>
          <p className="text-xl font-bold text-emerald-700">{rupiah(totalIn)}</p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-rose-50 text-rose-700">
              <ArrowDownToLine size={15} />
            </span>
            Total Pengeluaran (Tersaring)
          </div>
          <p className="text-xl font-bold text-rose-700">{rupiah(totalOut)}</p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-blue-50 text-blue-700">
              <Banknote size={15} />
            </span>
            Arus Kas Bersih
          </div>
          <p className={`text-xl font-bold ${netCash >= 0 ? "text-moss" : "text-rose-600"}`}>{rupiah(netCash)}</p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-line bg-white p-4 shadow-2xs">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Histori Pembayaran Berdasarkan Metode
        </p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {paymentBreakdown.length > 0 ? (
            paymentBreakdown.map(([methodName, stat]) => (
              <div key={methodName} className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-bold text-ink">{methodName}</span>
                  <span>{stat.count}x</span>
                </div>
                <p className="text-sm font-extrabold text-ink">{rupiah(stat.total)}</p>
              </div>
            ))
          ) : (
            <p className="col-span-full text-xs text-slate-400 py-1">Belum ada transaksi pada filter ini.</p>
          )}
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full max-w-md items-center gap-2 rounded-xl border border-line bg-white px-3 shadow-2xs">
          <Search size={18} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari transaksi, menu, atau catatan..."
            className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-line bg-white p-1 text-xs font-bold shadow-2xs">
            <button
              onClick={() => setFilterType("all")}
              className={`rounded-lg px-2.5 py-1.5 transition ${filterType === "all" ? "bg-moss text-white" : "text-slate-500 hover:text-ink"}`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterType("income")}
              className={`rounded-lg px-2.5 py-1.5 transition ${filterType === "income" ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-ink"}`}
            >
              Pemasukan
            </button>
            <button
              onClick={() => setFilterType("expense")}
              className={`rounded-lg px-2.5 py-1.5 transition ${filterType === "expense" ? "bg-rose-600 text-white" : "text-slate-500 hover:text-ink"}`}
            >
              Pengeluaran
            </button>
          </div>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs outline-none"
          >
            <option value="all">Semua Waktu</option>
            <option value="today">Hari Ini</option>
            <option value="week">7 Hari Terakhir</option>
            <option value="month">30 Hari Terakhir</option>
          </select>

          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs outline-none"
          >
            <option value="all">Semua Metode</option>
            <option value="tunai">Tunai</option>
            <option value="qris">QRIS</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>
      </div>

      <section className="rounded-2xl border border-line bg-white p-4 sm:p-6 shadow-2xs">
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <History size={18} className="text-moss" />
            <h3 className="font-bold text-ink">Daftar Transaksi ({filtered.length})</h3>
          </div>
          <span className="text-xs text-slate-400">Diurutkan dari terbaru</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            Tidak ada transaksi yang cocok dengan filter.
          </div>
        ) : (
          <div className="divide-y divide-line">
            {filtered.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 py-3.5 hover:bg-slate-50/60 rounded-xl px-2 transition"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
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
                    <p className="truncate text-sm font-bold text-ink">{t.title}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>{t.date}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        <CreditCard size={11} /> {t.method}
                      </span>
                      {t.category && (
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                          {t.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p
                    className={`text-sm sm:text-base font-extrabold tracking-tight ${
                      t.type === "income" ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {t.type === "income" ? "+" : "-"}
                    {rupiah(t.amount)}
                  </p>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">
                    {t.type === "income" ? "Pemasukan" : "Pengeluaran"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}