import { Router } from "express";
import { actionsRouter } from "./v1/actions.js";
import { adminRouter } from "./v1/admin.js";
import { anomaliesRouter } from "./v1/anomalies.js";
import { authRouter } from "./v1/auth.js";
import { chatRouter } from "./v1/chat.js";
import { explanationsRouter } from "./v1/explanations.js";
import { feedbackRouter } from "./v1/feedback.js";
import { healthRouter } from "./v1/health.js";
import { kpisRouter } from "./v1/kpis.js";
import { personasRouter } from "./v1/personas.js";
import { securityRouter } from "./v1/security.js";
import { telemetryRouter } from "./v1/telemetry.js";
import { usersRouter } from "./v1/users.js";

import { prototypeRouter } from "./v1/prototype.js";

export const apiV1Router = Router();

apiV1Router.use(healthRouter);
apiV1Router.use(authRouter);
apiV1Router.use(usersRouter);
apiV1Router.use(kpisRouter);
apiV1Router.use(anomaliesRouter);
apiV1Router.use(explanationsRouter);
apiV1Router.use(actionsRouter);
apiV1Router.use(chatRouter);
apiV1Router.use(personasRouter);
apiV1Router.use(feedbackRouter);
apiV1Router.use(telemetryRouter);
apiV1Router.use(securityRouter);
apiV1Router.use(adminRouter);
apiV1Router.use(prototypeRouter);

