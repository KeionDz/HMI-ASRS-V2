import express from "express";
import apiRoutes from "./routes/index.js";

const app = express();

app.use(express.json());

// Main API routes
app.use("/api", apiRoutes);

// Optional root endpoint
app.get("/", (_request, response) => {
  response.json({
    message: "Hotel ASRS HMI Backend API",
    status: "running",
  });
});

// Preserve the existing health endpoint
app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

export default app;