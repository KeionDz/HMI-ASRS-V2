import app from "./app.js";
import { env } from "./config/env.js";
import { startLogRetentionJob } from "./modules/logs/logs.service.js";
import { startScissorLiftMonitor } from "./modules/scissor-lift/scissor-lift.monitor.js";
import { startAgvMonitor } from "./modules/agv/agv.monitor.js";
import { startAssetsMqtt } from "./modules/assets/assets.mqtt.js";
import { startScheduleMonitor } from "./modules/schedule/schedule.monitor.js";
import { startEventAutoUnassignmentJob } from "./modules/events/events.auto-unassignment.js";
import { startEventCsvIngestionJob } from "./modules/events/events.ingestion.js";
import { startAsrsMonitor } from "./modules/storage/asrs.monitor.js";
import { startAsrsMqtt } from "./modules/storage/asrs.mqtt.js";
import { startDeviceAlarmsMqtt } from "./shared/device-alarms.mqtt.js";


startDeviceAlarmsMqtt();
startScissorLiftMonitor();
startAgvMonitor();
startAssetsMqtt();
startScheduleMonitor();
startAsrsMonitor();
startAsrsMqtt();

app.listen(env.PORT, () => {
  console.log(`API running at http://localhost:${env.PORT}`);
  startLogRetentionJob();
  startEventAutoUnassignmentJob();
  startEventCsvIngestionJob();
});