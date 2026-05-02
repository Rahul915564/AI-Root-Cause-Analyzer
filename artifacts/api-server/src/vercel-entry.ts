import express from "express";
import cors from "cors";
import router from "./routes/index.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/api", router);

export default app;
