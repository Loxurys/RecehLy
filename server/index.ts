import "dotenv/config";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import express from "express";
import { app, ensureTables } from "./app.js";

const port = Number(process.env.PORT || 3001);

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, "..", "dist");

app.use(express.static(dist));
app.get("/{*path}", (_request, response) => response.sendFile(join(dist, "index.html")));

ensureTables()
  .then(() => {
    app.listen(port, () => console.log(`Server jalan di port ${port}`));
  })
  .catch((error) => {
    console.error("Database gagal dihubungkan", error);
    process.exit(1);
  });
