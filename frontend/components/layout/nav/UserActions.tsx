
import { useState } from "react";
import { Bell } from "lucide-react";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import UserMenu from "@/components/auth/UserMenu";

const UserActions = () => {
  return (
    <div className="flex items-center gap-2">
      <NotificationCenter />
      <UserMenu />
    </div>
  );
};

export default UserActions;
