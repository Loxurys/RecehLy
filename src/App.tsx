import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  BarChart3,
  Bell,
  ClipboardList,
  Cloud,
  CloudOff,
  LayoutDashboard,
  Loader2,
  Menu as MenuIcon,
  Package,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Wallet,
  Zap,
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
  StockPage,
} from "./components/pages";
import {
  ConnectionModal,
  DeleteModal,
  EditStockModal,
  FinanceModal,
  MenuModal,
  RecipeModal,
  RestockModal,
  StockModal,
} from "./components/modals";

export const APP_CONFIG = {
  name: "ini_nama",
  tagline: "POS & Inventory Engine",
  logo: "/favicon.svg",
};

function App() {
  const [page, setPage] = useState<Page>("cashier");
  const [stocks, setStocks] = useState<Stock[]>(() =>
    load("app-stocks", initialStock)
  );
  const [products, setProducts] = useState<Product[]>(() =>
    load("app-products", initialProducts)
  );
  const [recipes, setRecipes] = useState<Recipe[]>(() =>
    load("app-recipes", initialRecipes)
  );
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    load("app-transactions", initialTransactions)
  );
  const [demoData, setDemoData] = useState(
    () => localStorage.getItem("app-mode") !== "empty"
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
  const [accessCode, setAccessCode] = useState<string | null>(() =>
    localStorage.getItem("app-access-code")
  );
  const [syncStatus, setSyncStatus] = useState<
    "local" | "connecting" | "online" | "syncing" | "error"
  >(accessCode ? "connecting" : "local");
  const [remoteReady, setRemoteReady] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  const lastKnownServerUpdatedAt = useRef<string | null>(null);

  const snapshot = useMemo<AppState>(
    () => ({ stocks, products, recipes, transactions, demoData }),
    [stocks, products, recipes, transactions, demoData]
  );

  const showToast = useCallback((msg: string) => {
    setNotice(msg);
    setTimeout(() => {
      setNotice((prev) => (prev === msg ? "" : prev));
    }, 2800);
  }, []);

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

      try {
        const channel = new BroadcastChannel("app-sync");
        channel.postMessage("sync");
        channel.close();
      } catch {
        // BroadcastChannel tidak tersedia
      }

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
            if (toastMsg) showToast(`${toastMsg} (tersimpan di HP)`);
          });
      } else {
        if (toastMsg) showToast(toastMsg);
      }
    },
    [accessCode, showToast]
  );

  const applySnapshot = useCallback((next: AppState) => {
    setStocks(next.stocks);
    setProducts(next.products);
    setRecipes(next.recipes);
    setTransactions(next.transactions);
    setDemoData(next.demoData);
    setCart((prev) =>
      prev.filter((item) => next.products.some((p) => p.id === item.product.id))
    );
  }, []);

  useEffect(() => {
    if (!accessCode) {
      setSyncStatus("local");
      setRemoteReady(false);
      return;
    }
    let active = true;
    setSyncStatus("connecting");

    const timer = setTimeout(() => {
      if (active && syncStatus === "connecting") {
        setSyncStatus("error");
        showToast("Koneksi lambat, mode offline");
      }
    }, 6000);

    getRemoteState(accessCode)
      .then((remote) => {
        if (!active) return;
        clearTimeout(timer);
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
          clearTimeout(timer);
          setRemoteReady(true);
          setSyncStatus("online");
        }
      })
      .catch((err) => {
        console.error("Initial connect failed:", err);
        if (active) {
          clearTimeout(timer);
          setSyncStatus("error");
        }
      });

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [accessCode]);

  useEffect(() => {
    if (!accessCode || !remoteReady) return;
    const interval = window.setInterval(() => {
      getRemoteState(accessCode)
        .then((remote) => {
          if (!remote) return;
          if (
            lastKnownServerUpdatedAt.current &&
            remote.updatedAt === lastKnownServerUpdatedAt.current
          ) {
            return;
          }
          lastKnownServerUpdatedAt.current = remote.updatedAt;
          applySnapshot(remote.state);
          setSyncStatus("online");
        })
        .catch(() => {
          setSyncStatus("error");
        });
    }, 8000);
    return () => window.clearInterval(interval);
  }, [accessCode, applySnapshot, remoteReady]);

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
          showToast("Data tersimpan ke cloud");
        })
        .catch(() => {
          setSyncStatus("error");
          showToast("Tersimpan di penyimpanan HP");
        });
      return;
    }
    commitState(snapshot, "Tersimpan lokal di HP");
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
        showToast(`Tersambung: ${code}`);
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
    showToast("Menggunakan mode offline");
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
      nextDemoData ? "Data sampel dimuat" : "Data dites dari nol"
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
    { id: "finance", label: "Keuangan & Laporan", icon: Wallet },
  ];

  const addToCart = (product: Product) =>
    setCart((current) => {
      const found = current.find((item) => item.product.id === product.id);
      return found
        ? current.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        : [...current, { product, quantity: 1 }];
    });

  const updateCart = (id: string, quantity: number) =>
    setCart((current) =>
      quantity <= 0
        ? current.filter((item) => item.product.id !== id)
        : current.map((item) =>
            item.product.id === id ? { ...item, quantity } : item
          )
    );

  const total = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
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
          method
        );
        lastKnownServerUpdatedAt.current = result.updatedAt;
        applySnapshot(result.state);
        setCart([]);
        setSyncStatus("online");
        showToast("Pembayaran berhasil dicatat");
      } catch (error) {
        setSyncStatus("error");
        showToast(
          error instanceof Error ? error.message : "Gagal checkout."
        );
      }
      return;
    }

    if (cart.some((item) => !canFulfill(item))) {
      showToast("Stok kurang! Cek ketersediaan bahan.");
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
          (i) => i.stockId === stock.id
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
      "Transaksi berhasil"
    );

    setCart([]);
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-ink flex flex-col font-sans antialiased selection:bg-moss selection:text-white">
      {/* Sidebar Desktop */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-white lg:flex">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-line/60">
          <div className="grid h-10 w-10 place-items-center rounded-2xl overflow-hidden bg-moss text-white shadow-xs">
            {APP_CONFIG.logo ? (
              <img src={APP_CONFIG.logo} alt={APP_CONFIG.name} className="h-full w-full object-cover" />
            ) : (
              <ShoppingBasket size={20} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold tracking-tight text-ink truncate">{APP_CONFIG.name}</p>
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
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-moss">
              <Smartphone size={15} /> Database Online
            </div>
            <span
              className={`h-2 w-2 rounded-full ${
                syncStatus === "online"
                  ? "bg-emerald-500 animate-pulse"
                  : syncStatus === "syncing" || syncStatus === "connecting"
                    ? "bg-amber-500 animate-spin"
                    : "bg-slate-400"
              }`}
            />
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600 truncate">
            {accessCode ? `Kode: ${accessCode}` : "Mode Offline HP"}
          </p>
          <button
            onClick={() => setModal("connection")}
            className="mt-2.5 text-xs font-bold text-moss hover:underline"
          >
            {accessCode ? "Ubah Perangkat" : "+ Hubungkan HP"}
          </button>
        </div>
      </aside>

      {/* Main Canvas Area */}
      <main className="lg:ml-64 flex-1 flex flex-col">
        {/* Header Layar */}
        <header className="no-print sticky top-0 z-20 border-b border-line/40 bg-[#f7f7f5]/90 px-4 py-3 backdrop-blur-md sm:px-8">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-moss text-white shadow-xs lg:hidden">
                <Zap size={18} />
              </div>
              <h1 className="truncate text-base font-extrabold tracking-tight text-ink sm:text-xl">
                {nav.find((n) => n.id === page)?.label || "Kasir"}
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => setModal("connection")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition active:scale-95 ${
                  syncStatus === "online"
                    ? "bg-emerald-100/80 text-emerald-900 border border-emerald-300/60"
                    : syncStatus === "syncing" || syncStatus === "connecting"
                      ? "bg-amber-100/90 text-amber-900 border border-amber-300"
                      : "border border-line bg-white text-slate-600"
                }`}
              >
                {syncStatus === "online" ? (
                  <Cloud size={14} className="text-emerald-700 shrink-0" />
                ) : syncStatus === "syncing" || syncStatus === "connecting" ? (
                  <Loader2 size={14} className="text-amber-700 shrink-0 animate-spin" />
                ) : (
                  <CloudOff size={14} className="text-slate-400 shrink-0" />
                )}
                <span className="font-mono text-[11px] font-extrabold uppercase tracking-wider">
                  {accessCode
                    ? accessCode
                    : syncStatus === "connecting"
                      ? "Menghubungkan..."
                      : "Offline"}
                </span>
              </button>

              <div className="flex items-center gap-1 rounded-2xl border border-line bg-white p-1 shadow-2xs">
                <button
                  onClick={manualSync}
                  className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 active:scale-95"
                  title="Simpan / Sinkronkan"
                >
                  <ArrowDownToLine size={16} className={syncStatus === "syncing" ? "animate-bounce text-moss" : ""} />
                </button>

                <button
                  onClick={() => setPage("stock")}
                  className="relative rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 active:scale-95"
                  title="Stok Menipis"
                >
                  <Bell size={16} />
                  {lowStock.length > 0 && (
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </header>

        {notice && (
          <div className="no-print fixed right-4 top-16 z-50 rounded-2xl bg-slate-900/90 px-4 py-3 text-xs font-semibold text-white shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
            {notice}
          </div>
        )}

        <div className="mx-auto w-full max-w-7xl flex-1 p-3.5 pb-28 sm:p-6 lg:p-8 lg:pb-8">
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
                    (ingredient) => ingredient.stockId === stock.id
                  )
                );
                const usedInRecipe = recipes.some((recipe) =>
                  recipe.ingredients.some(
                    (ingredient) => ingredient.stockId === stock.id
                  )
                );
                if (usedInMenu || usedInRecipe) {
                  showToast(
                    "Bahan terpakai! Hapus dari menu/resep terlebih dahulu."
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
        </div>
      </main>

      {/* Floating Bottom Dock Navigation */}
      <nav className="no-print fixed inset-x-4 bottom-4 z-30 grid h-16 grid-cols-5 items-center rounded-3xl bg-[#17221f]/95 border border-white/10 px-2 text-white shadow-2xl backdrop-blur-md lg:hidden">
        <button
          onClick={() => setPage("dashboard")}
          className={`grid justify-items-center gap-1 text-[10px] font-bold transition active:scale-90 ${
            page === "dashboard" ? "text-white" : "text-white/40"
          }`}
        >
          <LayoutDashboard size={19} />
          <span>Home</span>
        </button>

        <button
          onClick={() => setPage("stock")}
          className={`relative grid justify-items-center gap-1 text-[10px] font-bold transition active:scale-90 ${
            page === "stock" ? "text-white" : "text-white/40"
          }`}
        >
          <Package size={19} />
          <span>Stok</span>
          {lowStock.length > 0 && (
            <span className="absolute top-0 right-4 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#17221f]" />
          )}
        </button>

        <button
          onClick={() => setPage("cashier")}
          className="relative -top-5 grid h-15 w-15 justify-self-center place-items-center rounded-full border-[5px] border-[#f7f7f5] bg-moss text-white shadow-xl transition active:scale-90"
        >
          <ShoppingBasket size={24} />
        </button>

        <button
          onClick={() => setPage("menu")}
          className={`grid justify-items-center gap-1 text-[10px] font-bold transition active:scale-90 ${
            page === "menu" ? "text-white" : "text-white/40"
          }`}
        >
          <ClipboardList size={19} />
          <span>Menu</span>
        </button>

        <button
          onClick={() => setMobileMoreOpen(true)}
          className={`grid justify-items-center gap-1 text-[10px] font-bold transition active:scale-90 ${
            page === "finance" || page === "report"
              ? "text-white"
              : "text-white/40"
          }`}
        >
          <MenuIcon size={19} />
          <span>Lainnya</span>
        </button>
      </nav>

      {/* Bottom Sheet Menu "Lainnya" */}
        {mobileMoreOpen && (
          <div
            onClick={(event) =>
              event.target === event.currentTarget && setMobileMoreOpen(false)
            }
            className="no-print fixed inset-0 z-50 flex items-end bg-slate-950/40 p-3 backdrop-blur-xs lg:hidden animate-in fade-in duration-150"
          >
            <div className="w-full rounded-3xl bg-white p-5 shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
              <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200" />
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Navigasi & Pengaturan
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setPage("finance");
                    setMobileMoreOpen(false);
                  }}
                  className={`flex items-center gap-3 rounded-2xl p-4 text-left text-sm font-bold transition active:scale-95 ${
                    page === "finance"
                      ? "bg-moss text-white"
                      : "bg-slate-50 text-ink hover:bg-slate-100"
                  }`}
                >
                  <Wallet
                    size={20}
                    className={page === "finance" ? "text-white" : "text-moss"}
                  />
                  Keuangan
                </button>

                <button
                  onClick={() => {
                    setPage("report");
                    setMobileMoreOpen(false);
                  }}
                  className={`flex items-center gap-3 rounded-2xl p-4 text-left text-sm font-bold transition active:scale-95 ${
                    page === "report"
                      ? "bg-moss text-white"
                      : "bg-slate-50 text-ink hover:bg-slate-100"
                  }`}
                >
                  <BarChart3
                    size={20}
                    className={page === "report" ? "text-white" : "text-moss"}
                  />
                  Laporan
                </button>

                <button
                  onClick={() => {
                    switchData();
                    setMobileMoreOpen(false);
                  }}
                  className="col-span-2 flex items-center justify-between rounded-2xl border border-line bg-slate-50 p-4 text-left text-sm font-bold text-ink transition active:scale-95"
                >
                  <div className="flex items-center gap-3">
                    <Sparkles size={20} className="text-moss" />
                    <span>Mode Data Aplikasi</span>
                  </div>
                  <span className="rounded-xl border border-line bg-white px-3 py-1 text-xs font-extrabold text-moss shadow-2xs">
                    {demoData ? "Data Demo" : "Data Kosong"}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setMobileMoreOpen(false);
                    setModal("connection");
                  }}
                  className="col-span-2 flex items-center justify-between rounded-2xl bg-[#edf6f2] p-4 text-left text-sm font-bold text-moss transition active:scale-95"
                >
                  <div className="flex items-center gap-3">
                    <Smartphone size={20} />
                    <span>Sinkronisasi HP / Toko</span>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 font-mono text-xs text-moss shadow-2xs">
                    {accessCode || "Setup"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Global Modals System */}
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
              `Stok ${stock.name} ditambah`
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
                : stock
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
              `Restock ${restockTarget.name} +${quantity}`
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
              stock.id === updated.id ? updated : stock
            );
            commitState(
              {
                ...snapshot,
                stocks: nextStocks,
              },
              `Bahan ${updated.name} diperbarui`
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
              `Menu ${product.name} dibuat`
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
              product.id === updated.id ? updated : product
            );
            commitState(
              {
                ...snapshot,
                products: nextProducts,
              },
              `Menu ${updated.name} diperbarui`
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
              `Resep ${recipe.name} dibuat`
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
              recipe.id === updated.id ? updated : recipe
            );
            commitState(
              {
                ...snapshot,
                recipes: nextRecipes,
              },
              `Resep ${updated.name} diperbarui`
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
              `Transaksi tercatat`
            );
            setModal(null);
          }}
        />
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
                  (ingredient) => ingredient.stockId !== deleteTarget.id
                ),
              }));
              nextRecipes = recipes.map((recipe) => ({
                ...recipe,
                ingredients: recipe.ingredients.filter(
                  (ingredient) => ingredient.stockId !== deleteTarget.id
                ),
              }));
            } else if (deleteTarget.type === "recipe") {
              nextRecipes = recipes.filter(
                (recipe) => recipe.id !== deleteTarget.id
              );
              nextProducts = products.map((product) =>
                product.recipeId === deleteTarget.id
                  ? { ...product, recipeId: undefined }
                  : product
              );
            } else {
              nextProducts = products.filter(
                (product) => product.id !== deleteTarget.id
              );
            }

            commitState(
              {
                ...snapshot,
                stocks: nextStocks,
                products: nextProducts,
                recipes: nextRecipes,
              },
              `${deleteTarget.name} telah dihapus`
            );
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}

export default App;