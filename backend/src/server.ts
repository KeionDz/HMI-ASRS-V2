import app from "./app.js";
import { env } from "./config/env.js";
import { startLogRetentionJob } from "./modules/logs/logs.service.js";
import { startScissorLiftMonitor } from "./modules/scissor-lift/scissor-lift.monitor.js";
import { startAgvMonitor } from "./modules/agv/agv.monitor.js";
import { startAssetsMqtt } from "./modules/assets/assets.mqtt.js";

startScissorLiftMonitor();
startAgvMonitor();
startAssetsMqtt();

app.listen(env.PORT, () => {
  console.log(`API running at http://localhost:${env.PORT}`);
  startLogRetentionJob();
  startScissorLiftMonitor();
});
