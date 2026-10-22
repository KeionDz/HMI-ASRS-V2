import app from "./app.js";
import { env } from "./config/env.js";
import { startLogRetentionJob } from "./modules/logs/logs.service.js";

app.listen(env.PORT, () => {
  console.log(`API running at http://localhost:${env.PORT}`);
  startLogRetentionJob();
});
