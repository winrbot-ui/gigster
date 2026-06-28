"use client";

import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action={logout} className="mt-auto px-2 pt-8">
      <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
        Log out
      </Button>
    </form>
  );
}
