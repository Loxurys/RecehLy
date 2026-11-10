import serverless from "serverless-http";
import { app, ensureTables, pool } from "../../server/app.js";

const serverlessHandler = serverless(app);

export const handler = async (event: any, context: any) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (!pool) {
    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "DATABASE_URL belum dikonfigurasi di Netlify." }),
    };
  }

  try {
    await ensureTables();
    return await serverlessHandler(event, context);
  } catch (error) {
    console.error("Database initialization error:", error);
    const code = (error as { code?: string })?.code;
    const message =
      code === "ENOTFOUND" || code === "ENETUNREACH"
        ? "Host database tidak bisa dijangkau. Untuk Supabase, gunakan connection string Connection Pooler (…pooler.supabase.com:6543), bukan db.<ref>.supabase.co, lalu redeploy."
        : "Gagal terhubung ke database. Periksa koneksi PostgreSQL kamu.";
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    };
  }
};