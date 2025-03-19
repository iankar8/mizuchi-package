import { Shield, Users, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Watchlist } from "@/services/watchlist.service";

interface RoleManagementProps {
  watchlist: Watchlist & { userRole?: string | null };
}

export function RoleManagement({ watchlist }: RoleManagementProps) {
  if (!watchlist) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Shield className="h-4 w-4" />
      <span className="capitalize">{watchlist.userRole || 'viewer'}</span>
      <Users className="h-4 w-4 ml-2" />
      <span>{watchlist.member_count || 0} members</span>
      {watchlist.last_modified && (
        <>
          <Clock className="h-4 w-4 ml-2" />
          <span>Updated {formatDistanceToNow(new Date(watchlist.last_modified))} ago</span>
        </>
      )}
    </div>
  );
}
