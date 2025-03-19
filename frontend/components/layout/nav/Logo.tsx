
import { Link } from "react-router-dom";
import { LineChart } from "lucide-react";

const Logo = () => {
  return (
    <Link to="/" className="flex items-center space-x-2">
      <LineChart className="h-6 w-6 text-primary" />
      <span className="text-lg font-semibold">Mizuchi</span>
    </Link>
  );
};

export default Logo;
