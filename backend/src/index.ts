import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./core/logger.js";

const app = createApp();

app.listen(env.PORT, "0.0.0.0", () => {
  logger.info(`${env.APP_NAME} listening on 0.0.0.0:${env.PORT}`);
});
