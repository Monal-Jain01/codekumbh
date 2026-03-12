import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { User, Mail, Phone, MapPin, Calendar, Shield, Edit3 } from "lucide-react";

export default async function ProfilePage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    const joinedDate = new Date(user.created_at).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const initials = (user.email ?? "U")
        .split("@")[0]
        .slice(0, 2)
        .toUpperCase();

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Profile Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Cover */}
                    <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600" />

                    {/* Avatar + Header */}
                    <div className="px-6 pb-6">
                        <div className="flex items-end justify-between -mt-12 mb-4">
                            {/* Avatar */}
                            <div className="w-24 h-24 rounded-full bg-blue-100 border-4 border-white shadow flex items-center justify-center">
                                <span className="text-3xl font-bold text-blue-600">
                                    {initials}
                                </span>
                            </div>

                            {/* Edit + Logout */}
                            <div className="flex gap-2 mt-14">
                                <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors bg-white">
                                    <Edit3 size={14} />
                                    Edit Profile
                                </button>
                                <LogoutButton />
                            </div>
                        </div>

                        {/* Name / Email */}
                        <h1 className="text-2xl font-bold text-gray-900">
                            {user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User"}
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Account Details */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                            Account Details
                        </h2>

                        <InfoRow
                            icon={<Mail size={16} className="text-blue-500" />}
                            label="Email"
                            value={user.email ?? "—"}
                        />
                        <InfoRow
                            icon={<Phone size={16} className="text-blue-500" />}
                            label="Phone"
                            value={user.user_metadata?.phone ?? "Not added"}
                        />
                        <InfoRow
                            icon={<MapPin size={16} className="text-blue-500" />}
                            label="Location"
                            value={user.user_metadata?.location ?? "Not added"}
                        />
                        <InfoRow
                            icon={<Calendar size={16} className="text-blue-500" />}
                            label="Joined"
                            value={joinedDate}
                        />
                    </div>

                    {/* Security */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                            Security
                        </h2>

                        <InfoRow
                            icon={<Shield size={16} className="text-green-500" />}
                            label="Email verified"
                            value={user.email_confirmed_at ? "Verified ✓" : "Not verified"}
                            valueClass={user.email_confirmed_at ? "text-green-600 font-semibold" : "text-red-500"}
                        />
                        <InfoRow
                            icon={<User size={16} className="text-blue-500" />}
                            label="User ID"
                            value={user.id.slice(0, 16) + "..."}
                            mono
                        />
                        <InfoRow
                            icon={<Shield size={16} className="text-blue-500" />}
                            label="Provider"
                            value={user.app_metadata?.provider ?? "email"}
                        />

                        {/* Change Password button */}
                        <button className="w-full mt-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl border-0 cursor-pointer transition-colors">
                            Change Password
                        </button>
                    </div>
                </div>

                {/* Preferences placeholder */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
                        Preferences
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {["Buy", "Rent", "2 BHK", "3 BHK", "Bangalore", "Mumbai"].map(
                            (tag) => (
                                <span
                                    key={tag}
                                    className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full"
                                >
                                    {tag}
                                </span>
                            )
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

/* ── Helper row component ── */
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
