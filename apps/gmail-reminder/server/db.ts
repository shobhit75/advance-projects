import { eq, and, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, reminders, InsertReminder, gmailSettings } from "../drizzle/schema";
import { ENV } from './_core/env';
import { encryptAppPassword, decryptAppPassword } from "./encryption";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getRemindersByUserId(userId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];

  if (status) {
    return db
      .select()
      .from(reminders)
      .where(and(eq(reminders.userId, userId), eq(reminders.status, status as any)))
      .orderBy((t) => t.scheduledAt);
  }
  return db
    .select()
    .from(reminders)
    .where(eq(reminders.userId, userId))
    .orderBy((t) => t.scheduledAt);
}

export async function getReminderById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createReminder(data: InsertReminder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(reminders).values(data);
  return result[0];
}

export async function updateReminder(id: number, userId: number, data: Partial<InsertReminder>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(reminders)
    .set(data)
    .where(and(eq(reminders.id, id), eq(reminders.userId, userId)));
}

export async function deleteReminder(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.userId, userId)));
}

export async function getGmailSettings(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(gmailSettings)
    .where(eq(gmailSettings.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function upsertGmailSettings(userId: number, email: string, appPassword: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const encryptedPassword = encryptAppPassword(appPassword);

  await db
    .insert(gmailSettings)
    .values({ userId, email, appPassword: encryptedPassword })
    .onDuplicateKeyUpdate({
      set: { email, appPassword: encryptedPassword, updatedAt: new Date() },
    });
}

export async function getGmailSettingsDecrypted(userId: number) {
  const settings = await getGmailSettings(userId);
  if (!settings) return undefined;

  return {
    ...settings,
    appPassword: decryptAppPassword(settings.appPassword),
  };
}

export async function getDueReminders() {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  return db
    .select()
    .from(reminders)
    .where(
      and(
        eq(reminders.status, "scheduled"),
        lte(reminders.scheduledAt, now)
      )
    )
    .orderBy((t) => t.scheduledAt);
}
