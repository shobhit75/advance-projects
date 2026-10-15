import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Plus, X, RefreshCw, Paperclip, File } from "lucide-react";

type Recurrence = "none" | "daily" | "weekly" | "monthly" | "yearly";
type Attachment = { filename: string; content: string; encoding: string; size: number };

export default function ReminderCompose() {
  const handleNavigate = (path: string) => { window.location.href = path; };
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [recipients, setRecipients] = useState<string[]>([""]);
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [recurrenceEndsAt, setRecurrenceEndsAt] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createMutation = trpc.reminders.create.useMutation();
  const utils = trpc.useUtils();

  const addRecipient = () => setRecipients([...recipients, ""]);
  const removeRecipient = (i: number) => { if (recipients.length > 1) setRecipients(recipients.filter((_, idx) => idx !== i)); };
  const updateRecipient = (i: number, v: string) => { const u = [...recipients]; u[i] = v; setRecipients(u); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const MAX_SIZE = 5 * 1024 * 1024;
    const MAX_TOTAL = 20 * 1024 * 1024;
    const currentTotal = attachments.reduce((sum, a) => sum + a.size, 0);
    files.forEach(file => {
      if (file.size > MAX_SIZE) { toast.error(`${file.name} is too large (max 5MB)`); return; }
      if (currentTotal + file.size > MAX_TOTAL) { toast.error("Total attachments exceed 20MB"); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        setAttachments(prev => [...prev, { filename: file.name, content: base64, encoding: "base64", size: file.size }]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (i: number) => setAttachments(attachments.filter((_, idx) => idx !== i));

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return toast.error("Subject is required");
    if (!body.trim()) return toast.error("Body is required");
    if (!scheduledAt) return toast.error("Scheduled date and time are required");
    const validRecipients = recipients.map(r => r.trim()).filter(Boolean);
    if (validRecipients.length === 0) return toast.error("At least one recipient is required");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalid = validRecipients.find(r => !emailRegex.test(r));
    if (invalid) return toast.error(`Invalid email: ${invalid}`);
    setIsSubmitting(true);
    try {
      await createMutation.mutateAsync({
        subject,
        body,
        scheduledAt: new Date(scheduledAt),
        recipients: validRecipients,
        recurrence,
        recurrenceEndsAt: recurrenceEndsAt ? new Date(recurrenceEndsAt) : undefined,
        attachments: attachments.map(({ filename, content, encoding }) => ({ filename, content, encoding })),
      });
      toast.success("Reminder created successfully");
      await utils.reminders.list.invalidate();
      handleNavigate("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save reminder");
    } finally {
      setIsSubmitting(false);
    }
  };

  const recurrenceOptions: { value: Recurrence; label: string; desc: string }[] = [
    { value: "none", label: "Once", desc: "One-time" },
    { value: "daily", label: "Daily", desc: "Every day" },
    { value: "weekly", label: "Weekly", desc: "Every week" },
    { value: "monthly", label: "Monthly", desc: "Every month" },
    { value: "yearly", label: "Yearly", desc: "Every year" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => handleNavigate("/dashboard")} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <Card className="shadow-lg border-0 bg-white">
          <div className="p-8">
            <h1 className="text-3xl font-semibold text-slate-900 mb-8">Compose Reminder</h1>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Recipients */}
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Recipients</Label>
                <div className="space-y-2">
                  {recipients.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input type="email" placeholder={`Recipient ${i + 1} email`} value={r}
                        onChange={e => updateRecipient(i, e.target.value)} className="flex-1 border-slate-200 rounded-lg" />
                      {recipients.length > 1 && (
                        <button type="button" onClick={() => removeRecipient(i)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addRecipient}
                  className="mt-2 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
                  <Plus className="w-4 h-4" /> Add another recipient
                </button>
              </div>

              {/* Subject */}
              <div>
                <Label htmlFor="subject" className="text-sm font-medium text-slate-700 mb-2 block">Subject</Label>
                <Input id="subject" type="text" placeholder="Enter reminder subject" value={subject}
                  onChange={e => setSubject(e.target.value)} className="border-slate-200 rounded-lg" />
              </div>

              {/* Body */}
              <div>
                <Label htmlFor="body" className="text-sm font-medium text-slate-700 mb-2 block">Message</Label>
                <Textarea id="body" placeholder="Enter your reminder message..." value={body}
                  onChange={e => setBody(e.target.value)} rows={6} className="border-slate-200 rounded-lg resize-none" />
              </div>

              {/* Attachments */}
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                  Attachments <span className="text-xs text-slate-400 font-normal">(max 5MB per file, 20MB total)</span>
                </Label>
                {attachments.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {attachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <File className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-sm text-slate-700 flex-1 truncate">{att.filename}</span>
                        <span className="text-xs text-slate-400">{formatSize(att.size)}</span>
                        <button type="button" onClick={() => removeAttachment(i)}
                          className="text-slate-400 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors w-full justify-center">
                  <Paperclip className="w-4 h-4" /> Click to attach files
                </button>
              </div>

              {/* Schedule */}
              <div>
                <Label htmlFor="scheduledAt" className="text-sm font-medium text-slate-700 mb-2 block">First Send Date & Time</Label>
                <Input id="scheduledAt" type="datetime-local" value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)} className="border-slate-200 rounded-lg" />
              </div>

              {/* Recurrence */}
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-3 block flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Repeat
                </Label>
                <div className="grid grid-cols-5 gap-2">
                  {recurrenceOptions.map(opt => (
                    <button key={opt.value} type="button" onClick={() => setRecurrence(opt.value)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        recurrence === opt.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 hover:border-slate-300 text-slate-600"
                      }`}>
                      <div className="font-semibold text-sm">{opt.label}</div>
                      <div className="text-xs opacity-70 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* End date for recurring */}
              {recurrence !== "none" && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <Label htmlFor="recurrenceEndsAt" className="text-sm font-medium text-blue-800 mb-2 block">
                    Stop repeating on (leave blank to repeat forever)
                  </Label>
                  <Input id="recurrenceEndsAt" type="date" value={recurrenceEndsAt}
                    onChange={e => setRecurrenceEndsAt(e.target.value)}
                    className="border-blue-200 rounded-lg bg-white" />
                  <p className="text-xs text-blue-600 mt-2">
                    {recurrenceEndsAt
                      ? `Will repeat ${recurrence} until ${new Date(recurrenceEndsAt).toLocaleDateString()}`
                      : `Will repeat ${recurrence} forever until manually canceled`}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Create Reminder"}
                </Button>
                <Button type="button" onClick={() => handleNavigate("/dashboard")}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium py-3 rounded-lg">
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}