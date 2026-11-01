import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  BarChart3,
  Bell,
  ClipboardList,
  Cloud,
  CloudOff,
  LayoutDashboard,
  Menu as MenuIcon,
  Package,
  ShoppingBasket,
  Smartphone,
  Wallet,
  X,
} from "lucide-react";
import {
  grams,
  initialProducts,
  initialRecipes,
  initialStock,
  initialTransactions,
  load,
  usedStockUnits,
} from "./lib/app-data";
import {
  checkoutRemote,
  getRemoteState,
  normalizeAccessCode,
  saveRemoteState,
} from "./lib/remote-store";
import type { AppState } from "./lib/remote-store";
import type {
  CartItem,
  Page,
  Product,
  Recipe,
  Stock,
  Transaction,
} from "./lib/app-data";
import { NavItem } from "./components/ui";
import type { NavigationItem } from "./components/ui";
import {
  Cashier,
  Dashboard,
  Finance,
  MenuPage,
  Report,
  StockPage,
} from "./components/pages";
import {
  ConnectionModal,
  DeleteModal,
  EditStockModal,
  FinanceModal,
  MenuModal,
  ReceiptModal,
  RecipeModal,
  RestockModal,
  StockModal,
} from "./components/modals";


export const APP_CONFIG = {
  name: "ini_nama",
  tagline: "Dashboard Kasir & Stok",
  logo: "/favicon.svg",
};

function App() {
  const [page, setPage] = useState<Page>("cashier");
  const [stocks, setStocks] = useState<Stock[]>(() =>
    load("app-stocks", initialStock),
  );
  const [products, setProducts] = useState<Product[]>(() =>
    load("app-products", initialProducts),
  );
  const [recipes, setRecipes] = useState<Recipe[]>(() =>
    load("app-recipes", initialRecipes),
  );
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    load("app-transactions", initialTransactions),
  );
  const [demoData, setDemoData] = useState(
    () => localStorage.getItem("app-mode") !== "empty",
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [modal, setModal] = useState<
    | "stock"
    | "restock"
    | "edit-stock"
    | "menu"
    | "edit-menu"
    | "recipe"
    | "edit-recipe"
    | "finance"
    | "receipt"
    | "connection"
    | null
  >(null);
  const [restockTarget, setRestockTarget] = useState<Stock | null>(null);
  const [editStockTarget, setEditStockTarget] = useState<Stock | null>(null);
  const [editMenuTarget, setEditMenuTarget] = useState<Product | null>(null);
  const [editRecipeTarget, setEditRecipeTarget] = useState<Recipe | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "stock" | "menu" | "recipe";
    id: string;
    name: string;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const [lastSale, setLastSale] = useState<Transaction | null>(null);
  const [accessCode, setAccessCode] = useState<string | null>(() =>
    localStorage.getItem("app-access-code"),
  );
  const [syncStatus, setSyncStatus] = useState<
    "local" | "connecting" | "online" | "syncing" | "error"
  >(accessCode ? "connecting" : "local");
  const [remoteReady, setRemoteReady] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const lastKnownServerUpdatedAt = useRef<string | null>(null);

  const snapshot = useMemo<AppState>(
    () => ({ stocks, products, recipes, transactions, demoData }),
    [stocks, products, recipes, transactions, demoData],
  );

  const showToast = useCallback((msg: string) => {
    setNotice(msg);
    setTimeout(() => {
      setNotice((prev) => (prev === msg ? "" : prev));
    }, 2800);
  }, []);

  // Simpan state secara terpadu tanpa race condition & stale snapshot
  const commitState = useCallback(
    (next: AppState, toastMsg?: string) => {
      setStocks(next.stocks);
      setProducts(next.products);
      setRecipes(next.recipes);
      setTransactions(next.transactions);
      setDemoData(next.demoData);

      localStorage.setItem("app-stocks", JSON.stringify(next.stocks));
      localStorage.setItem("app-products", JSON.stringify(next.products));
      localStorage.setItem("app-recipes", JSON.stringify(next.recipes));
      localStorage.setItem("app-transactions", JSON.stringify(next.transactions));
      localStorage.setItem("app-mode", next.demoData ? "sample" : "empty");
      localStorage.setItem("app-last-sync", new Date().toISOString());

      // Kirim sinyal ke tab browser yang sama
      try {
        const channel = new BroadcastChannel("app-sync");
        channel.postMessage("sync");
        channel.close();
      } catch {
        // BroadcastChannel unavailable
      }

      // Kirim langsung ke server database online jika sedang tersambung
      if (accessCode) {
        setSyncStatus("syncing");
        saveRemoteState(accessCode, next)
          .then((res) => {
            lastKnownServerUpdatedAt.current = res.updatedAt;
            setSyncStatus("online");
            if (toastMsg) showToast(toastMsg);
          })
          .catch((err) => {
            console.error("Gagal sinkron ke database:", err);
            setSyncStatus("error");
            if (toastMsg) showToast(`${toastMsg} (tersimpan di perangkat)`);
          });
      } else {
        if (toastMsg) showToast(toastMsg);
      }
    },
    [accessCode, showToast],
  );

  // Menerima snapshot dari server atau tab lain (TIDAK PERNAH menghapus keranjang kasir)
  const applySnapshot = useCallback((next: AppState) => {
    setStocks(next.stocks);
    setProducts(next.products);
    setRecipes(next.recipes);
    setTransactions(next.transactions);
    setDemoData(next.demoData);
    // Pertahankan item keranjang kasir yang produknya masih ada
    setCart((prev) =>
      prev.filter((item) => next.products.some((p) => p.id === item.product.id)),
    );
  }, []);

  // Hubungkan ke server saat accessCode aktif pertama kali
  useEffect(() => {
    if (!accessCode) {
      setSyncStatus("local");
      setRemoteReady(false);
      return;
    }
    let active = true;
    setSyncStatus("connecting");
    getRemoteState(accessCode)
      .then((remote) => {
        if (!active) return;
        if (remote) {
          lastKnownServerUpdatedAt.current = remote.updatedAt;
          applySnapshot(remote.state);
        } else {
          return saveRemoteState(accessCode, snapshot).then((res) => {
            lastKnownServerUpdatedAt.current = res.updatedAt;
          });
        }
      })
      .then(() => {
        if (active) {
          setRemoteReady(true);
          setSyncStatus("online");
          showToast(`Tersambung ke toko ${accessCode}`);
        }
      })
      .catch((err) => {
        console.error("Initial connect failed:", err);
        if (active) {
          setSyncStatus("error");
          showToast("Database online belum dapat dihubungi. Menggunakan data perangkat.");
        }
      });

    return () => {
      active = false;
    };
  }, [accessCode, applySnapshot, showToast]);

  // Polling sinkronisasi antar HP berkala (5 detik)
  useEffect(() => {
    if (!accessCode || !remoteReady) return;
    const interval = window.setInterval(() => {
      getRemoteState(accessCode)
        .then((remote) => {
          if (!remote) return;
          // Hanya update jika timestamp di server benar-benar berubah dari HP lain
          if (
            lastKnownServerUpdatedAt.current &&
            remote.updatedAt === lastKnownServerUpdatedAt.current
          ) {
            return;
          }
          lastKnownServerUpdatedAt.current = remote.updatedAt;
          applySnapshot(remote.state);
          setSyncStatus("online");
          showToast("Data diperbarui dari perangkat lain");
        })
        .catch(() => {
          setSyncStatus("error");
        });
    }, 5000);
    return () => window.clearInterval(interval);
  }, [accessCode, applySnapshot, remoteReady, showToast]);

  // Sinkronisasi antar-tab dalam browser yang sama
  useEffect(() => {
    const channel = new BroadcastChannel("app-sync");
    channel.onmessage = () => {
      setStocks(load("app-stocks", initialStock));
      setProducts(load("app-products", initialProducts));
      setRecipes(load("app-recipes", initialRecipes));
      setTransactions(load("app-transactions", initialTransactions));
      setDemoData(localStorage.getItem("app-mode") !== "empty");
    };
    return () => channel.close();
  }, []);

  const manualSync = () => {
    if (accessCode) {
      setSyncStatus("syncing");
      saveRemoteState(accessCode, snapshot)
        .then((res) => {
          lastKnownServerUpdatedAt.current = res.updatedAt;
          setSyncStatus("online");
          showToast("Data tersinkron ke database online");
        })
        .catch(() => {
          setSyncStatus("error");
          showToast("Data tersimpan di perangkat ini");
        });
      return;
    }
    commitState(snapshot, "Data tersimpan di perangkat ini");
  };

  const connect = (rawCode: string) => {
    const code = normalizeAccessCode(rawCode);
    if (code.length < 6) {
      showToast("Kode minimal 6 karakter");
      return;
    }
    setSyncStatus("connecting");
    setRemoteReady(false);
    getRemoteState(code)
      .then((remote) => {
        if (remote) {
          lastKnownServerUpdatedAt.current = remote.updatedAt;
          applySnapshot(remote.state);
          return;
        }
        return saveRemoteState(code, snapshot).then((res) => {
          lastKnownServerUpdatedAt.current = res.updatedAt;
        });
      })
      .then(() => {
        localStorage.setItem("app-access-code", code);
        setAccessCode(code);
        setRemoteReady(true);
        setSyncStatus("online");
        setModal(null);
        showToast(`Tersambung ke kode: ${code}`);
      })
      .catch((error: Error) => {
        setSyncStatus("error");
        showToast(error.message || "Gagal menyambung");
      });
  };

  const disconnect = () => {
    localStorage.removeItem("app-access-code");
    setAccessCode(null);
    setRemoteReady(false);
    lastKnownServerUpdatedAt.current = null;
    setSyncStatus("local");
    setModal(null);
    showToast("Menggunakan penyimpanan offline perangkat");
  };

  const switchData = () => {
    const nextDemoData = !demoData;
    const nextState: AppState = {
      stocks: nextDemoData ? initialStock : [],
      products: nextDemoData ? initialProducts : [],
      recipes: nextDemoData ? initialRecipes : [],
      transactions: nextDemoData ? initialTransactions : [],
      demoData: nextDemoData,
    };
    commitState(
      nextState,
      nextDemoData
        ? "Data contoh dimuat ulang"
        : "Data kosong aktif. Siap dites dari nol.",
    );
    setCart([]);
  };

  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const lowStock = stocks.filter((s) => s.quantity <= s.minimum);
  const productIngredients = (product: Product) => product.ingredients;

  const nav: NavigationItem[] = [
    { id: "cashier", label: "Kasir", icon: ShoppingBasket },
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "stock", label: "Stok Bahan", icon: Package },
    { id: "menu", label: "Menu & Resep", icon: ClipboardList },
    { id: "finance", label: "Keuangan", icon: Wallet },
    { id: "report", label: "Laporan", icon: BarChart3 },
  ];

  const addToCart = (product: Product) =>
    setCart((current) => {
      const found = current.find((item) => item.product.id === product.id);
      return found
        ? current.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          )
        : [...current, { product, quantity: 1 }];
    });

  const updateCart = (id: string, quantity: number) =>
    setCart((current) =>
      quantity <= 0
        ? current.filter((item) => item.product.id !== id)
        : current.map((item) =>
            item.product.id === id ? { ...item, quantity } : item,
          ),
    );

  const total = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  const canFulfill = (item: CartItem) =>
    productIngredients(item.product).length > 0 &&
    productIngredients(item.product).every((ingredient) => {
      const stock = stocks.find((s) => s.id === ingredient.stockId);
      return (
        stock &&
        grams(stock) >= usedStockUnits(ingredient, stock) * item.quantity
      );
    });

  const checkout = async (method: string) => {
    if (!cart.length) return;

    if (accessCode && remoteReady) {
      setSyncStatus("syncing");
      try {
        const result = await checkoutRemote(
          accessCode,
          cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          method,
        );
        lastKnownServerUpdatedAt.current = result.updatedAt;
        applySnapshot(result.state);
        setLastSale(result.sale);
        setCart([]);
        setModal("receipt");
        setSyncStatus("online");
        showToast("Pembayaran berhasil dicatat online");
      } catch (error) {
        setSyncStatus("error");
        showToast(
          error instanceof Error ? error.message : "Checkout gagal disimpan.",
        );
      }
      return;
    }

    if (cart.some((item) => !canFulfill(item))) {
      showToast("Stok bahan kurang. Cek bahan yang perlu dibeli.");
      return;
    }

    const sale: Transaction = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      type: "income",
      title: cart.map((i) => `${i.product.name} x${i.quantity}`).join(", "),
      amount: total,
      method,
    };

    const nextStocks = stocks.map((stock) => {
      const used = cart.reduce((sum, item) => {
        const ingredient = productIngredients(item.product).find(
          (i) => i.stockId === stock.id,
        );
        return (
          sum +
          (ingredient ? usedStockUnits(ingredient, stock) : 0) * item.quantity
        );
      }, 0);
      return used
        ? {
            ...stock,
            quantity:
              stock.unit === "kg"
                ? (grams(stock) - used) / 1000
                : stock.quantity - used,
            updatedAt: "Baru saja",
          }
        : stock;
    });

    const nextTransactions = [sale, ...transactions];

    commitState(
      {
        ...snapshot,
        stocks: nextStocks,
        transactions: nextTransactions,
      },
      "Pembayaran berhasil",
    );

    setLastSale(sale);
    setCart([]);
    setModal("receipt");
  };

  return (
    <div className="min-h-screen bg-[#f8f7f2] text-ink flex flex-col">
      {/* Sidebar Desktop */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-white lg:flex">
        <div className="flex items-center gap-3 px-6 py-6 border-b border-line/60">
          <div className="grid h-10 w-10 place-items-center rounded-xl overflow-hidden bg-moss text-white shadow-xs">
            {APP_CONFIG.logo ? (
              <img src={APP_CONFIG.logo} alt={APP_CONFIG.name} className="h-full w-full object-cover" />
            ) : (
              <ShoppingBasket size={21} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold tracking-tight text-ink truncate">{APP_CONFIG.name}</p>
            <p className="text-[11px] font-medium text-slate-400 truncate">{APP_CONFIG.tagline}</p>
          </div>
        </div>
        <nav className="mt-4 space-y-1 px-3">
          {nav.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              active={page === item.id}
              onClick={() => setPage(item.id)}
            />
          ))}
        </nav>
        <div className="mt-auto m-4 rounded-2xl bg-[#edf6f2] p-4 border border-moss/15">
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-moss">
              <Smartphone size={16} /> Mode Sinkron
            </div>
            <span
              className={`h-2 w-2 rounded-full ${
                syncStatus === "online"
                  ? "bg-emerald-500 animate-pulse"
                  : syncStatus === "syncing"
                    ? "bg-amber-500 animate-spin"
                    : "bg-slate-400"
              }`}
            />
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            {accessCode
              ? `Kode aktif: ${accessCode}. Tersambung online ke Supabase.`
              : "Berjalan offline. Sambungkan kode untuk multi-HP."}
          </p>
          <button
            onClick={() => setModal("connection")}
            className="mt-2.5 text-xs font-bold text-moss hover:underline"
          >
            {accessCode ? "Ubah Kode Toko" : "+ Sambungkan Antar HP"}
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <main className="lg:ml-64 flex-1 flex flex-col">
        {/* Sticky Header Responsive */}
        <header className="no-print sticky top-0 z-20 flex h-16 sm:h-18 items-center justify-between border-b border-line bg-[#f8f7f2]/95 px-3.5 sm:px-8 backdrop-blur">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden rounded-xl border border-line bg-white p-2 text-slate-600 hover:bg-slate-50 active:scale-95 shadow-2xs"
              title="Menu Navigasi"
            >
              <MenuIcon size={20} />
            </button>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-ink">
                {nav.find((n) => n.id === page)?.label || "Dashboard"}
              </p>
              <p className="text-[11px] text-slate-500">Operasional Usaha UMKM</p>
            </div>
            {/* Mobile Branding */}
            <div className="sm:hidden flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-ink">
                {nav.find((n) => n.id === page)?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Status Koneksi Online Pill (Bisa diklik di Mobile & Desktop) */}
            <button
              onClick={() => setModal("connection")}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 sm:px-3 text-xs font-bold transition active:scale-95 shadow-2xs ${
                syncStatus === "online"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : syncStatus === "syncing" || syncStatus === "connecting"
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : "bg-white text-slate-600 border border-line"
              }`}
              title="Klik untuk atur sinkronisasi antar HP"
            >
              {syncStatus === "online" ? (
                <Cloud size={14} className="text-emerald-600" />
              ) : (
                <CloudOff size={14} className="text-slate-400" />
              )}
              <span className="hidden xs:inline">
                {syncStatus === "online"
                  ? accessCode || "Online"
                  : syncStatus === "syncing"
                    ? "Menyinkronkan"
                    : syncStatus === "connecting"
                      ? "Menghubungkan"
                      : "Offline"}
              </span>
            </button>

            {/* Switch Data Demo */}
            <button
              onClick={switchData}
              className={`rounded-xl border px-2.5 py-1.5 text-xs font-bold transition active:scale-95 shadow-2xs ${
                demoData
                  ? "border-moss/40 bg-[#edf6f2] text-moss"
                  : "border-line bg-white text-slate-600 hover:bg-slate-50"
              }`}
              title="Ganti data pengujian (Demo / Kosong)"
            >
              {demoData ? "Data Demo" : "Data Kosong"}
            </button>

            {/* Manual Sync Button */}
            <button
              onClick={manualSync}
              className="rounded-xl border border-line bg-white p-2 text-slate-600 hover:bg-slate-50 active:scale-95 shadow-2xs"
              title="Simpan / Sinkronkan data sekarang"
            >
              <ArrowDownToLine size={17} />
            </button>

            {/* Low Stock Indicator */}
            <button
              onClick={() => setPage("stock")}
              className="relative rounded-xl border border-line bg-white p-2 text-slate-600 hover:bg-slate-50 shadow-2xs"
              title="Peringatan stok"
            >
              <Bell size={17} />
              {lowStock.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Floating Toast Notification */}
        {notice && (
          <div className="no-print fixed right-4 top-20 z-50 rounded-2xl bg-slate-900/95 px-4 py-3 text-xs font-semibold text-white shadow-xl backdrop-blur animate-in fade-in slide-in-from-top-2">
            {notice}
          </div>
        )}

        {/* Page Content */}
        <div className="mx-auto w-full max-w-7xl flex-1 p-3.5 pb-24 sm:p-6 lg:p-8 lg:pb-8">
          {page === "dashboard" && (
            <Dashboard
              lowStock={lowStock}
              transactions={transactions}
              setPage={setPage}
            />
          )}
          {page === "stock" && (
            <StockPage
              stocks={stocks}
              onAdd={() => setModal("stock")}
              onRestock={(stock) => {
                setRestockTarget(stock);
                setModal("restock");
              }}
              onEdit={(stock) => {
                setEditStockTarget(stock);
                setModal("edit-stock");
              }}
              onDelete={(stock) => {
                const usedInMenu = products.some((product) =>
                  product.ingredients.some(
                    (ingredient) => ingredient.stockId === stock.id,
                  ),
                );
                const usedInRecipe = recipes.some((recipe) =>
                  recipe.ingredients.some(
                    (ingredient) => ingredient.stockId === stock.id,
                  ),
                );
                if (usedInMenu || usedInRecipe) {
                  showToast(
                    "Bahan masih dipakai menu atau resep. Hapus pemakaiannya dulu.",
                  );
                  return;
                }
                setDeleteTarget({
                  type: "stock",
                  id: stock.id,
                  name: stock.name,
                });
              }}
            />
          )}
          {page === "menu" && (
            <MenuPage
              products={products}
              recipes={recipes}
              stocks={stocks}
              onAdd={() => setModal("menu")}
              onEdit={(product) => {
                setEditMenuTarget(product);
                setModal("edit-menu");
              }}
              onDelete={(product) =>
                setDeleteTarget({
                  type: "menu",
                  id: product.id,
                  name: product.name,
                })
              }
              onAddRecipe={() => setModal("recipe")}
              onEditRecipe={(recipe) => {
                setEditRecipeTarget(recipe);
                setModal("edit-recipe");
              }}
              onDeleteRecipe={(recipe) =>
                setDeleteTarget({
                  type: "recipe",
                  id: recipe.id,
                  name: recipe.name,
                })
              }
            />
          )}
          {page === "cashier" && (
            <Cashier
              products={products}
              stocks={stocks}
              cart={cart}
              total={total}
              onAdd={addToCart}
              onUpdate={updateCart}
              onCheckout={checkout}
            />
          )}
          {page === "finance" && (
            <Finance
              transactions={transactions}
              income={income}
              expense={expense}
              onAdd={() => setModal("finance")}
            />
          )}
          {page === "report" && (
            <Report
              transactions={transactions}
              income={income}
              expense={expense}
            />
          )}
        </div>
      </main>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileMenuOpen(false);
          }}
          className="no-print fixed inset-0 z-50 flex bg-slate-950/45 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
        >
          <div className="w-72 max-w-[80vw] bg-white h-full p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-250">
            <div>
              <div className="flex items-center justify-between pb-5 border-b border-line">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-xl overflow-hidden bg-moss text-white">
                    {APP_CONFIG.logo ? (
                      <img src={APP_CONFIG.logo} alt={APP_CONFIG.name} className="h-full w-full object-cover" />
                    ) : (
                      <ShoppingBasket size={18} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-ink truncate">{APP_CONFIG.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{APP_CONFIG.tagline}</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <X size={19} />
                </button>
              </div>

              <nav className="mt-4 space-y-1">
                {nav.map((item) => (
                  <NavItem
                    key={item.id}
                    item={item}
                    active={page === item.id}
                    onClick={() => {
                      setPage(item.id);
                      setMobileMenuOpen(false);
                    }}
                  />
                ))}
              </nav>
            </div>

            <div className="rounded-2xl bg-[#edf6f2] p-4 border border-moss/15">
              <p className="text-xs font-bold text-moss">Multi-HP Supabase</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                {accessCode
                  ? `Kode Toko: ${accessCode}`
                  : "Belum tersambung ke HP lain."}
              </p>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setModal("connection");
                }}
                className="mt-2 text-xs font-bold text-moss underline"
              >
                {accessCode ? "Ubah Kode" : "Sambungkan HP"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Mobile Responsive (Semua 6 Menu Mudah Diakses) */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-white/95 px-1 py-1.5 backdrop-blur lg:hidden safe-area-pb shadow-lg">
        {nav.map((item) => {
          const isActive = page === item.id;
          const isStock = item.id === "stock";
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`relative flex min-w-12 flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[10px] font-bold transition active:scale-95 ${
                isActive ? "text-moss bg-[#edf6f2]/80" : "text-slate-500 hover:text-ink"
              }`}
            >
              <item.icon size={19} className={isActive ? "text-moss" : "text-slate-500"} />
              <span className="truncate max-w-14">{item.label.split(" ")[0]}</span>
              {isStock && lowStock.length > 0 && (
                <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-rose-500" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Modals Dialog */}
      {modal === "stock" && (
        <StockModal
          onClose={() => setModal(null)}
          onSave={(stock) => {
            const nextStocks = [stock, ...stocks];
            const nextTransactions: Transaction[] = [
              {
                id: crypto.randomUUID(),
                date: new Date().toISOString().slice(0, 10),
                type: "expense",
                title: `Belanja stok: ${stock.name}`,
                amount: stock.quantity * stock.buyPrice,
                method: "Tunai",
              },
              ...transactions,
            ];
            commitState(
              {
                ...snapshot,
                stocks: nextStocks,
                transactions: nextTransactions,
              },
              `Bahan ${stock.name} berhasil ditambahkan`,
            );
            setModal(null);
          }}
        />
      )}

      {modal === "restock" && restockTarget && (
        <RestockModal
          stock={restockTarget}
          onClose={() => {
            setModal(null);
            setRestockTarget(null);
          }}
          onSave={(quantity, buyPrice, method) => {
            const nextStocks = stocks.map((stock) =>
              stock.id === restockTarget.id
                ? {
                    ...stock,
                    quantity: stock.quantity + quantity,
                    buyPrice,
                    updatedAt: "Baru saja",
                  }
                : stock,
            );
            const nextTransactions: Transaction[] = [
              {
                id: crypto.randomUUID(),
                date: new Date().toISOString().slice(0, 10),
                type: "expense",
                title: `Belanja stok: ${restockTarget.name}`,
                amount: quantity * buyPrice,
                method,
              },
              ...transactions,
            ];
            commitState(
              {
                ...snapshot,
                stocks: nextStocks,
                transactions: nextTransactions,
              },
              `Stok ${restockTarget.name} bertambah ${quantity} ${restockTarget.unit}`,
            );
            setModal(null);
            setRestockTarget(null);
          }}
        />
      )}

      {modal === "edit-stock" && editStockTarget && (
        <EditStockModal
          stock={editStockTarget}
          onClose={() => {
            setModal(null);
            setEditStockTarget(null);
          }}
          onSave={(updated) => {
            const nextStocks = stocks.map((stock) =>
              stock.id === updated.id ? updated : stock,
            );
            commitState(
              {
                ...snapshot,
                stocks: nextStocks,
              },
              `Bahan ${updated.name} berhasil diperbarui`,
            );
            setModal(null);
            setEditStockTarget(null);
          }}
        />
      )}

      {modal === "menu" && (
        <MenuModal
          stocks={stocks}
          recipes={recipes}
          onClose={() => setModal(null)}
          onSave={(product) => {
            const nextProducts = [product, ...products];
            commitState(
              {
                ...snapshot,
                products: nextProducts,
              },
              `Menu ${product.name} berhasil dibuat`,
            );
            setModal(null);
          }}
        />
      )}

      {modal === "edit-menu" && editMenuTarget && (
        <MenuModal
          stocks={stocks}
          recipes={recipes}
          product={editMenuTarget}
          onClose={() => {
            setModal(null);
            setEditMenuTarget(null);
          }}
          onSave={(updated) => {
            const nextProducts = products.map((product) =>
              product.id === updated.id ? updated : product,
            );
            commitState(
              {
                ...snapshot,
                products: nextProducts,
              },
              `Menu ${updated.name} berhasil diperbarui`,
            );
            setModal(null);
            setEditMenuTarget(null);
          }}
        />
      )}

      {modal === "recipe" && (
        <RecipeModal
          stocks={stocks}
          onClose={() => setModal(null)}
          onSave={(recipe) => {
            const nextRecipes = [recipe, ...recipes];
            commitState(
              {
                ...snapshot,
                recipes: nextRecipes,
              },
              `Resep ${recipe.name} berhasil disimpan`,
            );
            setModal(null);
          }}
        />
      )}

      {modal === "edit-recipe" && editRecipeTarget && (
        <RecipeModal
          stocks={stocks}
          recipe={editRecipeTarget}
          onClose={() => {
            setModal(null);
            setEditRecipeTarget(null);
          }}
          onSave={(updated) => {
            const nextRecipes = recipes.map((recipe) =>
              recipe.id === updated.id ? updated : recipe,
            );
            commitState(
              {
                ...snapshot,
                recipes: nextRecipes,
              },
              `Resep ${updated.name} berhasil diperbarui`,
            );
            setModal(null);
            setEditRecipeTarget(null);
          }}
        />
      )}

      {modal === "finance" && (
        <FinanceModal
          onClose={() => setModal(null)}
          onSave={(t) => {
            const nextTransactions = [t, ...transactions];
            commitState(
              {
                ...snapshot,
                transactions: nextTransactions,
              },
              `Transaksi berhasil dicatat`,
            );
            setModal(null);
          }}
        />
      )}

      {modal === "receipt" && lastSale && (
        <ReceiptModal sale={lastSale} onClose={() => setModal(null)} />
      )}

      {modal === "connection" && (
        <ConnectionModal
          currentCode={accessCode}
          busy={syncStatus === "connecting"}
          onClose={() => setModal(null)}
          onConnect={connect}
          onDisconnect={disconnect}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDelete={() => {
            let nextStocks = stocks;
            let nextProducts = products;
            let nextRecipes = recipes;

            if (deleteTarget.type === "stock") {
              nextStocks = stocks.filter((stock) => stock.id !== deleteTarget.id);
              nextProducts = products.map((product) => ({
                ...product,
                ingredients: product.ingredients.filter(
                  (ingredient) => ingredient.stockId !== deleteTarget.id,
                ),
              }));
              nextRecipes = recipes.map((recipe) => ({
                ...recipe,
                ingredients: recipe.ingredients.filter(
                  (ingredient) => ingredient.stockId !== deleteTarget.id,
                ),
              }));
            } else if (deleteTarget.type === "recipe") {
              nextRecipes = recipes.filter(
                (recipe) => recipe.id !== deleteTarget.id,
              );
              nextProducts = products.map((product) =>
                product.recipeId === deleteTarget.id
                  ? { ...product, recipeId: undefined }
                  : product,
              );
            } else {
              nextProducts = products.filter(
                (product) => product.id !== deleteTarget.id,
              );
            }

            commitState(
              {
                ...snapshot,
                stocks: nextStocks,
                products: nextProducts,
                recipes: nextRecipes,
              },
              `${deleteTarget.name} dihapus`,
            );
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
