import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Mail, Phone, Building2, Calendar, Shield, User, FileText } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { EditProfileForm } from "@/components/profile/edit-profile-form";
import { AvatarUploadForm } from "@/components/profile/avatar-upload-form";
import Link from "next/link";
import type { Profile } from "@/lib/schema/profile.schema";

interface Props {
  params: Promise<{ profileId: string }>;
}

export default async function ProfilePage({ params }: Props) {
  const { profileId } = await params;
  const supabase = await createClient();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Fetch profile row ─────────────────────────────────────────────────────
  let { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  // If the profile doesn't exist and the authenticated user is visiting their
  // own page, auto-create the row so first-time users aren't stuck on a 404.
  if ((error || !profile) && user?.id === profileId) {
    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: user.user_metadata?.full_name ?? null,
        phone: user.user_metadata?.phone ?? null,
        organization: null,
        onboarding_completed: false,
        onboarding_step: 0,
      })
      .select("*")
      .single();

    if (insertError || !newProfile) notFound();
    profile = newProfile;
    error = null;
  }

  if (error || !profile) notFound();

  const typedProfile = profile as Profile;
  const isOwner = user?.id === profileId;

  // If owner hasn't completed onboarding, redirect to onboarding flow
  if (isOwner && !typedProfile.onboarding_completed) {
    redirect("/onboarding");
  }

  // ── Derived display values ────────────────────────────────────────────────
  const displayName =
    typedProfile.full_name ??
    user?.email?.split("@")[0] ??
    "User";

  const initials = displayName.slice(0, 2).toUpperCase();

  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Profile Card ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Cover */}
          <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600" />

          {/* Avatar + Header */}
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-12 mb-4">
              {/* Avatar — owner gets upload controls, guests see static */}
              {isOwner ? (
                <AvatarUploadForm
                  avatarUrl={typedProfile.avatar_url}
                  initials={initials}
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-100 border-4 border-white shadow flex items-center justify-center overflow-hidden">
                  {typedProfile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={typedProfile.avatar_url}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-blue-600">
                      {initials}
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-14">
                {isOwner && <EditProfileForm profile={typedProfile} />}
                {isOwner && <LogoutButton />}
              </div>
            </div>

            {/* Name / sub-info */}
            <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
            {typedProfile.organization && (
              <p className="text-sm text-gray-500 mt-0.5">
                {typedProfile.organization}
              </p>
            )}
            {isOwner && (
              <p className="text-sm text-gray-400 mt-0.5">{user?.email}</p>
            )}
            {typedProfile.bio && (
              <p className="text-sm text-gray-600 mt-3 leading-relaxed">
                {typedProfile.bio}
              </p>
            )}
          </div>
        </div>

        {/* ── Info Grid ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Account Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
              Account Details
            </h2>

            {isOwner && (
              <InfoRow
                icon={<Mail size={16} className="text-blue-500" />}
                label="Email"
                value={user?.email ?? "—"}
              />
            )}
            <InfoRow
              icon={<Phone size={16} className="text-blue-500" />}
              label="Phone"
              value={typedProfile.phone ?? "Not added"}
            />
            <InfoRow
              icon={<Building2 size={16} className="text-blue-500" />}
              label="Organization"
              value={typedProfile.organization ?? "Not added"}
            />
            {isOwner && (
              <InfoRow
                icon={<Calendar size={16} className="text-blue-500" />}
                label="Joined"
                value={joinedDate}
              />
            )}
            {typedProfile.bio && (
              <InfoRow
                icon={<FileText size={16} className="text-blue-500" />}
                label="Bio"
                value={typedProfile.bio}
              />
            )}
          </div>

          {/* Security — owner only */}
          {isOwner ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                Security
              </h2>

              <InfoRow
                icon={<Shield size={16} className="text-green-500" />}
                label="Email verified"
                value={user?.email_confirmed_at ? "Verified ✓" : "Not verified"}
                valueClass={
                  user?.email_confirmed_at
                    ? "text-green-600 font-semibold"
                    : "text-red-500"
                }
              />
              <InfoRow
                icon={<User size={16} className="text-blue-500" />}
                label="User ID"
                value={user!.id.slice(0, 16) + "…"}
                mono
              />
              <InfoRow
                icon={<Shield size={16} className="text-blue-500" />}
                label="Provider"
                value={user?.app_metadata?.provider ?? "email"}
              />

              <Link
                href="/auth/update-password"
                className="block w-full mt-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl text-center transition-colors"
              >
                Change Password
              </Link>
            </div>
          ) : (
            /* Public profile: show a simple "contact" card */
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                About
              </h2>
              <InfoRow
                icon={<User size={16} className="text-blue-500" />}
                label="Member since"
                value={
                  typedProfile.created_at
                    ? new Date(typedProfile.created_at).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "long",
                      })
                    : "—"
                }
              />
              {typedProfile.organization && (
                <InfoRow
                  icon={<Building2 size={16} className="text-blue-500" />}
                  label="Organization"
                  value={typedProfile.organization}
                />
              )}
            </div>
          )}
        </div>

        {/* ── Onboarding nudge ─────────────────────────────────────────────── */}
        {isOwner && !typedProfile.onboarding_completed && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800 space-y-1">
            <p className="font-semibold">Finish setting up your profile</p>
            <p className="text-amber-700">
              Add your details to complete your Estator profile.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

/* ── Helper row component ─────────────────────────────────────────────────── */
function InfoRow({
  icon,
  label,
  value,
  valueClass = "text-gray-800",
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className={`text-sm truncate ${valueClass} ${mono ? "font-mono" : ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
