import nodemailer from "nodemailer";

export interface GmailConfig {
  email: string;
  appPassword: string;
}

export async function createGmailTransporter(config: GmailConfig) {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: config.email,
      pass: config.appPassword,
    },
  });
}

export async function sendEmail(
  config: GmailConfig,
  options: {
    to: string | string[];
    subject: string;
    html: string;
    attachments?: { filename: string; content: string; encoding: string }[];
  }
) {
  try {
    const transporter = await createGmailTransporter(config);
    const toAddresses = Array.isArray(options.to) ? options.to.join(", ") : options.to;
    const result = await transporter.sendMail({
      from: config.email,
      to: toAddresses,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments ?? [],
    });
    return { success: true, messageId: result.messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

export async function testGmailConnection(config: GmailConfig) {
  try {
    const transporter = await createGmailTransporter(config);
    await transporter.verify();
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}