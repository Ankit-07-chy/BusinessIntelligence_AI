import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./core/logger.js";

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`${env.APP_NAME} listening on port ${env.PORT}`);
});
