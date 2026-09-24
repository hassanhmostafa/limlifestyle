import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { handleKioskData, handleKioskLoginPoll } from "../routers/kioskIntegration";
import { seedKiosks, seedHealthReadings, updateUserProfile, getUserByOpenId } from "../db";
import { SEED_KIOSKS } from "../seed";
import { SEED_HEALTH_READINGS } from "../seedHealth";
import { ENV } from "./env";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Seed kiosk data on startup (safe to run multiple times)
  try {
    await seedKiosks(SEED_KIOSKS);
  } catch (err) {
    console.warn("[Seed] Could not seed kiosks:", err);
  }
  // Seed demo health readings for user id=1 (safe to run multiple times)
  try {
    await seedHealthReadings(SEED_HEALTH_READINGS);
  } catch (err) {
    console.warn("[Seed] Could not seed health readings:", err);
  }
  // Seed demo profile data for the owner user (gender + birthDate for BMI demo)
  try {
    const owner = await getUserByOpenId(ENV.ownerOpenId);
    if (owner && (!owner.gender || !owner.birthDate)) {
      await updateUserProfile(owner.id, { gender: "male", birthDate: "1990-05-15" });
      console.log("[Seed] Owner profile seeded with demo gender + birthDate");
    }
  } catch (err) {
    console.warn("[Seed] Could not seed owner profile:", err);
  }

  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // Version/health check endpoint
  app.get("/api/version", (_req, res) => {
    res.json({
      project: "LIM",
      version: "2.0.0",
      features: ["kiosk-integration", "expert-chat", "ai-plan", "bookings", "health-readings"],
      kioskDataEndpoint: "/api/kiosk/data",
      kioskLoginPollEndpoint: "/weixin/login/xcx",
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Kiosk QR login polling endpoint.
   * The machine generates a random token, shows it as a QR code, then polls this URL
   * every second to check if the user has scanned and confirmed via the LIM app.
   * URL format is fixed by the machine firmware (matches Henan Lejia WeChat login protocol).
   */
  app.get("/weixin/login/xcx", handleKioskLoginPoll);

  // Human-readable status when the URL is opened in a phone/browser. The X18 itself
  // must use POST; this GET response makes configuration testing unambiguous.
  app.get("/api/kiosk/data", (_req, res) => {
    res.json({
      status: "online",
      service: "LIM X18_5 data upload",
      method: "POST",
      contentType: "application/json",
      message: "This endpoint is ready for the machine. Opening it in a browser does not submit a measurement.",
    });
  });

  // Kiosk data ingestion endpoint (plain HTTP POST from TRIPLEBIGHT kiosk machines)
  app.post("/api/kiosk/data", handleKioskData);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
