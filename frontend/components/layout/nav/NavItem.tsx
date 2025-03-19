
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}

const NavItem = ({ to, icon: Icon, label, onClick }: NavItemProps) => {
  return (
    <NavLink 
      to={to}
      className={({ isActive }) => cn(
        "relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300",
        "hover:bg-secondary",
        isActive ? "text-primary font-medium" : "text-foreground/80"
      )}
      onClick={onClick}
    >
      {({ isActive }) => (
        <>
          <div className="flex items-center justify-center">
            <Icon size={20} className={cn(
              "transition-all duration-300",
              isActive && "stroke-primary"
            )} />
          </div>
          <span className="text-sm">{label}</span>
          {/* Active indicator */}
          <span className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full",
            isActive ? "block" : "hidden"
          )} />
        </>
      )}
    </NavLink>
  );
};

export default NavItem;
