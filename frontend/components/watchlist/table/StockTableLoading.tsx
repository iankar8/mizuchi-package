
import { Loader2 } from "lucide-react";

const StockTableLoading = () => {
  return (
    <div className="flex justify-center items-center py-12">
      <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
    </div>
  );
};

export default StockTableLoading;
