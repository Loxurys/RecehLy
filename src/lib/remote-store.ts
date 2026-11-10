export interface AppState {
  stocks: any[];
  products: any[];
  recipes: any[];
  transactions: any[];
  demoData: boolean;
}

export function normalizeAccessCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function makeAccessCode(length: number = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 1. GET State dari Database Online (Neon.tech)
export async function getRemoteState(
  accessCode: string
): Promise<{ state: AppState; updatedAt: string } | null> {
  const code = normalizeAccessCode(accessCode);
  if (!code) return null;

  const response = await fetch(`/api/state/${code}`);

  if (response.status === 404) {
    return null; // Data toko belum dibuat di DB
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Gagal mengambil data dari database online.");
  }

  return response.json();
}

// 2. PUT State ke Database Online (Save State)
export async function saveRemoteState(
  accessCode: string,
  state: AppState
): Promise<{ updatedAt: string }> {
  const code = normalizeAccessCode(accessCode);
  if (!code) throw new Error("Kode akses tidak valid.");

  // Membungkus payload di dalam objek 'state' agar lolos validasi normalizedState() di backend Express
  const payload = {
    state: {
      stocks: state.stocks || [],
      recipes: state.recipes || [],
      products: state.products || [],
      transactions: state.transactions || [],
      demoData: Boolean(state.demoData),
    },
  };

  const response = await fetch(`/api/state/${code}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Gagal menyimpan data ke database online.");
  }

  return response.json();
}

// 3. POST Transaksi Kasir (Checkout Remote)
export async function checkoutRemote(
  accessCode: string,
  items: { productId: string; quantity: number }[],
  method: string
): Promise<{ state: AppState; sale: any; updatedAt: string }> {
  const code = normalizeAccessCode(accessCode);
  if (!code) throw new Error("Kode akses tidak valid.");

  const response = await fetch(`/api/state/${code}/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items, method }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Proses checkout gagal.");
  }

  return response.json();
}