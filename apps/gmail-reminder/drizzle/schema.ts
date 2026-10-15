import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, datetime, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const reminders = mysqlTable(
  "reminders",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    body: text("body").notNull(),
    recipients: text("recipients").notNull().default(""),
    recurrence: mysqlEnum("recurrence", ["none", "daily", "weekly", "monthly", "yearly"]).default("none").notNull(),
    recurrenceEndsAt: datetime("recurrenceEndsAt"),
    parentReminderId: int("parentReminderId"),
    attachments: text("attachments"),
    scheduledAt: datetime("scheduledAt").notNull(),
    sentAt: datetime("sentAt"),
    status: mysqlEnum("status", ["scheduled", "sent", "failed"]).default("scheduled").notNull(),
    errorMessage: text("errorMessage"),
    retryCount: int("retryCount").default(0).notNull(),
    scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("userIdIdx").on(table.userId),
    statusIdx: index("statusIdx").on(table.status),
    scheduledAtIdx: index("scheduledAtIdx").on(table.scheduledAt),
    cronTaskUidIdx: index("cronTaskUidIdx").on(table.scheduleCronTaskUid),
  })
);

export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = typeof reminders.$inferInsert;

export const gmailSettings = mysqlTable(
  "gmailSettings",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().unique(),
    email: varchar("email", { length: 320 }).notNull(),
    appPassword: text("appPassword").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("userIdIdx").on(table.userId),
  })
);

export type GmailSettings = typeof gmailSettings.$inferSelect;
export type InsertGmailSettings = typeof gmailSettings.$inferInsert;