"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { AUTH_CONSTANTS } from "@/services/auth.constants";

const resetPasswordSchema = zod
  .object({
    email: zod.string().min(1, "Email is required").email("Please enter a valid email address"),
    token: zod.string().min(1, "Reset token is required"),
    newPassword: zod.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: zod.string().min(6, "Confirm password must be at least 6 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = zod.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const { resetPassword } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register: registerField,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
      token: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Prefill email and token from URL parameters if present
  useEffect(() => {
    const emailParam = searchParams.get("email");
    const tokenParam = searchParams.get("token");
    if (emailParam) setValue("email", decodeURIComponent(emailParam));
    if (tokenParam) setValue("token", decodeURIComponent(tokenParam));
  }, [searchParams, setValue]);

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await resetPassword({
        email: values.email,
        token: values.token,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      setSuccessMsg("Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        router.push(AUTH_CONSTANTS.ROUTES.LOGIN);
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Invalid or expired token. Please request another link.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface border border-outline-variant shadow-sm rounded-xl p-margin-desktop glass-card">
      {errorMsg && (
        <div className="mb-4 p-3 bg-error-container/30 border border-error text-error text-sm rounded-lg flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 bg-tertiary/10 border border-tertiary-container text-tertiary-container text-sm rounded-lg flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{successMsg}</span>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        {/* Email Input */}
        <div className="space-y-1">
          <label className="font-label-md text-label-md text-on-surface-variant block ml-1" htmlFor="email">
            Registered Email Address *
          </label>
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
              mail
            </span>
            <input
              {...registerField("email")}
              className="w-full pl-12 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none text-body-md font-body-md placeholder:text-outline-variant"
              id="email"
              placeholder="chemist@gmail.com"
              type="email"
              disabled={isSubmitting}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-error ml-1">{errors.email.message}</p>
          )}
        </div>

        {/* Token Input */}
        <div className="space-y-1">
          <label className="font-label-md text-label-md text-on-surface-variant block ml-1" htmlFor="token">
            Reset Token *
          </label>
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
              vpn_key
            </span>
            <input
              {...registerField("token")}
              className="w-full pl-12 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none text-body-md font-body-md placeholder:text-outline-variant"
              id="token"
              placeholder="Enter your security token"
              type="text"
              disabled={isSubmitting}
            />
          </div>
          {errors.token && (
            <p className="text-xs text-error ml-1">{errors.token.message}</p>
          )}
        </div>

        {/* New Password */}
        <div className="space-y-1">
          <label className="font-label-md text-label-md text-on-surface-variant block ml-1" htmlFor="newPassword">
            New Password *
          </label>
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
              lock
            </span>
            <input
              {...registerField("newPassword")}
              className="w-full pl-12 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none text-body-md font-body-md placeholder:text-outline-variant"
              id="newPassword"
              placeholder="••••••••"
              type="password"
              disabled={isSubmitting}
            />
          </div>
          {errors.newPassword && (
            <p className="text-xs text-error ml-1">{errors.newPassword.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1">
          <label className="font-label-md text-label-md text-on-surface-variant block ml-1" htmlFor="confirmPassword">
            Confirm Password *
          </label>
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
              lock_reset
            </span>
            <input
              {...registerField("confirmPassword")}
              className="w-full pl-12 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none text-body-md font-body-md placeholder:text-outline-variant"
              id="confirmPassword"
              placeholder="••••••••"
              type="password"
              disabled={isSubmitting}
            />
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-error ml-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          className="w-full bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-headline-sm py-3.5 rounded-lg shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-75 disabled:cursor-not-allowed"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Updating...</span>
            </>
          ) : (
            <>
              <span>Update Password</span>
              <span className="material-symbols-outlined">save</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-outline-variant">
        <div className="text-center">
          <Link href={AUTH_CONSTANTS.ROUTES.LOGIN} className="inline-flex items-center space-x-2 text-primary font-headline-sm text-headline-sm hover:-translate-x-1 transition-transform group">
            <span className="material-symbols-outlined text-body-lg">arrow_back</span>
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <div className="relative w-full max-w-[460px] z-10 mx-auto my-12 p-4 md:p-0">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary-container/10 rounded-full blur-3xl"></div>
      </div>

      {/* Brand Identity */}
      <div className="flex flex-col items-center mb-6">
        <div className="bg-primary rounded-xl p-3 shadow-lg mb-4 flex items-center justify-center transform hover:rotate-3 transition-transform duration-300">
          <span className="material-symbols-outlined text-on-primary text-[32px]">security</span>
        </div>
        <h1 className="font-headline-md text-headline-md text-on-surface mb-1">Set New Password</h1>
        <p className="font-body-md text-on-surface-variant text-center px-8">Define a new password for your user profile credentials</p>
      </div>

      {/* Form with Suspense Wrapper */}
      <Suspense
        fallback={
          <div className="bg-surface border border-outline-variant shadow-sm rounded-xl p-margin-desktop glass-card flex flex-col items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="mt-4 text-on-surface-variant text-sm font-medium">Loading form context...</span>
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>

      {/* Footer */}
      <div className="mt-6 text-center text-[10px] text-outline uppercase tracking-widest">
        © 2026 Radheshyam Medical Group. All Rights Reserved.
      </div>
    </div>
  );
}
