import app from "./app.js";
import { env } from "./config/env.js";
import { startLogRetentionJob } from "./modules/logs/logs.service.js";
import { startScissorLiftMonitor } from "./modules/scissor-lift/scissor-lift.monitor.js";

startScissorLiftMonitor();

app.listen(env.PORT, () => {
  console.log(`API running at http://localhost:${env.PORT}`);
  startLogRetentionJob();
  startScissorLiftMonitor();
});
