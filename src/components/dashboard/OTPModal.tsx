"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getLocalAccessToken } from "@/lib/axios";
import { verifyOtpApi, resendOtpApi } from "@/app/actions/order";

interface OTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescriptionNumber: string;
  initialMockOtp?: string;
  orderId: string;
}

export default function OTPModal({
  isOpen,
  onClose,
  prescriptionNumber,
  initialMockOtp,
}: OTPModalProps) {
  const accessToken = getLocalAccessToken() || "";
  const queryClient = useQueryClient();

  const [otp, setOtp] = useState("");
  const [currentMockOtp, setCurrentMockOtp] = useState(initialMockOtp || "");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // OTP Verification Mutation
  const verifyMutation = useMutation({
    mutationFn: () => verifyOtpApi(prescriptionNumber, otp, accessToken || ""),
    onSuccess: (result) => {
      if (result.success) {
        setSuccessMsg(result.message || "OTP Verified successfully!");
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrorMsg(result.error || "Verification failed. Invalid OTP.");
      }
    },
  });

  // OTP Resend Mutation
  const resendMutation = useMutation({
    mutationFn: () => resendOtpApi(prescriptionNumber, accessToken || ""),
    onSuccess: (result) => {
      if (result.success) {
        setSuccessMsg("New OTP sent successfully!");
        if (result.newOtp) {
          setCurrentMockOtp(result.newOtp);
        }
        setErrorMsg(null);
      } else {
        setErrorMsg(result.error || "Failed to resend OTP.");
      }
    },
  });

  if (!isOpen) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (otp.length < 4) {
      setErrorMsg("Please enter a valid OTP code.");
      return;
    }

    verifyMutation.mutate();
  };

  const handleResend = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    resendMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/40 backdrop-blur-sm">
      <div
        className="w-full max-w-sm bg-surface border border-outline-variant rounded-2xl shadow-xl overflow-hidden glass-card animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
          <h3 className="font-bold text-headline-sm text-on-surface">OTP Delivery Verification</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container active:scale-90 transition-transform"
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleVerify} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-error-container/30 border border-error text-error text-sm rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-tertiary-container/10 border border-tertiary-container text-tertiary-container text-sm rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{successMsg}</span>
            </div>
          )}

          <div className="text-center space-y-2">
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Enter the OTP provided by the patient to verify order delivery completion for prescription:
            </p>
            <span className="inline-block px-3 py-1 bg-surface-container-high border border-outline-variant rounded-lg text-xs font-bold text-primary font-mono select-all">
              {prescriptionNumber}
            </span>
          </div>

          {/* Input field */}
          <div className="space-y-1.5 pt-2">
            <label className="font-label-md text-label-md text-on-surface-variant block text-center" htmlFor="otp">
              OTP Verification Code
            </label>
            <input
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full px-4 py-3 text-center tracking-widest font-bold text-headline-md bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:tracking-normal placeholder:font-normal placeholder:text-sm placeholder:text-outline/60 text-on-surface"
              placeholder="e.g. 123456"
              type="text"
              maxLength={6}
              required
              disabled={verifyMutation.isPending}
            />
          </div>

          {/* Test Mock Helper Badge */}
          {currentMockOtp && (
            <div className="p-2.5 bg-primary-container/10 border border-primary/20 rounded-xl text-center">
              <span className="text-[10px] text-outline uppercase tracking-wider block font-semibold mb-0.5">
                Sandbox Mode OTP Helper
              </span>
              <span className="font-bold text-sm text-primary font-mono select-all">{currentMockOtp}</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-4 flex flex-col gap-2">
            <button
              type="submit"
              disabled={verifyMutation.isPending || otp.length < 4}
              className="w-full h-12 bg-primary text-on-primary rounded-xl font-label-md text-label-md flex items-center justify-center gap-2 shadow-md hover:bg-on-primary-fixed-variant active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifyMutation.isPending ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <span>Verify &amp; Complete</span>
                  <span className="material-symbols-outlined">verified</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resendMutation.isPending}
              className="w-full h-10 border border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container rounded-xl font-label-md text-label-md flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              {resendMutation.isPending ? (
                <span>Resending...</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">sync</span>
                  <span>Resend OTP</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
