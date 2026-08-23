"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  Tags,
  PiggyBank,
  ArrowLeftRight,
  Banknote,
  CreditCard,
  Target,
  LogOut,
} from "lucide-react";
import LogoutButton from "./LogoutButton";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Accounts",
    href: "/accounts",
    icon: Wallet,
  },
  {
    name: "Categories",
    href: "/categories",
    icon: Tags,
  },
  {
    name: "Budget",
    href: "/budget",
    icon: PiggyBank,
  },
  {
    name: "Transactions",
    href: "/transactions",
    icon: ArrowLeftRight,
  },
  {
    name: "Income",
    href: "/income",
    icon: Banknote,
  },
  {
    name: "Debts",
    href: "/debts",
    icon: CreditCard,
  },
  {
    name: "Goals",
    href: "/goals",
    icon: Target,
  },
];

export default function NavbarContent() {
  const pathname = usePathname();

  function isActive(href) {
    return (
      pathname === href ||
      (href !== "/" && pathname.startsWith(href))
    );
  }

  return (
    <>
      {/* ==================================================
          DESKTOP SIDEBAR
      ================================================== */}

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r bg-background md:flex md:flex-col">
        {/* Logo */}

        <div className="flex h-16 items-center border-b px-5">
          <Link
            href="/"
            className="text-xl font-bold"
          >
            My Finance
          </Link>
        </div>

        {/* Navigation */}

        <nav className="flex flex-1 flex-col p-3">
          <div className="flex-1 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />

                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Desktop Logout */}

          <LogoutButton />
        </nav>
      </aside>

      {/* ==================================================
          MOBILE BOTTOM NAVIGATION
      ================================================== */}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background md:hidden px-2">
        <div className="grid h-16 grid-cols-9 items-baseline ">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.name}
                className={`flex items-center justify-center transition ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    active ? "stroke-[2.5]" : ""
                  }`}
                />
              </Link>
            );
          })}

          {/* Mobile Logout */}

          <LogoutButton
            className="flex items-center justify-center text-muted-foreground transition hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
          </LogoutButton>
        </div>
      </nav>
    </>
  );
}