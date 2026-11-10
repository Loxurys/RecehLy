import fs from 'fs';
const p = 'C:/Users/Jafar/Documents/playground/Project/lomba/src/components/pages.tsx';
let code = fs.readFileSync(p, 'utf8');
code = code.replace(/\r\n/g, '\n');

// 1. Tambahkan informasi HPP, Keuntungan/Laba per Porsi, Margin di Kartu Menu (MenuPage)
const oldMenuCardPrice = `                  <h3 className="mt-4 font-bold text-ink">{product.name}</h3>
                  <p className="mt-0.5 text-lg font-bold text-moss">
                    {rupiah(product.price)}
                  </p>`;

const newMenuCardPrice = `                  <h3 className="mt-4 font-bold text-ink">{product.name}</h3>
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
                          <p className={\`font-bold \${profit >= 0 ? "text-emerald-700" : "text-rose-600"}\`}>
                            {rupiah(profit)} <span className="text-[10px] font-medium">({margin}%)</span>
                          </p>
                        </div>
                      </div>
                    );
                  })()}`;

if (code.includes(oldMenuCardPrice)) {
  code = code.replace(oldMenuCardPrice, newMenuCardPrice);
  console.log('Successfully updated MenuPage card profit & HPP');
} else {
  console.log('oldMenuCardPrice not found');
}

// 2. Tambahkan TransactionsPage (Halaman Transaksi & History Payment)
const transactionsPageCode = `
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

  // Breakdown metode bayar
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

      {/* Ringkasan Filter Arus Kas */}
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
          <p className={\`text-xl font-bold \${netCash >= 0 ? "text-moss" : "text-rose-600"}\`}>{rupiah(netCash)}</p>
        </div>
      </div>

      {/* Histori Pembayaran per Metode (Tunai, QRIS, Transfer) */}
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

      {/* Kontrol Filter dan Pencarian */}
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
          {/* Filter Jenis */}
          <div className="flex items-center rounded-xl border border-line bg-white p-1 text-xs font-bold shadow-2xs">
            <button
              onClick={() => setFilterType("all")}
              className={\`rounded-lg px-2.5 py-1.5 transition \${filterType === "all" ? "bg-moss text-white" : "text-slate-500 hover:text-ink"}\`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterType("income")}
              className={\`rounded-lg px-2.5 py-1.5 transition \${filterType === "income" ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-ink"}\`}
            >
              Pemasukan
            </button>
            <button
              onClick={() => setFilterType("expense")}
              className={\`rounded-lg px-2.5 py-1.5 transition \${filterType === "expense" ? "bg-rose-600 text-white" : "text-slate-500 hover:text-ink"}\`}
            >
              Pengeluaran
            </button>
          </div>

          {/* Filter Periode */}
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

          {/* Filter Metode */}
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

      {/* Tabel Transaksi & History Payment */}
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
                    className={\`grid h-10 w-10 shrink-0 place-items-center rounded-xl \${
                      t.type === "income" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                    }\`}
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
                    className={\`text-sm sm:text-base font-extrabold tracking-tight \${
                      t.type === "income" ? "text-emerald-700" : "text-rose-700"
                    }\`}
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
`;

code = code + '\n' + transactionsPageCode;
fs.writeFileSync(p, code, 'utf8');
console.log('Successfully added TransactionsPage');
