"use client";

import Link from "next/link";
import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";

export default function Notifications() {
  const notificationsList = [
    {
      id: "1",
      type: "alert",
      title: "Stock Alert: Insulin Glargine",
      message: "Stock level has dropped below critical threshold (5 units left). Please restock soon.",
      time: "4 hours ago",
      icon: "warning",
      color: "text-error border-l-4 border-l-error bg-error-container/10",
    },
    {
      id: "2",
      type: "restock",
      title: "Restock Success: Amoxicillin 500mg",
      message: "Admin successfully added 200 units to inventory. Current stock: 450 units.",
      time: "2 hours ago",
      icon: "inventory_2",
      color: "text-primary border-l-4 border-l-primary bg-primary-container/10",
    },
    {
      id: "3",
      type: "system",
      title: "New Category Added",
      message: "New product category 'Dermatology' was registered successfully.",
      time: "Yesterday",
      icon: "category",
      color: "text-on-surface-variant border-l-4 border-l-outline bg-surface-container/50",
    },
    {
      id: "4",
      type: "order",
      title: "Delivery OTP Verified",
      message: "Prescription order #9000186518 delivery completed for RAMESH SHARMA.",
      time: "2 days ago",
      icon: "check_circle",
      color: "text-tertiary border-l-4 border-l-tertiary bg-tertiary-container/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Shared Header component */}
      <Header />

      <main className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop py-xl pb-24 md:pb-12">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-xs">
              System Notifications
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Stay updated on inventory logs, low stock alerts, and delivery confirmations.
            </p>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden p-6 space-y-4">
            {notificationsList.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-xl flex gap-4 transition-all hover:translate-x-1 ${notification.color}`}
              >
                <div className="shrink-0">
                  <span className="material-symbols-outlined text-[24px]">{notification.icon}</span>
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-on-surface">{notification.title}</h3>
                  <p className="text-xs text-on-surface-variant">{notification.message}</p>
                  <span className="text-[10px] text-outline block mt-1">{notification.time}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-outline-variant hover:bg-surface-container-low text-sm font-semibold rounded-xl transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Shared Responsive Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
