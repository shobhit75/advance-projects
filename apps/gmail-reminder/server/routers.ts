import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  getRemindersByUserId,
  getReminderById,
  createReminder,
  updateReminder,
  deleteReminder,
  getGmailSettings,
  getGmailSettingsDecrypted,
  upsertGmailSettings,
  getDueReminders,
} from "./db";
import { sendEmail, testGmailConnection } from "./gmail";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  reminders: router({
    list: protectedProcedure
      .input(
        z.object({
          status: z.enum(["scheduled", "sent", "failed"]).optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        return getRemindersByUserId(ctx.user.id, input.status);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const reminder = await getReminderById(input.id, ctx.user.id);
        if (!reminder) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return reminder;
      }),

    create: protectedProcedure
      .input(
        z.object({
          subject: z.string().min(1),
          body: z.string().min(1),
          scheduledAt: z.date(),
          recipients: z.array(z.string().email()).min(1, "At least one recipient is required"),
          recurrence: z.enum(["none", "daily", "weekly", "monthly", "yearly"]).default("none"),
          recurrenceEndsAt: z.date().optional(),
          attachments: z.array(z.object({
            filename: z.string(),
            content: z.string(),
            encoding: z.string(),
          })).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const reminderData: Parameters<typeof createReminder>[0] = {
          userId: ctx.user.id,
          subject: input.subject,
          body: input.body,
          recipients: input.recipients.join(","),
          scheduledAt: input.scheduledAt,
          recurrence: input.recurrence,
          status: "scheduled",
        };
        if (input.recurrenceEndsAt) {
          reminderData.recurrenceEndsAt = input.recurrenceEndsAt;
        }
        if (input.attachments && input.attachments.length > 0) {
          reminderData.attachments = JSON.stringify(input.attachments);
        }
        return createReminder(reminderData);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          subject: z.string().min(1).optional(),
          body: z.string().min(1).optional(),
          scheduledAt: z.date().optional(),
          recipients: z.array(z.string().email()).min(1).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const reminder = await getReminderById(input.id, ctx.user.id);
        if (!reminder) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        if (reminder.status !== "scheduled") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Can only edit scheduled reminders",
          });
        }
        await updateReminder(input.id, ctx.user.id, {
          subject: input.subject,
          body: input.body,
          recipients: input.recipients ? input.recipients.join(",") : undefined,
          scheduledAt: input.scheduledAt,
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const reminder = await getReminderById(input.id, ctx.user.id);
        if (!reminder) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        if (reminder.status !== "scheduled") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Can only delete scheduled reminders",
          });
        }
        await deleteReminder(input.id, ctx.user.id);
      }),

    retry: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const reminder = await getReminderById(input.id, ctx.user.id);
        if (!reminder) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        if (reminder.status !== "failed") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Can only retry failed reminders",
          });
        }
        const settings = await getGmailSettingsDecrypted(ctx.user.id);
        if (!settings) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Gmail settings not configured",
          });
        }
        const result = await sendEmail(settings, {
          to: reminder.recipients ? reminder.recipients.split(",").map(e => e.trim()).filter(Boolean) : [settings.email],
          subject: reminder.subject,
          html: reminder.body,
        });
        if (result.success) {
          await updateReminder(input.id, ctx.user.id, {
            status: "sent",
            sentAt: new Date(),
            errorMessage: null,
            retryCount: reminder.retryCount + 1,
          });
        } else {
          await updateReminder(input.id, ctx.user.id, {
            errorMessage: result.error,
            retryCount: reminder.retryCount + 1,
          });
        }
        return result;
      }),
  }),

  gmailSettings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const settings = await getGmailSettings(ctx.user.id);
      if (!settings) return null;
      return {
        email: settings.email,
        // Don't return the app password
      };
    }),

    update: protectedProcedure
      .input(
        z.object({
          email: z.string().email(),
          appPassword: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await upsertGmailSettings(ctx.user.id, input.email, input.appPassword);
        return { success: true };
      }),

    testConnection: protectedProcedure
      .input(
        z.object({
          email: z.string().email(),
          appPassword: z.string().min(1),
        })
      )
      .mutation(async ({ input }) => {
        const result = await testGmailConnection({
          email: input.email,
          appPassword: input.appPassword,
        });
        return result;
      }),
  }),
});

export type AppRouter = typeof appRouter;
