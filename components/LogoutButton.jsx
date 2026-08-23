"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  async function handleLogout() {
    await signOut({
      callbackUrl: "/login",
    });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      aria-label="Logout"
      title="Logout"
      className="mt-4 flex w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 md:justify-start md:px-3"
    >
      {/* Desktop */}

      <span className="hidden md:block">
        Logout
      </span>

      {/* Mobile */}

      <LogOut className="h-5 w-5 md:hidden" />
    </button>
  );
}