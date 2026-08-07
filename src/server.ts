import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import { config } from "./config";
import { apiRouter } from "./routes/api";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "20mb" }));

app.use("/api", apiRouter);

const publicDir = path.resolve("public");
app.use(express.static(publicDir));

app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Portal backend running at http://localhost:${config.port}`);
});
