"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { AUTH_CONSTANTS } from "@/services/auth.constants";

const registerSchema = zod
  .object({
    name: zod.string().min(2, "Name must be at least 2 characters"),
    email: zod.string().min(1, "Email is required").email("Please enter a valid email address"),
    mobile: zod.string().min(10, "Mobile number must be at least 10 digits").regex(/^[0-9]+$/, "Mobile must contain only numbers"),
    location: zod.string().min(2, "Location must be at least 2 characters"),
    password: zod.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: zod.string().min(6, "Confirm password must be at least 6 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = zod.infer<typeof registerSchema>;

export default function Register() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      mobile: "",
      location: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await registerUser({
        name: values.name,
        email: values.email,
        mobile: values.mobile,
        location: values.location,
        password: values.password,
        confirmPassword: values.confirmPassword,
      });
      setSuccessMsg("Pharmacy registered successfully! Redirecting to login...");
      setTimeout(() => {
        router.push(AUTH_CONSTANTS.ROUTES.LOGIN);
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Registration failed. Email might already exist.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full max-w-[480px] z-10 mx-auto my-12 p-4 md:p-0">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary-container/10 rounded-full blur-3xl"></div>
      </div>

      {/* Brand Identity */}
      <div className="flex flex-col items-center mb-6">
        <div className="bg-primary rounded-xl p-3 shadow-lg mb-4 flex items-center justify-center transform hover:rotate-3 transition-transform duration-300">
          <span className="material-symbols-outlined text-on-primary text-[32px]">medical_services</span>
        </div>
        <h1 className="font-headline-md text-headline-md text-on-surface mb-1">Create Account</h1>
        <p className="font-body-md text-on-surface-variant text-center px-8">Register your medical facility on Radheshyam Network</p>
      </div>

      {/* Register Card */}
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
          {/* Pharmacy/Name Input */}
          <div className="space-y-1">
            <label className="font-label-md text-label-md text-on-surface-variant block ml-1" htmlFor="name">
              Pharmacy / Representative Name *
            </label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                badge
              </span>
              <input
                {...registerField("name")}
                className="w-full pl-12 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none text-body-md font-body-md placeholder:text-outline-variant"
                id="name"
                placeholder="Radheshyam Pharmacy"
                type="text"
                disabled={isSubmitting}
              />
            </div>
            {errors.name && (
              <p className="text-xs text-error ml-1">{errors.name.message}</p>
            )}
          </div>

          {/* Email Input */}
          <div className="space-y-1">
            <label className="font-label-md text-label-md text-on-surface-variant block ml-1" htmlFor="email">
              Email Address *
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

          {/* Grid Layout for Mobile and Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mobile */}
            <div className="space-y-1">
              <label className="font-label-md text-label-md text-on-surface-variant block ml-1" htmlFor="mobile">
                Mobile Number *
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                  call
                </span>
                <input
                  {...registerField("mobile")}
                  className="w-full pl-12 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none text-body-md font-body-md placeholder:text-outline-variant"
                  id="mobile"
                  placeholder="9999999999"
                  type="text"
                  disabled={isSubmitting}
                />
              </div>
              {errors.mobile && (
                <p className="text-xs text-error ml-1">{errors.mobile.message}</p>
              )}
            </div>

            {/* Location */}
            <div className="space-y-1">
              <label className="font-label-md text-label-md text-on-surface-variant block ml-1" htmlFor="location">
                City / Location *
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                  location_on
                </span>
                <input
                  {...registerField("location")}
                  className="w-full pl-12 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none text-body-md font-body-md placeholder:text-outline-variant"
                  id="location"
                  placeholder="Delhi"
                  type="text"
                  disabled={isSubmitting}
                />
              </div>
              {errors.location && (
                <p className="text-xs text-error ml-1">{errors.location.message}</p>
              )}
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="font-label-md text-label-md text-on-surface-variant block ml-1" htmlFor="password">
              Password *
            </label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                lock
              </span>
              <input
                {...registerField("password")}
                className="w-full pl-12 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none text-body-md font-body-md placeholder:text-outline-variant"
                id="password"
                placeholder="••••••••"
                type="password"
                disabled={isSubmitting}
              />
            </div>
            {errors.password && (
              <p className="text-xs text-error ml-1">{errors.password.message}</p>
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
                <span>Registering...</span>
              </>
            ) : (
              <>
                <span>Register Facility</span>
                <span className="material-symbols-outlined">how_to_reg</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-outline-variant">
          <div className="text-center">
            <p className="font-body-md text-on-surface-variant mb-2">Already part of Radheshyam Network?</p>
            <Link href={AUTH_CONSTANTS.ROUTES.LOGIN} className="inline-flex items-center space-x-2 text-primary font-headline-sm text-headline-sm hover:translate-x-1 transition-transform group">
              <span>Sign In to Account</span>
              <span className="material-symbols-outlined text-body-lg">arrow_forward</span>
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
