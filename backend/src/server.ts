import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { applyAuthContext } from "./auth/middleware";
import { initializeAuthDatabase } from "./store/auth-store";
import { initializePresentationDatabase } from "./store/presentation-store";
import { authRouter } from "./routes/auth";
import { apiRouter } from "./routes/api";
import { healthRouter } from "./routes/health";

dotenv.config();
initializeAuthDatabase();
initializePresentationDatabase();

const app = express();
const port = Number(process.env.PORT || 4000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

app.use(cors({ origin: frontendOrigin, credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(applyAuthContext);
app.use(healthRouter);
app.use("/api/auth", authRouter);
app.use("/api", apiRouter);

app.listen(port, () => {
  console.log(`AutoQ&A backend listening on http://localhost:${port}`);
});
