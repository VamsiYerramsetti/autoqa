import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { apiRouter } from "./routes/api";
import { healthRouter } from "./routes/health";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

app.use(cors({ origin: frontendOrigin }));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(healthRouter);
app.use("/api", apiRouter);

app.listen(port, () => {
  console.log(`AutoQ&A backend listening on http://localhost:${port}`);
});
