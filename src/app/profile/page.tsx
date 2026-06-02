"use client";

import Link from "next/link";
import useAuth from "@/hooks/useAuth";

export default function Profile() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background trust-gradient p-6">
      {/* Navigation Header */}
      <nav className="max-w-[800px] mx-auto bg-surface border border-outline-variant shadow-sm rounded-xl p-4 flex items-center justify-between mb-8 glass-card">
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
          <Link href="/dashboard" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-all">
            Dashboard
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
      <main className="max-w-[800px] mx-auto space-y-6">
        {/* Profile Card */}
        <div className="bg-surface border border-outline-variant shadow-sm rounded-xl p-6 glass-card space-y-6">
          <div className="flex items-center gap-4 border-b border-outline-variant pb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xl border border-primary/20">
              {user?.name?.slice(0, 2).toUpperCase() || "RC"}
            </div>
            <div>
              <h2 className="text-headline-md font-bold text-on-surface">{user?.name}</h2>
              <span className="text-xs font-semibold text-accent-cyan uppercase tracking-wider">Registered Chemist Member</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <span className="text-xs text-outline block font-medium">Full Name</span>
              <span className="font-semibold text-on-surface text-base">{user?.name}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-outline block font-medium">Email Address</span>
              <span className="font-semibold text-on-surface text-base">{user?.email}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-outline block font-medium">Mobile Number</span>
              <span className="font-semibold text-on-surface text-base">{user?.mobile}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-outline block font-medium">Location</span>
              <span className="font-semibold text-on-surface text-base">{user?.location}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-outline-variant flex items-center justify-between">
            <span className="text-xs text-outline">Registered under ONGC HIS Chemist Network</span>
            <Link 
              href="/dashboard"
              className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-container transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
