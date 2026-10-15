import express from "express";
import apiRoutes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(express.json());

app.get("/", (_request, response) => {
  response.json({
    message: "Hotel ASRS HMI Backend API",
    status: "running",
  });
});

app.get("/health", (_request, response) => {
  response.json({
    status: "ok",
  });
});

app.use("/api", apiRoutes);

app.use(errorHandler);

export default app;