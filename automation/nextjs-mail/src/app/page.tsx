"use client";

import { useState, useRef, useCallback } from "react";
import styles from "./page.module.css";

// ── Types ──────────────────────────────────────────────────────────
interface Row {
  id: number;
  open: boolean;
  emails: string[];
  files: File[];
  fileLimit: number;
  emailLimit: number;
}

interface Toast {
  id: number;
  type: "success" | "error" | "warning";
  msg: string;
  icon: string;
}

let rowCounter = 0;

function makeRow(): Row {
  return {
    id: rowCounter++,
    open: true,
    emails: [],
    files: [],
    fileLimit: 3,
    emailLimit: 1,
  };
}

// ── Modal ──────────────────────────────────────────────────────────
function Modal({
  title,
  subtitle,
  onClose,
  onConfirm,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle}>{title}</h3>
            <p className={styles.modalSub}>{subtitle}</p>
          </div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        {children}
        <div className={styles.modalFooter}>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose}>Cancel</button>
          <button className={`${styles.btn} ${styles.btnAccent}`} onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function Home() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [globalCc, setGlobalCc] = useState("");
  const [rows, setRows] = useState<Row[]>([makeRow()]);
  const [sending, setSending] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Modals
  const [pasteModal, setPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [rowEmailModal, setRowEmailModal] = useState<number | null>(null);
  const [rowEmailText, setRowEmailText] = useState("");

  const pasteAttachInputRef = useRef<HTMLInputElement>(null);

  // ── Toast ──
  const toast = useCallback((type: Toast["type"], icon: string, msg: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, type, icon, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  // ── Rows ──
  const addRow = () => setRows((r) => [...r, makeRow()]);
  const removeRow = (id: number) => setRows((r) => r.filter((x) => x.id !== id));
  const toggleRow = (id: number) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, open: !x.open } : x)));
  const updateRow = (id: number, patch: Partial<Row>) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  // ── Distribute emails ──
  const parseEmails = (text: string) =>
    text.split(/,|\n/).map((s) => s.trim()).filter(Boolean);

  const distributeEmails = () => {
    const emails = parseEmails(pasteText);
    if (!emails.length) return;

    let updatedRows = [...rows];
    let totalCap = updatedRows.reduce((s, r) => s + r.emailLimit, 0);
    while (emails.length > totalCap) {
      const newRow = makeRow();
      updatedRows.push(newRow);
      totalCap += newRow.emailLimit;
    }

    let idx = 0;
    updatedRows = updatedRows.map((row) => {
      if (idx >= emails.length) return row;
      const chunk = emails.slice(idx, idx + row.emailLimit);
      idx += row.emailLimit;
      return { ...row, emails: chunk };
    });

    setRows(updatedRows);
    setPasteText("");
    setPasteModal(false);
    toast("success", "✅", `${emails.length} emails distributed`);
  };

  const confirmRowEmails = () => {
    if (rowEmailModal === null) return;
    const emails = parseEmails(rowEmailText);
    updateRow(rowEmailModal, {
      emails: [
        ...(rows.find((r) => r.id === rowEmailModal)?.emails || []),
        ...emails,
      ],
    });
    setRowEmailModal(null);
    setRowEmailText("");
  };

  // ── Paste Attachments: file[i] → row[i] ──
  const handlePasteAttachments = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    setRows((prevRows) => {
      let updatedRows = [...prevRows];
      while (files.length > updatedRows.length) {
        updatedRows.push(makeRow());
      }
      updatedRows = updatedRows.map((row, i) => {
        if (i < files.length) {
          return { ...row, files: [...row.files, files[i]] };
        }
        return row;
      });
      return updatedRows;
    });

    toast("success", "📎", `${files.length} file(s) assigned to rows`);
  };

  // ── Send ──
  const sendAll = async () => {
    if (!subject.trim()) { toast("error", "✕", "Subject is required"); return; }
    if (!body.trim()) { toast("error", "✕", "Body is required"); return; }

    const activeRows = rows.filter((r) => r.emails.length);
    if (!activeRows.length) { toast("error", "✕", "No recipients added"); return; }

    const globalCcList = parseEmails(globalCc);

    const boxes = activeRows.map((r) => ({
      to: r.emails[0],
      cc: r.emails.slice(1),
      globalCc: globalCcList,
      rowIndex: rows.indexOf(r),
    }));

    const form = new FormData();
    form.append("boxes", JSON.stringify(boxes));
    form.append("subject", subject);
    form.append("body", body);

    // Per-row files keyed as files_<rowIndex>
    for (const row of activeRows) {
      const idx = rows.indexOf(row);
      for (const f of row.files) {
        form.append(`files_${idx}`, f);
      }
    }

    setSending(true);
    try {
      const res = await fetch("/api/send", { method: "POST", body: form });
      const data = await res.json();

      if (res.ok) {
        toast("success", "✅", `Sent to ${data.sent} recipient(s)!`);
      } else if (res.status === 207) {
        const fails = data.errors.map((e: { to: string }) => e.to).join(", ");
        toast("warning", "⚠", `${data.sent} sent. Failed: ${fails}`);
      } else {
        toast("error", "✕", data.error || "Unknown error");
      }
    } catch {
      toast("error", "✕", "Network error — check your connection");
    } finally {
      setSending(false);
    }
  };

  const totalEmails = rows.reduce((s, r) => s + r.emails.length, 0);
  const totalFiles = rows.reduce((s, r) => s + r.files.length, 0);

  // ── Render ──────────────────────────────────────────────────────
  return (
    <main className={styles.main}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.logo}>MAIL DIST</span>
          <span className={styles.logoSub}>— BULK EMAIL SYSTEM</span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.badge}>Next.js · Full-Stack</span>
        </div>
      </header>

      <div className={styles.grid}>
        {/* LEFT COLUMN */}
        <div className={styles.leftCol}>

          {/* Compose */}
          <section className={styles.card}>
            <div className={styles.cardLabel}>01 — COMPOSE</div>
            <div className={styles.field}>
              <label className={styles.label}>Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject..."
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Body</label>
              <textarea
                rows={7}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message..."
              />
            </div>
          </section>

          {/* Global CC — replaces Global Attachments */}
          <section className={styles.card}>
            <div className={styles.cardLabel}>02 — CARBON COPY (ALL MAILS)</div>
            <div className={styles.field}>
              <label className={styles.label}>CC Emails</label>
              <textarea
                rows={4}
                value={globalCc}
                onChange={(e) => setGlobalCc(e.target.value)}
                placeholder={"manager@example.com\nboss@example.com\nor comma separated..."}
              />
              <p className={styles.fieldHint}>
                These addresses will be CC'd on <strong>every</strong> outgoing email.
              </p>
            </div>
            {globalCc.trim() && (
              <div className={styles.fileChips}>
                {parseEmails(globalCc).map((em, i) => (
                  <div key={i} className={styles.chip}>
                    <span>📧 {em}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Send bar */}
          <div className={styles.sendBar}>
            <div className={styles.sendStats}>
              <strong>{totalEmails}</strong> recipients · <strong>{rows.length}</strong> rows · <strong>{totalFiles}</strong> files
            </div>
            <button
              className={`${styles.btn} ${styles.btnSend}`}
              onClick={sendAll}
              disabled={sending}
            >
              {sending ? <span className={styles.spinner} /> : "⚡ SEND ALL"}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className={styles.rightCol}>
          <div className={styles.rowsHeader}>
            <div className={styles.cardLabel} style={{ marginBottom: 0 }}>03 — DISTRIBUTION ROWS</div>
            <div className={styles.rowActions}>
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={addRow}>+ ROW</button>
              <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setPasteModal(true)}>PASTE EMAILS</button>
              {/* Paste Attachments */}
              <button
                className={`${styles.btn} ${styles.btnOutline}`}
                onClick={() => pasteAttachInputRef.current?.click()}
              >
                PASTE ATTACHMENTS
              </button>
              <input
                ref={pasteAttachInputRef}
                type="file"
                multiple
                accept=".doc,.docx,.xls,.xlsx,.pdf,.csv,.txt"
                style={{ display: "none" }}
                onChange={(e) => {
                  handlePasteAttachments(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          {rows.map((row, i) => (
            <div key={row.id} className={styles.rowCard}>
              {/* Row header */}
              <div className={styles.rowHead} onClick={() => toggleRow(row.id)}>
                <div className={styles.rowNum}>{String(i + 1).padStart(2, "0")}</div>
                <div className={styles.rowMeta}>
                  <span className={styles.rowMetaMain}>
                    {row.emails.length ? row.emails[0] : <em>No TO address</em>}
                  </span>
                  {row.emails.length > 1 && (
                    <span className={styles.rowMetaSub}>+{row.emails.length - 1} CC</span>
                  )}
                </div>
                {row.files.length > 0 && (
                  <span className={styles.attachBadge}>📎 {row.files.length}</span>
                )}
                <div className={`${styles.rowStatus} ${row.emails.length ? styles.ready : styles.empty}`}>
                  {row.emails.length ? "READY" : "EMPTY"}
                </div>
                <button
                  className={styles.rowDelete}
                  onClick={(e) => { e.stopPropagation(); removeRow(row.id); }}
                >✕</button>
                <span className={`${styles.chevron} ${row.open ? styles.chevronOpen : ""}`}>▾</span>
              </div>

              {/* Row body */}
              {row.open && (
                <div className={styles.rowBody}>
                  {/* Emails */}
                  <div className={styles.subCard}>
                    <div className={styles.subLabel}>
                      Recipients
                      <button
                        className={styles.miniBtn}
                        onClick={() => { setRowEmailModal(row.id); setRowEmailText(""); }}
                      >+ Add</button>
                    </div>
                    <div className={styles.limitRow}>
                      <span>Limit</span>
                      <input
                        type="number"
                        min={1}
                        value={row.emailLimit}
                        style={{ width: 55 }}
                        onChange={(e) => updateRow(row.id, { emailLimit: +e.target.value })}
                      />
                    </div>
                    {row.emails.length ? (
                      <ul className={styles.emailList}>
                        {row.emails.map((em, ei) => (
                          <li key={ei}>
                            <span className={ei === 0 ? styles.tagTo : styles.tagCc}>
                              {ei === 0 ? "TO" : "CC"}
                            </span>
                            <span className={styles.emailText}>{em}</span>
                            <span
                              className={styles.rmBtn}
                              onClick={() => updateRow(row.id, { emails: row.emails.filter((_, j) => j !== ei) })}
                            >×</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.emptyHint}>No emails added</p>
                    )}
                  </div>

                  {/* Files */}
                  <div className={styles.subCard}>
                    <div className={styles.subLabel}>
                      Attachments
                      <label className={styles.miniBtn} style={{ cursor: "pointer" }}>
                        + Add
                        <input
                          type="file"
                          multiple
                          style={{ display: "none" }}
                          onChange={(e) => {
                            updateRow(row.id, { files: [...row.files, ...e.target.files!] });
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    <div className={styles.limitRow}>
                      <span>Limit</span>
                      <input
                        type="number"
                        min={1}
                        value={row.fileLimit}
                        style={{ width: 55 }}
                        onChange={(e) => updateRow(row.id, { fileLimit: +e.target.value })}
                      />
                    </div>
                    {row.files.length ? (
                      <ul className={styles.fileList}>
                        {row.files.map((f, fi) => (
                          <li key={fi}>
                            📄 {f.name}
                            <span
                              className={styles.rmBtn}
                              onClick={() => updateRow(row.id, { files: row.files.filter((_, j) => j !== fi) })}
                            >×</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.emptyHint}>No attachments</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {rows.length === 0 && (
            <div className={styles.emptyRows}>
              No rows yet — click <strong>+ ROW</strong> to add one
            </div>
          )}
        </div>
      </div>

      {/* Paste modal */}
      {pasteModal && (
        <Modal
          title="PASTE EMAIL LIST"
          subtitle="Separate by comma or new line · First per row = TO, rest = CC"
          onClose={() => setPasteModal(false)}
          onConfirm={distributeEmails}
        >
          <textarea
            rows={7}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"alice@example.com\nbob@example.com\ncarol@example.com"}
            style={{ marginTop: 12 }}
          />
        </Modal>
      )}

      {/* Row email modal */}
      {rowEmailModal !== null && (
        <Modal
          title={`ADD EMAILS — ROW ${rows.findIndex((r) => r.id === rowEmailModal) + 1}`}
          subtitle="First email = TO · rest = CC · separate by comma or new line"
          onClose={() => setRowEmailModal(null)}
          onConfirm={confirmRowEmails}
        >
          <textarea
            rows={5}
            value={rowEmailText}
            onChange={(e) => setRowEmailText(e.target.value)}
            placeholder={"to@example.com\ncc1@example.com"}
            style={{ marginTop: 12 }}
          />
        </Modal>
      )}

      {/* Toasts */}
      <div className={styles.toastWrap}>
        {toasts.map((t) => (
          <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
            <span>{t.icon}</span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
