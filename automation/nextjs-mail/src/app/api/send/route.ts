import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const EMAIL_ADDRESS = process.env.EMAIL_ADDRESS || "KHARESHOBHIT07@gmail.com";
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || "pfez htbt gplz ileq";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: EMAIL_ADDRESS,
    pass: EMAIL_PASSWORD,
  },
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const boxesRaw = formData.get("boxes") as string;
    const subject = (formData.get("subject") as string)?.trim();
    const body = (formData.get("body") as string)?.trim();

    if (!subject || !body) {
      return NextResponse.json(
        { error: "Subject and body are required" },
        { status: 400 }
      );
    }

    let boxList: {
      to: string;
      cc: string[];
      globalCc: string[];
      rowIndex: number;
    }[] = [];
    try {
      boxList = JSON.parse(boxesRaw || "[]");
    } catch {
      return NextResponse.json({ error: "Invalid boxes JSON" }, { status: 400 });
    }

    // Read all per-row files upfront, keyed by rowIndex
    const rowFilesMap = new Map<number, { filename: string; content: Buffer }[]>();
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("files_") && value instanceof File && value.size > 0) {
        const rowIndex = parseInt(key.replace("files_", ""), 10);
        if (!rowFilesMap.has(rowIndex)) rowFilesMap.set(rowIndex, []);
        const arrayBuffer = await value.arrayBuffer();
        rowFilesMap.get(rowIndex)!.push({
          filename: value.name,
          content: Buffer.from(arrayBuffer),
        });
      }
    }

    let sentCount = 0;
    const errors: { to: string; error: string }[] = [];

    for (const box of boxList) {
      const toAddr = box.to?.trim();
      if (!toAddr) continue;

      // Merge per-row CC + global CC, deduplicate
      const ccSet = new Set<string>([
        ...(box.cc || []).map((c) => c.trim()).filter(Boolean),
        ...(box.globalCc || []).map((c) => c.trim()).filter(Boolean),
      ]);
      const ccAddrs = [...ccSet];

      // Get files for this row
      const rowFiles = rowFilesMap.get(box.rowIndex) || [];
      const attachments = rowFiles.map((f) => ({
        filename: f.filename,
        content: f.content,
      }));

      try {
        await transporter.sendMail({
          from: EMAIL_ADDRESS,
          to: toAddr,
          cc: ccAddrs.join(", "),
          subject,
          text: body,
          attachments,
        });
        sentCount++;
      } catch (err: unknown) {
        errors.push({
          to: toAddr,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { status: "partial", sent: sentCount, errors },
        { status: 207 }
      );
    }

    return NextResponse.json({ status: "sent", sent: sentCount });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
