"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import useAuth from "@/hooks/useAuth";
import { AUTH_CONSTANTS } from "@/services/auth.constants";

const forgotPasswordSchema = zod.object({
  email: zod.string().min(1, "Email is required").email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = zod.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register: registerField,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await forgotPassword(values.email);
      setSuccessMsg("Password reset token has been sent to your email.");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Email address not found. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full max-w-[440px] z-10 mx-auto my-12 p-4 md:p-0">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary-container/10 rounded-full blur-3xl"></div>
      </div>

      {/* Brand Identity */}
      <div className="flex flex-col items-center mb-6">
        <div className="bg-primary rounded-xl p-3 shadow-lg mb-4 flex items-center justify-center transform hover:rotate-3 transition-transform duration-300">
          <span className="material-symbols-outlined text-on-primary text-[32px]">lock_reset</span>
        </div>
        <h1 className="font-headline-md text-headline-md text-on-surface mb-1">Reset Password</h1>
        <p className="font-body-md text-on-surface-variant text-center px-8">Retrieve secure access credentials for your facility</p>
      </div>

      {/* Forgot Card */}
      <div className="bg-surface border border-outline-variant shadow-sm rounded-xl p-margin-desktop glass-card">
        {errorMsg && (
          <div className="mb-4 p-3 bg-error-container/30 border border-error text-error text-sm rounded-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-tertiary/10 border border-tertiary-container text-tertiary-container text-sm rounded-lg flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span className="font-medium">{successMsg}</span>
            </div>
            <Link 
              href={`${AUTH_CONSTANTS.ROUTES.RESET_PASSWORD}?email=${encodeURIComponent(getValues("email") || "")}`}
              className="text-xs text-primary underline hover:text-primary-container font-semibold"
            >
              Go to Reset Form to enter token &rarr;
            </Link>
          </div>
        )}

        <form className="space-y-stack-lg" onSubmit={handleSubmit(onSubmit)}>
          {/* Email Input */}
          <div className="space-y-stack-sm">
            <label className="font-label-md text-label-md text-on-surface-variant block ml-1" htmlFor="email">
              Enter Registered Email Address
            </label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                mail
              </span>
              <input
                {...registerField("email")}
                className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none text-body-md font-body-md placeholder:text-outline-variant"
                id="email"
                placeholder="chemist@gmail.com"
                type="email"
                disabled={isSubmitting}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-error ml-1 mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            className="w-full bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-headline-sm py-4 rounded-lg shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-75 disabled:cursor-not-allowed"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Requesting Token...</span>
              </>
            ) : (
              <>
                <span>Request Reset Token</span>
                <span className="material-symbols-outlined">send</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-stack-lg pt-stack-lg border-t border-outline-variant">
          <div className="text-center">
            <Link href={AUTH_CONSTANTS.ROUTES.LOGIN} className="inline-flex items-center space-x-2 text-primary font-headline-sm text-headline-sm hover:-translate-x-1 transition-transform group">
              <span className="material-symbols-outlined text-body-lg">arrow_back</span>
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-[10px] text-outline uppercase tracking-widest">
        © 2026 Radheshyam Medical Group. All Rights Reserved.
      </div>
    </div>
  );
}
