"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAuth from "@/hooks/useAuth";
import { getDashboardStats, startDelivery, getOrders, deleteOrder, updateOrder } from "@/app/actions/order";
import OTPModal from "@/components/dashboard/OTPModal";
import EditOrderDialog from "@/components/dashboard/EditOrderDialog";
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
    address: string;
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

  // Edit Order modal states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<DashboardOrder | null>(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Fetch Dashboard Stats
  const { data, isLoading: isStatsLoading, error: statsError } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => getDashboardStats(),
  });

  // Fetch paginated orders (server-side pagination of 10 items)
  const { data: ordersResult, isLoading: isOrdersLoading, error: ordersError } = useQuery({
    queryKey: ["orders", page],
    queryFn: () => getOrders(page, pageSize),
  });

  // Start Delivery mutation
  const startDeliveryMutation = useMutation({
    mutationFn: (orderId: string) => startDelivery(orderId),
    onSuccess: (result, orderId) => {
      if (result.success && result.data) {
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        
        // Open OTP Verification Dialog directly
        setOtpOrderId(orderId);
        setOtpPrescriptionNo(result.data.prescriptionNumber || "");
        setIsOtpOpen(true);
      }
    },
  });

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: (orderId: string) => deleteOrder(orderId),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      } else {
        alert(result.error || "Failed to delete order");
      }
    },
  });

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: ({ orderId, input }: { orderId: string; input: any }) => updateOrder(orderId, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      } else {
        alert(result.error || "Failed to update order");
      }
    },
  });

  const stats = (data && data.success && data.stats) ? data.stats : {
    totalMedicines: 0,
    ordersToday: 0,
    pendingDeliveries: 0,
    completedDeliveries: 0,
  };

  const recentOrders = (ordersResult?.success ? (ordersResult.data ?? []) : []) as DashboardOrder[];
  const totalPages = ordersResult?.success ? (ordersResult.pagination?.totalPages ?? 1) : 1;
  const totalCount = ordersResult?.success ? (ordersResult.pagination?.totalCount ?? 0) : 0;

  const handleStartDelivery = (order: DashboardOrder) => {
    startDeliveryMutation.mutate(order.id);
  };

  const handleEnterOtp = (order: DashboardOrder) => {
    setOtpOrderId(order.id);
    setOtpPrescriptionNo(order.prescriptionNumber || "");
    setIsOtpOpen(true);
  };

  const handleDeleteOrder = (orderId: string) => {
    if (confirm("Are you sure you want to cancel and delete this order? All reserved medicine stocks will be returned to inventory.")) {
      deleteOrderMutation.mutate(orderId);
    }
  };

  const handleUpdateOrderSubmit = async (orderId: string, input: any) => {
    const res = await updateOrderMutation.mutateAsync({ orderId, input });
    if (!res.success) {
      throw new Error(res.error || "Failed to update order");
    }
  };

  const isLoading = isStatsLoading || isOrdersLoading;
  const error = statsError || ordersError;

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
                <>
                  {/* Table View — shown on Medium screens and up */}
                  <div className="hidden md:block overflow-x-auto">
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
                                <div className="flex items-center justify-end gap-sm">
                                  {order.status !== "COMPLETED" && (
                                    <>
                                      <button
                                        onClick={() => { setEditingOrder(order); setIsEditOpen(true); }}
                                        className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                                        title="Edit Order"
                                      >
                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                      </button>
                                      <button
                                        onClick={() => handleDeleteOrder(order.id)}
                                        className="p-1.5 rounded-lg text-error hover:bg-error/10 transition-colors"
                                        title="Delete/Cancel Order"
                                      >
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                      </button>
                                    </>
                                  )}
                                  {order.status === "PENDING" && (
                                    <button
                                      onClick={() => handleStartDelivery(order)}
                                      disabled={startDeliveryMutation.isPending}
                                      className="px-3 py-1.5 bg-[#003d9b] text-white rounded-lg text-xs font-bold shadow hover:opacity-90 active:scale-95 transition-all flex items-center gap-1 shrink-0"
                                    >
                                      <span className="material-symbols-outlined text-xs">local_shipping</span>
                                      <span>Start Delivery</span>
                                    </button>
                                  )}
                                  {order.status === "SHIPPED" && (
                                    <button
                                      onClick={() => handleEnterOtp(order)}
                                      className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold shadow hover:bg-amber-600 active:scale-95 transition-all flex items-center gap-1 shrink-0"
                                    >
                                      <span className="material-symbols-outlined text-xs">lock_open</span>
                                      <span>Verify OTP</span>
                                    </button>
                                  )}
                                  {order.status === "COMPLETED" && (
                                    <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1 select-none shrink-0">
                                      <span className="material-symbols-outlined text-xs text-emerald-600">check_circle</span>
                                      <span>Delivered</span>
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Card List View — shown on Mobile/Tablet */}
                  <div className="block md:hidden divide-y divide-outline-variant bg-surface">
                    {recentOrders.map((order: DashboardOrder) => {
                      const dateFormatted = new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <div key={order.id} className="p-5 space-y-4 hover:bg-surface-container-low transition-colors">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-outline tracking-wider block">
                                Prescription No
                              </span>
                              <span className="font-mono font-bold text-primary text-sm select-all">
                                {order.prescriptionNumber || "No Prescription"}
                              </span>
                            </div>
                            <div>
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
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-0.5">
                                Patient Name
                              </span>
                              <span className="font-semibold text-on-surface text-sm">
                                {order.patient?.name || "Anonymous Patient"}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-0.5">
                                Mobile Number
                              </span>
                              <span className="font-semibold text-on-surface text-sm">
                                {order.patient?.mobile || "N/A"}
                              </span>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">
                              Ordered Medicines
                            </span>
                            <div className="space-y-1 bg-surface-container rounded-lg p-2.5 border border-outline-variant">
                              {order.orderMedicines.map((m) => (
                                <span key={m.medicineId} className="block text-xs text-on-surface">
                                  • {m.medicine.name} <span className="font-bold text-[#003d9b]">x{m.quantity}</span>
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-2">
                            <span className="text-[10px] text-on-surface-variant font-medium">
                              {dateFormatted}
                            </span>
                            <div className="flex items-center gap-2">
                              {order.status !== "COMPLETED" && (
                                <div className="flex gap-1 mr-1">
                                  <button
                                    onClick={() => { setEditingOrder(order); setIsEditOpen(true); }}
                                    className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                                    title="Edit Order"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteOrder(order.id)}
                                    className="p-1.5 rounded-lg text-error hover:bg-error/10 transition-colors"
                                    title="Delete Order"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                  </button>
                                </div>
                              )}
                              {order.status === "PENDING" && (
                                <button
                                  onClick={() => handleStartDelivery(order)}
                                  disabled={startDeliveryMutation.isPending}
                                  className="px-3 py-1.5 bg-[#003d9b] text-white rounded-lg text-xs font-bold shadow hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5"
                                >
                                  <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                                  <span>Start Delivery</span>
                                </button>
                              )}
                              {order.status === "SHIPPED" && (
                                <button
                                  onClick={() => handleEnterOtp(order)}
                                  className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold shadow hover:bg-amber-600 active:scale-95 transition-all flex items-center gap-1.5"
                                >
                                  <span className="material-symbols-outlined text-[14px]">lock_open</span>
                                  <span>Verify OTP</span>
                                </button>
                              )}
                              {order.status === "COMPLETED" && (
                                <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1 select-none py-1">
                                  <span className="material-symbols-outlined text-xs text-emerald-600">check_circle</span>
                                  <span>Delivered</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Footer */}
                  <div className="p-lg border-t border-outline-variant flex items-center justify-between">
                    <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                      Showing {totalCount > 0 ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, totalCount)} of {totalCount} orders
                    </span>
                    <div className="flex gap-xs">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="px-4 py-2 border border-outline-variant rounded-lg text-label-md font-label-md hover:bg-surface-container-low transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        Previous
                      </button>
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                        className="px-4 py-2 bg-[#003d9b] text-white rounded-lg text-label-md font-label-md hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold">
                        Next
                      </button>
                    </div>
                  </div>
                </>
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
        orderId={otpOrderId}
      />

      {/* Edit Order Modal */}
      <EditOrderDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleUpdateOrderSubmit}
        order={editingOrder}
      />

      {/* Shared Responsive Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
