import CryptoJS from "crypto-js";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "gmail-reminder-default-key-change-in-production";

export function encryptAppPassword(password: string): string {
  return CryptoJS.AES.encrypt(password, ENCRYPTION_KEY).toString();
}

export function decryptAppPassword(encrypted: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
