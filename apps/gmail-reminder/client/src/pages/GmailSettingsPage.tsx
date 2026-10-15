import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export default function GmailSettingsPage() {
  const [email, setEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  const { data: settings } = trpc.gmailSettings.get.useQuery();
  const updateMutation = trpc.gmailSettings.update.useMutation();
  const testMutation = trpc.gmailSettings.testConnection.useMutation();

  useEffect(() => {
    if (settings?.email) {
      setEmail(settings.email);
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    if (!appPassword.trim()) {
      toast.error("App Password is required");
      return;
    }

    setIsSubmitting(true);

    try {
      await updateMutation.mutateAsync({
        email,
        appPassword,
      });
      toast.success("Gmail settings saved successfully");
      setAppPassword("");
      setTestSuccess(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save settings";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestConnection = async () => {
    if (!email.trim() || !appPassword.trim()) {
      toast.error("Please fill in both email and app password");
      return;
    }

    setIsTesting(true);

    try {
      const result = await testMutation.mutateAsync({
        email,
        appPassword,
      });

      if (result.success) {
        toast.success("Connection successful!");
        setTestSuccess(true);
      } else {
        toast.error(`Connection failed: ${result.error}`);
        setTestSuccess(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Test failed";
      toast.error(message);
      setTestSuccess(false);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => (window.location.href = "/dashboard")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <Card className="shadow-lg border-0 bg-white">
          <div className="p-8">
            <h1 className="text-3xl font-semibold text-slate-900 mb-2">Gmail Settings</h1>
            <p className="text-slate-600 mb-8">
              Configure your Gmail account to send reminders. Use a Google App Password, not your regular password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-slate-700 mb-2 block">
                  Gmail Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-slate-500 mt-2">
                  This is the email address that will be used to send reminders.
                </p>
              </div>

              <div>
                <Label
                  htmlFor="appPassword"
                  className="text-sm font-medium text-slate-700 mb-2 block"
                >
                  Google App Password
                </Label>
                <div className="relative">
                  <Input
                    id="appPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="16-character app password"
                    value={appPassword}
                    onChange={(e) => setAppPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Generate an app password in your Google Account settings under Security.
                </p>
              </div>

              {testSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-700">Connection test successful!</span>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || !email || !appPassword}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Settings"
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-4">How to get your App Password</h3>
              <ol className="space-y-3 text-sm text-slate-600">
                <li className="flex gap-3">
                  <span className="font-medium text-slate-900 min-w-fit">1.</span>
                  <span>Go to your Google Account settings</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-medium text-slate-900 min-w-fit">2.</span>
                  <span>Click "Security" in the left menu</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-medium text-slate-900 min-w-fit">3.</span>
                  <span>Enable 2-Step Verification if not already enabled</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-medium text-slate-900 min-w-fit">4.</span>
                  <span>Scroll down to "App passwords" and select Mail and Windows PC</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-medium text-slate-900 min-w-fit">5.</span>
                  <span>Google will generate a 16-character password</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-medium text-slate-900 min-w-fit">6.</span>
                  <span>Copy and paste it here</span>
                </li>
              </ol>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
