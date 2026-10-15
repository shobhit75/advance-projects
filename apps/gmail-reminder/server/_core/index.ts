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
import { handleSendReminders } from "../cron-handler";

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
  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  app.post("/api/scheduled/sendReminders", handleSendReminders);

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

    console.log("[Cron] Starting local reminder scheduler...");
    setInterval(async () => {
      try {
        const { getDueReminders, updateReminder, getGmailSettingsDecrypted, createReminder } = await import("../db");
        const { sendEmail } = await import("../gmail");

        const dueReminders = await getDueReminders();
        if (dueReminders.length === 0) return;

        console.log(`[Cron] Found ${dueReminders.length} due reminder(s), sending...`);

        for (const reminder of dueReminders) {
          try {
            const settings = await getGmailSettingsDecrypted(reminder.userId);
            if (!settings) {
              console.log(`[Cron] No Gmail settings for user ${reminder.userId}`);
              await updateReminder(reminder.id, reminder.userId, {
                status: "failed",
                errorMessage: "Gmail settings not configured",
                retryCount: reminder.retryCount + 1,
              });
              continue;
            }

            const recipients = reminder.recipients
              ? reminder.recipients.split(",").map((e: string) => e.trim()).filter(Boolean)
              : [settings.email];

            const result = await sendEmail(settings, {
              to: recipients,
              subject: reminder.subject,
              html: reminder.body,
            });

            if (result.success) {
              console.log(`[Cron] Reminder ${reminder.id} sent successfully`);
              await updateReminder(reminder.id, reminder.userId, {
                status: "sent",
                sentAt: new Date(),
                errorMessage: null,
              });

              // Schedule next occurrence for recurring reminders
              if (reminder.recurrence && reminder.recurrence !== "none") {
                const next = new Date(reminder.scheduledAt);
                if (reminder.recurrence === "daily") next.setDate(next.getDate() + 1);
                else if (reminder.recurrence === "weekly") next.setDate(next.getDate() + 7);
                else if (reminder.recurrence === "monthly") next.setMonth(next.getMonth() + 1);
                else if (reminder.recurrence === "yearly") next.setFullYear(next.getFullYear() + 1);

                const ended = reminder.recurrenceEndsAt && next > new Date(reminder.recurrenceEndsAt);
                if (!ended) {
                  await createReminder({
                    userId: reminder.userId,
                    subject: reminder.subject,
                    body: reminder.body,
                    recipients: reminder.recipients,
                    scheduledAt: next,
                    recurrence: reminder.recurrence,
                    recurrenceEndsAt: reminder.recurrenceEndsAt,
                    parentReminderId: reminder.parentReminderId ?? reminder.id,
                    status: "scheduled",
                  });
                  console.log(`[Cron] Next ${reminder.recurrence} occurrence scheduled for ${next.toISOString()}`);
                } else {
                  console.log(`[Cron] Recurrence ended for reminder ${reminder.id}`);
                }
              }
            } else {
              console.log(`[Cron] Reminder ${reminder.id} failed: ${result.error}`);
              await updateReminder(reminder.id, reminder.userId, {
                status: "failed",
                errorMessage: result.error,
                retryCount: reminder.retryCount + 1,
              });
            }
          } catch (err) {
            console.error(`[Cron] Error processing reminder ${reminder.id}:`, err);
          }
        }
      } catch (err) {
        console.error("[Cron] Scheduler error:", err);
      }
    }, 60_000);
  });
}

startServer().catch(console.error);
