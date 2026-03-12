"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  User,
  Briefcase,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  IndianRupee,
  ShieldCheck,
  Building2,
  Phone,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  saveOnboardingStep1,
  saveOnboardingStep2,
  completeOnboardingStep3,
} from "@/actions/onboarding/onboarding";
import type { Profile } from "@/lib/schema/profile.schema";

/* ── Step indicator dots ──────────────────────────────────────────────── */

const STEPS = [
  { label: "Personal Info", icon: User },
  { label: "Preferences", icon: Briefcase },
  { label: "Review", icon: CheckCircle2 },
] as const;

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = i < current;
        const active = i === current;
        return (
          <div key={step.label} className="flex items-center gap-3">
            {i > 0 && (
              <div
                className={`hidden sm:block w-12 h-0.5 rounded-full transition-colors ${
                  done ? "bg-blue-600" : "bg-gray-200"
                }`}
              />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  done
                    ? "bg-blue-600 text-white"
                    : active
                    ? "bg-blue-100 text-blue-700 ring-2 ring-blue-600"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {done ? <CheckCircle2 size={18} /> : <Icon size={18} />}
              </div>
              <span
                className={`text-xs font-medium ${
                  active ? "text-blue-700" : done ? "text-blue-600" : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main onboarding wizard ───────────────────────────────────────────── */

export function OnboardingWizard({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [step, setStep] = useState(profile.onboarding_step ?? 0);
  const [loading, setLoading] = useState(false);

  // Form state
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [organization, setOrganization] = useState(profile.organization ?? "");
  const [budget, setBudget] = useState(
    profile.investment_budget?.toString() ?? ""
  );
  const [riskTolerance, setRiskTolerance] = useState(
    profile.risk_tolerance ?? "medium"
  );

  /* ── Step 1 submit ──────────────────────────────────────────────────── */
  async function handleStep1() {
    setLoading(true);
    const fd = new FormData();
    fd.set("full_name", fullName);
    fd.set("phone", phone);
    fd.set("organization", organization);

    const result = await saveOnboardingStep1(fd);
    setLoading(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setStep(1);
  }

  /* ── Step 2 submit ──────────────────────────────────────────────────── */
  async function handleStep2() {
    setLoading(true);
    const fd = new FormData();
    fd.set("investment_budget", budget);
    fd.set("risk_tolerance", riskTolerance);

    const result = await saveOnboardingStep2(fd);
    setLoading(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setStep(2);
  }

  /* ── Step 3 submit (complete) ───────────────────────────────────────── */
  async function handleComplete() {
    setLoading(true);
    const result = await completeOnboardingStep3();
    setLoading(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Welcome aboard! Your profile is all set.");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome to Estator
          </h1>
          <p className="text-gray-500 mt-1">
            Let&apos;s set up your profile in a few quick steps
          </p>
        </div>

        <StepIndicator current={step} />

        {/* ── Step 1: Personal Info ─────────────────────────────────────── */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <User size={20} className="text-blue-600" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Tell us a bit about yourself
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="full_name"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="flex items-center gap-1.5">
                  <Phone size={14} className="text-gray-400" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="organization" className="flex items-center gap-1.5">
                  <Building2 size={14} className="text-gray-400" />
                  Organization
                </Label>
                <Input
                  id="organization"
                  placeholder="Company / Firm (optional)"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                />
              </div>

              <Button
                className="w-full mt-2"
                onClick={handleStep1}
                disabled={loading || !fullName.trim()}
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin mr-2" />
                ) : (
                  <ArrowRight size={16} className="mr-2" />
                )}
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: User Type & Preferences ──────────────────────────── */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Briefcase size={20} className="text-blue-600" />
                Your Preferences
              </CardTitle>
              <CardDescription>
                Help us personalize your experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Investment Budget */}
              <div className="space-y-1.5">
                <Label htmlFor="investment_budget" className="flex items-center gap-1.5">
                  <IndianRupee size={14} className="text-gray-400" />
                  Investment Budget (₹)
                </Label>
                <Input
                  id="investment_budget"
                  type="number"
                  placeholder="e.g. 5000000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  min={1}
                />
              </div>

              {/* Risk Tolerance */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-gray-400" />
                  Risk Tolerance
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { value: "low", label: "Low", color: "green" },
                      { value: "medium", label: "Medium", color: "amber" },
                      { value: "high", label: "High", color: "red" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRiskTolerance(opt.value)}
                      className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        riskTolerance === opt.value
                          ? opt.color === "green"
                            ? "border-green-600 bg-green-50 text-green-700 ring-1 ring-green-600"
                            : opt.color === "amber"
                            ? "border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-500"
                            : "border-red-500 bg-red-50 text-red-700 ring-1 ring-red-500"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(0)}
                  disabled={loading}
                >
                  <ArrowLeft size={16} className="mr-2" />
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleStep2}
                  disabled={loading || !budget}
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : (
                    <ArrowRight size={16} className="mr-2" />
                  )}
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: Review ───────────────────────────────────────────── */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <CheckCircle2 size={20} className="text-blue-600" />
                Review Your Profile
              </CardTitle>
              <CardDescription>
                Make sure everything looks good
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Summary card */}
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 space-y-4">
                <ReviewRow label="Full Name" value={fullName || "—"} />
                <ReviewRow label="Phone" value={phone || "Not added"} />
                <ReviewRow label="Organization" value={organization || "Not added"} />
                <div className="border-t border-gray-200 pt-3" />
                <ReviewRow
                  label="Investment Budget"
                  value={
                    budget
                      ? `₹${Number(budget).toLocaleString("en-IN")}`
                      : "—"
                  }
                />
                <ReviewRow
                  label="Risk Tolerance"
                  value={
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${
                        riskTolerance === "low"
                          ? "bg-green-100 text-green-700"
                          : riskTolerance === "medium"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {riskTolerance}
                    </span>
                  }
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  <ArrowLeft size={16} className="mr-2" />
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleComplete}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 size={16} className="mr-2" />
                  )}
                  Complete Setup
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ── Tiny review row helper ───────────────────────────────────────────── */

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}
