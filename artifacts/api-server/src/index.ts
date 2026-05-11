import app from "./app";
import { logger } from "./lib/logger";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { setupWsServer } from "./lib/ws-server";

const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";
const enableWebsockets = !isVercel && process.env.ENABLE_WEBSOCKETS !== "false";

function startLocalServer(): void {
  const rawPort = process.env["PORT"] ?? "8080";
  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  if (enableWebsockets) {
    const httpServer = createServer(app);
    const wss = new WebSocketServer({ server: httpServer, path: "/api/ws" });
    setupWsServer(wss);

    httpServer.listen(port, (err?: Error) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening (HTTP + WS)");
    });
    return;
  }

  app.listen(port, (err?: Error) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening (HTTP)");
  });
}

if (!isVercel) {
  startLocalServer();
}

export default app;
