"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useAuth from "@/hooks/useAuth";

interface HeaderProps {
  title?: string;
  icon?: string;
  rightActions?: React.ReactNode;
}

export default function Header({ title, icon, rightActions }: HeaderProps) {
  const { logout } = useAuth();
  const pathname = usePathname();

  // Determine dynamic defaults based on pathname
  let defaultTitle = "Radheshyam Medical";
  let defaultIcon = "medical_services";

  if (pathname === "/dashboard") {
    defaultTitle = "Inventory";
    defaultIcon = "inventory_2";
  } else if (pathname.startsWith("/dashboard/catalog")) {
    defaultTitle = "Medicines";
    defaultIcon = "verified_user";
  } else if (pathname.startsWith("/dashboard/otp")) {
    defaultTitle = "Orders";
    defaultIcon = "local_shipping";
  } else if (pathname.startsWith("/dashboard/cart")) {
    defaultTitle = "Cart";
    defaultIcon = "shopping_cart";
  } else if (pathname.startsWith("/dashboard/checkout")) {
    defaultTitle = "Checkout";
    defaultIcon = "assignment_turned_in";
  } else if (pathname.startsWith("/dashboard/notifications")) {
    defaultTitle = "Notifications";
    defaultIcon = "notifications";
  } else if (pathname.startsWith("/dashboard/ocr")) {
    defaultTitle = "Scan Prescription";
    defaultIcon = "document_scanner";
  } else if (pathname.startsWith("/profile")) {
    defaultTitle = "Profile";
    defaultIcon = "person";
  }

  const displayTitle = title ?? defaultTitle;
  const displayIcon = icon ?? defaultIcon;

  const links = [
    { name: "Medicines", href: "/dashboard/catalog" },
    { name: "Inventory", href: "/dashboard" },
    { name: "Orders", href: "/dashboard/otp" },
    { name: "Scan Prescription", href: "/dashboard/ocr" },
    { name: "Profile", href: "/profile" },
    { name: "Notifications", href: "/dashboard/notifications" },
  ];

  return (
    <>
      {/* ── DESKTOP HEADER ── */}
      <header className="hidden md:block w-full bg-white border-b border-[#e0e3e5] sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
          {/* Brand Name on Left */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl sm:text-2xl font-bold text-[#003d9b] hover:opacity-90 transition-opacity">
              Radheshyam Medical
            </Link>
            {/* Navigation Links - Desktop */}
            <nav className="flex items-center gap-6">
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`text-sm font-semibold transition-all pb-1 hover:text-[#003d9b] ${
                      isActive
                        ? "text-[#003d9b] border-b-2 border-[#003d9b] font-bold"
                        : "text-[#505f76]"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User profile / Logout on Right */}
          <div className="flex items-center gap-4">
            <button
              onClick={logout}
              className="text-sm font-semibold text-[#505f76] hover:text-[#ba1a1a] transition-colors"
            >
              Logout
            </button>
            <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden border border-[#e0e3e5] shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="User Avatar"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA8DDlvrxN56DhF-qAbAW49-l1xusXm4nU0pdNonwGYZJ5XE97jF2-h1-CIu5lqxQRe4_l_1C9v8gpdU2UHA4B9pUiFcZ_8EkVK5rH-JQlDXvDyJc3XAb5YYm-K_B5cXypPVBNdez3Mm8Eii1Iocaj39DhKO8q2uDFva2VFjDDBLk8MI4oW367fb0ujikN0DxZJQqs0buCuPl3oVMDL-u5GPciNVlsEY6DtmneJ9hcVSThwQuosj7WkEYmN0onNVD-DBwKf0cH1Q0k"
              />
            </div>
          </div>
        </div>
      </header>

      {/* ── MOBILE HEADER ── */}
      <header className="md:hidden sticky top-0 z-40 bg-surface-container-lowest shadow-sm h-16 flex items-center px-4 justify-between border-b border-outline-variant">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center text-on-primary">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              {displayIcon}
            </span>
          </div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-[#003d9b] font-bold">
            {displayTitle}
          </h1>
        </div>
        {rightActions || (
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/notifications"
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
            >
              <span className="material-symbols-outlined">notifications</span>
            </Link>
          </div>
        )}
      </header>
    </>
  );
}
