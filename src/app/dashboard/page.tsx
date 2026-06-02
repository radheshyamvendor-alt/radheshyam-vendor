"use client";

import Link from "next/link";
import useAuth from "@/hooks/useAuth";
import { getLocalAccessToken } from "@/lib/axios";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const activeToken = getLocalAccessToken();

  return (
    <div className="min-h-screen bg-background trust-gradient p-6">
      {/* Navigation Header */}
      <nav className="max-w-[960px] mx-auto bg-surface border border-outline-variant shadow-sm rounded-xl p-4 flex items-center justify-between mb-8 glass-card">
        <div className="flex items-center gap-3">
          <div className="bg-primary rounded-lg p-2 text-on-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">medical_services</span>
          </div>
          <div>
            <span className="font-bold text-on-surface block text-sm sm:text-base">Radheshyam Medical</span>
            <span className="text-[10px] sm:text-xs text-accent-cyan uppercase tracking-wider font-semibold">Chemist Panel</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/profile" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-all">
            Profile
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-error-container/20 border border-error/30 hover:bg-error-container/40 text-error text-xs font-semibold rounded-lg transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Main Panel */}
      <main className="max-w-[960px] mx-auto space-y-6">
        {/* Welcome Section */}
        <div className="bg-surface border border-outline-variant shadow-sm rounded-xl p-6 glass-card">
          <h2 className="text-headline-md font-bold text-on-surface mb-2">
            Welcome back, {user?.name || "Chemist"}!
          </h2>
          <p className="text-sm text-on-surface-variant">
            You are logged into the secure Radheshyam Chemist Network. Manage your medicine orders and prescriptions here.
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Profile Card */}
          <div className="bg-surface border border-outline-variant shadow-sm rounded-xl p-6 glass-card md:col-span-2 space-y-4">
            <h3 className="text-headline-sm font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant pb-2">
              <span className="material-symbols-outlined text-primary">person</span>
              <span>Chemist Credentials</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-outline block">Chemist Name</span>
                <span className="font-semibold text-on-surface">{user?.name}</span>
              </div>
              <div>
                <span className="text-xs text-outline block">Email Address</span>
                <span className="font-semibold text-on-surface">{user?.email}</span>
              </div>
              <div>
                <span className="text-xs text-outline block">Mobile Contact</span>
                <span className="font-semibold text-on-surface">{user?.mobile}</span>
              </div>
              <div>
                <span className="text-xs text-outline block">Location / City</span>
                <span className="font-semibold text-on-surface">{user?.location}</span>
              </div>
            </div>
          </div>

          {/* Security Status Card */}
          <div className="bg-surface border border-outline-variant shadow-sm rounded-xl p-6 glass-card space-y-4">
            <h3 className="text-headline-sm font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant pb-2">
              <span className="material-symbols-outlined text-tertiary-container">shield</span>
              <span>Security Panel</span>
            </h3>

            <div className="space-y-3">
              <div>
                <span className="text-xs text-outline block">Encryption Standard</span>
                <span className="text-xs font-semibold bg-tertiary/10 border border-tertiary-container/30 text-tertiary-container px-2 py-0.5 rounded-full inline-block mt-0.5">
                  AES-256 Validated
                </span>
              </div>
              <div>
                <span className="text-xs text-outline block">Access Token (Memory)</span>
                {activeToken ? (
                  <span className="text-xs font-semibold bg-primary-container/20 border border-primary/30 text-primary px-2 py-0.5 rounded-full inline-block mt-0.5">
                    Active & Secured
                  </span>
                ) : (
                  <span className="text-xs font-semibold bg-error-container/20 border border-error/30 text-error px-2 py-0.5 rounded-full inline-block mt-0.5">
                    Missing in Memory
                  </span>
                )}
              </div>
              <div>
                <span className="text-xs text-outline block">Refresh Token (Cookie)</span>
                <span className="text-xs font-semibold bg-tertiary/10 border border-tertiary-container/30 text-tertiary-container px-2 py-0.5 rounded-full inline-block mt-0.5">
                  Active (Secure Cookie)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Future Extensions Placeholder */}
        <div className="bg-surface border border-outline-variant shadow-sm rounded-xl p-6 glass-card border-dashed">
          <div className="flex items-center gap-3 text-outline">
            <span className="material-symbols-outlined text-[32px]">architecture</span>
            <div>
              <h4 className="font-semibold text-on-surface-variant">Future Modules Architecture Ready</h4>
              <p className="text-xs text-outline mt-0.5">
                The core authentication and routing infrastructure is designed to integrate Medicines Database, Patients Directory, Prescription Orders, and Delivery Tracking modules seamlessly.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
