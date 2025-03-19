
const StockTableHeader = () => {
  return (
    <thead>
      <tr className="border-b border-border">
        <th className="pb-3 text-left font-medium text-muted-foreground text-sm">Symbol</th>
        <th className="pb-3 text-left font-medium text-muted-foreground text-sm">Notes</th>
        <th className="pb-3 text-right font-medium text-muted-foreground text-sm">Price</th>
        <th className="pb-3 text-right font-medium text-muted-foreground text-sm">Change</th>
        <th className="pb-3 text-right font-medium text-muted-foreground text-sm">Actions</th>
      </tr>
    </thead>
  );
};

export default StockTableHeader;
