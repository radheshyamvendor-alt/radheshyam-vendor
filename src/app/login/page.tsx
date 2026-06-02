"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import useAuth from "@/hooks/useAuth";
import { AUTH_CONSTANTS } from "@/services/auth.constants";

const loginSchema = zod.object({
  email: zod.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: zod.string().min(6, "Password must be at least 6 characters"),
  remember: zod.boolean().optional(),
});

type LoginFormValues = zod.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await login({
        email: values.email,
        password: values.password,
      });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Invalid credentials. Please try again.");
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

      {/* Brand Identity Section */}
      <div className="flex flex-col items-center mb-stack-lg">
        <div className="bg-primary rounded-xl p-3 shadow-lg mb-stack-md flex items-center justify-center transform hover:rotate-3 transition-transform duration-300">
          <span className="material-symbols-outlined text-on-primary text-[40px]">medical_services</span>
        </div>
        <h1 className="font-headline-md text-headline-md text-on-surface mb-stack-xs text-center">Radheshyam Medical</h1>
        <p className="font-body-md text-on-surface-variant text-center px-8">Secured Access for Medical Professionals &amp; Pharmacies</p>
      </div>

      {/* Authentication Card */}
      <div className="bg-surface border border-outline-variant shadow-sm rounded-xl p-margin-desktop glass-card">
        {errorMsg && (
          <div className="mb-4 p-3 bg-error-container/30 border border-error text-error text-sm rounded-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form className="space-y-stack-lg" onSubmit={handleSubmit(onSubmit)}>
          {/* Username/Email Input */}
          <div className="space-y-stack-sm">
            <label className="font-label-md text-label-md text-on-surface-variant block ml-1" htmlFor="email">
              Username or Email
            </label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                person
              </span>
              <input
                {...registerField("email")}
                className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none text-body-md font-body-md placeholder:text-outline-variant"
                id="email"
                placeholder="pharmacy_admin_01@gmail.com"
                type="text"
                disabled={isSubmitting}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-error ml-1 mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password Input */}
          <div className="space-y-stack-sm">
            <div className="flex justify-between items-center px-1">
              <label className="font-label-md text-label-md text-on-surface-variant block" htmlFor="password">
                Password
              </label>
              <Link href={AUTH_CONSTANTS.ROUTES.FORGOT_PASSWORD} className="font-label-md text-label-md text-primary hover:underline transition-all">
                Forgot Password?
              </Link>
            </div>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                lock
              </span>
              <input
                {...registerField("password")}
                className="w-full pl-12 pr-12 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none text-body-md font-body-md placeholder:text-outline-variant"
                id="password"
                placeholder="••••••••"
                type={showPassword ? "text" : "password"}
                disabled={isSubmitting}
              />
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                type="button"
              >
                <span className="material-symbols-outlined">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-error ml-1 mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Remember Me & Security Meta */}
          <div className="flex items-center space-x-2 px-1">
            <input
              {...registerField("remember")}
              className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
              id="remember"
              type="checkbox"
              disabled={isSubmitting}
            />
            <label className="font-label-md text-label-md text-on-surface-variant select-none" htmlFor="remember">
              Remember this device for 30 days
            </label>
          </div>

          {/* Login Button */}
          <button
            className="w-full bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-headline-sm py-4 rounded-lg shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-75 disabled:cursor-not-allowed"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Login</span>
                <span className="material-symbols-outlined">login</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-stack-lg pt-stack-lg border-t border-outline-variant">
          <div className="text-center">
            <p className="font-body-md text-on-surface-variant mb-stack-sm">New to Radheshyam Network?</p>
            <Link href={AUTH_CONSTANTS.ROUTES.REGISTER} className="inline-flex items-center space-x-2 text-primary font-headline-sm text-headline-sm hover:translate-x-1 transition-transform group">
              <span>Register New Pharmacy</span>
              <span className="material-symbols-outlined text-body-lg">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Trust Badges & Footer */}
      <div className="mt-stack-lg text-center space-y-stack-sm">
        <div className="flex justify-center items-center space-x-margin-mobile opacity-60">
          <div className="flex items-center space-x-1">
            <span className="material-symbols-outlined text-body-md">verified_user</span>
            <span className="font-label-md text-label-md uppercase tracking-wider">HIPAA Compliant</span>
          </div>
          <div className="flex items-center space-x-1 border-l border-outline-variant pl-4">
            <span className="material-symbols-outlined text-body-md">shield</span>
            <span className="font-label-md text-label-md uppercase tracking-wider">AES-256 Encrypted</span>
          </div>
        </div>
        <p className="text-[10px] text-outline uppercase tracking-widest pt-4">© 2026 Radheshyam Medical Group. All Rights Reserved.</p>
      </div>

      {/* Visual Polish: Decorative Illustration Side */}
      <div className="hidden lg:block fixed left-12 bottom-12 w-64 h-64 opacity-20 pointer-events-none">
        <img
          className="w-full h-full object-contain grayscale"
          alt="clinical notes"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDm-FMoo0Wpi10RWfH5aBDZTA0oMhzmHZgTd3Em91HyS-AwqAayU19RImWnnmybzAeo2GLfbSv0WDsXQbI43gaIf7tfXDTJAAAmjpiEZFsbc0zcYskGoDeMLSb0dpW4qlU11fIcR6IAs9GtnUkx2S5oY7kHDzVXatEMinSCh2TVq92kiA-4OmfOdN6K1Ck4HDC9LhphCZRURFguVCdZs-SJDwOxwFq-u4c9dSpHsQwDFte0pPQuIfS5JUND9nTlDXS9RbbOV9JD6I4"
        />
      </div>
    </div>
  );
}
