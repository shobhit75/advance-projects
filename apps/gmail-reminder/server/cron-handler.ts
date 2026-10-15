import { Request, Response } from "express";
import { getDueReminders, updateReminder, getGmailSettingsDecrypted } from "./db";
import { sendEmail } from "./gmail";
import { sdk } from "./_core/sdk";

export async function handleSendReminders(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const dueReminders = await getDueReminders();

    if (dueReminders.length === 0) {
      return res.json({ ok: true, processed: 0 });
    }

    let processed = 0;
    let failed = 0;

    for (const reminder of dueReminders) {
      try {
        const settings = await getGmailSettingsDecrypted(reminder.userId);

        if (!settings) {
          await updateReminder(reminder.id, reminder.userId, {
            status: "failed",
            errorMessage: "Gmail settings not configured",
            retryCount: reminder.retryCount + 1,
          });
          failed++;
          continue;
        }

        const result = await sendEmail(settings, {
          to: reminder.recipients ? reminder.recipients.split(",").map((e: string) => e.trim()).filter(Boolean) : [settings.email],
          subject: reminder.subject,
          html: reminder.body,
        });

        if (result.success) {
          await updateReminder(reminder.id, reminder.userId, {
            status: "sent",
            sentAt: new Date(),
            errorMessage: null,
          });
          processed++;
        } else {
          await updateReminder(reminder.id, reminder.userId, {
            status: "failed",
            errorMessage: result.error,
            retryCount: reminder.retryCount + 1,
          });
          failed++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await updateReminder(reminder.id, reminder.userId, {
          status: "failed",
          errorMessage: errorMessage,
          retryCount: reminder.retryCount + 1,
        });
        failed++;
      }
    }

    res.json({
      ok: true,
      processed,
      failed,
      total: dueReminders.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    res.status(500).json({
      error: errorMessage,
      stack,
      context: { url: req.url, method: req.method },
      timestamp: new Date().toISOString(),
    });
  }
}
