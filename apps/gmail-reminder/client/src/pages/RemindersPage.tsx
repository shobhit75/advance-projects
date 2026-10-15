import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Settings,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function RemindersPage() {
  const [statusFilter, setStatusFilter] = useState<"all" | "scheduled" | "sent" | "failed">("all");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: reminders, isLoading, refetch } = trpc.reminders.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const deleteMutation = trpc.reminders.delete.useMutation();
  const retryMutation = trpc.reminders.retry.useMutation();
  const utils = trpc.useUtils();

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Reminder deleted");
      await utils.reminders.list.invalidate();
      setDeleteConfirm(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete";
      toast.error(message);
    }
  };

  const handleRetry = async (id: number) => {
    try {
      await retryMutation.mutateAsync({ id });
      toast.success("Retry sent successfully");
      await utils.reminders.list.invalidate();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to retry";
      toast.error(message);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Clock className="w-4 h-4 text-blue-600" />;
      case "sent":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>;
      case "sent":
        return <Badge className="bg-green-100 text-green-800">Sent</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Reminders</h1>
            <p className="text-slate-600 mt-1">Manage your scheduled email reminders</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => (window.location.href = "/settings")}
              className="bg-slate-600 hover:bg-slate-700 text-white"
            >
              <Settings className="w-4 h-4 mr-2" />
              Gmail Settings
            </Button>
            <Button
              onClick={() => (window.location.href = "/compose")}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Reminder
            </Button>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {(["all", "scheduled", "sent", "failed"] as const).map((status) => (
            <Button
              key={status}
              onClick={() => setStatusFilter(status)}
              variant={statusFilter === status ? "default" : "outline"}
              className={
                statusFilter === status
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-900 border-slate-200"
              }
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : !reminders || reminders.length === 0 ? (
          <Card className="p-12 text-center border-0 shadow-lg">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No reminders yet</h3>
            <p className="text-slate-600 mb-6">
              {statusFilter === "all"
                ? "Create your first reminder to get started"
                : `No ${statusFilter} reminders at this time`}
            </p>
            {statusFilter === "all" && (
              <Button
                onClick={() => (window.location.href = "/compose")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Create First Reminder
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {reminders.map((reminder) => (
              <Card
                key={reminder.id}
                className="p-6 border-0 shadow-md hover:shadow-lg transition-shadow bg-white"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(reminder.status)}
                      <h3 className="text-lg font-semibold text-slate-900">{reminder.subject}</h3>
                      {getStatusBadge(reminder.status)}
                    </div>
                    <p className="text-slate-600 text-sm mb-3 line-clamp-2">{reminder.body}</p>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span>Scheduled: {formatDate(reminder.scheduledAt)}</span>
                      {reminder.sentAt && <span>Sent: {formatDate(reminder.sentAt)}</span>}
                      {reminder.retryCount > 0 && <span>Retries: {reminder.retryCount}</span>}
                    </div>
                    {reminder.errorMessage && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700">
                          <strong>Error:</strong> {reminder.errorMessage}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {reminder.status === "scheduled" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => (window.location.href = `/compose?edit=${reminder.id}`)}
                        className="text-slate-600 hover:text-slate-900"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                    {reminder.status === "failed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRetry(reminder.id)}
                        disabled={retryMutation.isPending}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                    {reminder.status === "scheduled" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteConfirm(reminder.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Reminder?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The reminder will be permanently deleted.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
