"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAuth from "@/hooks/useAuth";
import { getDashboardStats, startDelivery } from "@/app/actions/order";
import OTPModal from "@/components/dashboard/OTPModal";
import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";

export interface DashboardOrder {
  id: string;
  prescriptionNumber: string | null;
  status: string;
  otp: string | null;
  createdAt: string | Date;
  patient: {
    name: string;
    mobile: string;
  } | null;
  orderMedicines: Array<{
    medicineId: string;
    quantity: number;
    medicine: {
      name: string;
    };
  }>;
}

export default function OTPVerificationPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // OTP Modal Overlay States
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [otpPrescriptionNo, setOtpPrescriptionNo] = useState("");
  const [otpOrderId, setOtpOrderId] = useState("");
  const [otpMockCode, setOtpMockCode] = useState("");

  // Fetch Dashboard Stats & Recents
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => getDashboardStats(),
  });

  // Start Delivery mutation
  const startDeliveryMutation = useMutation({
    mutationFn: (orderId: string) => startDelivery(orderId),
    onSuccess: (result, orderId) => {
      if (result.success && result.data) {
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        
        // Open OTP Verification Dialog directly
        setOtpOrderId(orderId);
        setOtpPrescriptionNo(result.data.prescriptionNumber || "");
        setOtpMockCode(result.mockOtp || "");
        setIsOtpOpen(true);
      }
    },
  });

  const stats = (data && data.success && data.stats) ? data.stats : {
    totalMedicines: 0,
    ordersToday: 0,
    pendingDeliveries: 0,
    completedDeliveries: 0,
  };

  const recentOrders = ((data && data.success && data.recentOrders) ? data.recentOrders : []) as DashboardOrder[];

  const handleStartDelivery = (order: DashboardOrder) => {
    startDeliveryMutation.mutate(order.id);
  };

  const handleEnterOtp = (order: DashboardOrder) => {
    setOtpOrderId(order.id);
    setOtpPrescriptionNo(order.prescriptionNumber || "");
    setOtpMockCode(order.otp || "");
    setIsOtpOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Unified Navigation Header */}
      <Header />

      {/* Main Panel Content */}
      <main className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop py-xl pb-24 md:pb-12 space-y-8">
        {/* Welcome Banner */}
        <div className="bg-surface-container-lowest border border-outline-variant shadow-sm rounded-xl p-6 glass-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-headline-md font-bold text-on-surface mb-1">
              Welcome back, {user?.name || "Chemist"}!
            </h2>
            <p className="text-sm text-on-surface-variant">
              Manage medicine inventories, process prescription uploads, and verify package deliveries securely.
            </p>
          </div>
          
          <div className="flex gap-2">
            <Link
              href="/dashboard/catalog"
              className="px-4 py-2.5 bg-[#003d9b] text-white rounded-xl font-label-md text-label-md hover:opacity-95 transition-all shadow"
            >
              Browse Catalog
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2.5 border border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container rounded-xl font-label-md text-label-md transition-all"
            >
              Inventory
            </Link>
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center bg-surface-container-lowest border border-outline-variant rounded-xl glass-card">
            <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="mt-4 text-on-surface-variant text-sm font-semibold">Updating statistics counts...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-error font-medium bg-surface-container-lowest border border-outline-variant rounded-xl glass-card">
            Failed to sync dashboard statistics: {(error as Error).message || "Unknown error"}
          </div>
        ) : (
          <>
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {/* Total Medicines */}
              <div className="bg-surface-container-lowest border border-outline-variant shadow-sm rounded-xl p-5 glass-card">
                <span className="text-[10px] uppercase font-bold text-outline tracking-wider block">
                  Total Medicines
                </span>
                <span className="text-display-lg text-[32px] font-bold text-[#003d9b] block mt-1">
                  {stats.totalMedicines}
                </span>
              </div>

              {/* Orders Today */}
              <div className="bg-surface-container-lowest border border-outline-variant shadow-sm rounded-xl p-5 glass-card">
                <span className="text-[10px] uppercase font-bold text-outline tracking-wider block">
                  Orders Today
                </span>
                <span className="text-display-lg text-[32px] font-bold text-on-surface block mt-1">
                  {stats.ordersToday}
                </span>
              </div>

              {/* Pending Deliveries */}
              <div className="bg-surface-container-lowest border border-outline-variant shadow-sm rounded-xl p-5 glass-card">
                <span className="text-[10px] uppercase font-bold text-outline tracking-wider block">
                  Pending Deliveries
                </span>
                <span className="text-display-lg text-[32px] font-bold text-amber-600 block mt-1">
                  {stats.pendingDeliveries}
                </span>
              </div>

              {/* Completed Deliveries */}
              <div className="bg-surface-container-lowest border border-outline-variant shadow-sm rounded-xl p-5 glass-card">
                <span className="text-[10px] uppercase font-bold text-outline tracking-wider block">
                  Completed Deliveries
                </span>
                <span className="text-display-lg text-[32px] font-bold text-emerald-600 block mt-1">
                  {stats.completedDeliveries}
                </span>
              </div>
            </div>

            {/* Recent Activity Table */}
            <div className="bg-surface-container-lowest border border-outline-variant shadow-sm rounded-xl overflow-hidden glass-card">
              <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-lowest flex items-center justify-between">
                <h3 className="font-bold text-headline-sm text-on-surface">Recent Orders Queue</h3>
              </div>

              {recentOrders.length === 0 ? (
                <div className="p-12 text-center text-on-surface-variant font-medium">
                  No orders placed yet. Head over to the Medicine Catalog to create one!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm text-on-surface">
                    <thead className="bg-surface-container-lowest text-xs uppercase text-on-surface-variant font-bold border-b border-outline-variant select-none">
                      <tr>
                        <th className="px-6 py-4">Prescription No</th>
                        <th className="px-6 py-4">Patient Details</th>
                        <th className="px-6 py-4">Ordered Medicines</th>
                        <th className="px-6 py-4">Order Date</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-right">Delivery Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {recentOrders.map((order: DashboardOrder) => {
                        const dateFormatted = new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        return (
                          <tr key={order.id} className="hover:bg-surface-container-low transition-colors">
                            {/* Prescription Number */}
                            <td className="px-6 py-4 font-mono font-semibold text-primary">
                              {order.prescriptionNumber || "No Prescription"}
                            </td>
                            {/* Patient Info */}
                            <td className="px-6 py-4">
                              <div>
                                <span className="font-semibold block text-on-surface">
                                  {order.patient?.name || "Anonymous Patient"}
                                </span>
                                <span className="text-[10px] text-on-surface-variant block">
                                  {order.patient?.mobile}
                                </span>
                              </div>
                            </td>
                            {/* Medicines summary list */}
                            <td className="px-6 py-4">
                              <div className="max-w-[200px] truncate" title={order.orderMedicines.map((m) => `${m.medicine.name} (x${m.quantity})`).join(", ")}>
                                {order.orderMedicines.map((m) => (
                                  <span key={m.medicineId} className="block text-xs">
                                    • {m.medicine.name} <span className="font-bold text-[#003d9b]">x{m.quantity}</span>
                                  </span>
                                ))}
                              </div>
                            </td>
                            {/* Date */}
                            <td className="px-6 py-4 text-on-surface-variant font-medium text-xs">
                              {dateFormatted}
                            </td>
                            {/* Status badge */}
                            <td className="px-6 py-4 text-center">
                              {order.status === "PENDING" && (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600">
                                  Pending
                                </span>
                              )}
                              {order.status === "SHIPPED" && (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/10 border border-primary-container/30 text-[#003d9b]">
                                  Shipped
                                </span>
                              )}
                              {order.status === "COMPLETED" && (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600">
                                  Completed
                                </span>
                              )}
                            </td>
                            {/* Action Button */}
                            <td className="px-6 py-4 text-right">
                              {order.status === "PENDING" && (
                                <button
                                  onClick={() => handleStartDelivery(order)}
                                  disabled={startDeliveryMutation.isPending}
                                  className="px-3 py-1.5 bg-[#003d9b] text-white rounded-lg text-xs font-bold shadow hover:opacity-90 active:scale-95 transition-all flex items-center gap-1 ml-auto"
                                >
                                  <span className="material-symbols-outlined text-xs">local_shipping</span>
                                  <span>Start Delivery</span>
                                </button>
                              )}
                              {order.status === "SHIPPED" && (
                                <button
                                  onClick={() => handleEnterOtp(order)}
                                  className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold shadow hover:bg-amber-600 active:scale-95 transition-all flex items-center gap-1 ml-auto"
                                >
                                  <span className="material-symbols-outlined text-xs">lock_open</span>
                                  <span>Verify OTP</span>
                                </button>
                              )}
                              {order.status === "COMPLETED" && (
                                <span className="text-xs font-bold text-on-surface-variant flex items-center justify-end gap-1 select-none">
                                  <span className="material-symbols-outlined text-xs text-emerald-600">check_circle</span>
                                  <span>Delivered</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* OTP Delivery Verification Modal */}
      <OTPModal
        isOpen={isOtpOpen}
        onClose={() => setIsOtpOpen(false)}
        prescriptionNumber={otpPrescriptionNo}
        initialMockOtp={otpMockCode}
        orderId={otpOrderId}
      />

      {/* Shared Responsive Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
