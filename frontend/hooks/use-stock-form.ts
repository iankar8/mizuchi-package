
import { useState } from "react";

export function useStockForm(initialSymbol = "", initialNotes = "") {
  const [stockSymbol, setStockSymbol] = useState(initialSymbol);
  const [stockNotes, setStockNotes] = useState(initialNotes);

  const resetForm = () => {
    setStockSymbol("");
    setStockNotes("");
  };

  const isValid = () => {
    return stockSymbol.trim().length > 0;
  };

  const handleSymbolChange = (value: string) => {
    setStockSymbol(value.toUpperCase());
  };

  return {
    stockSymbol,
    setStockSymbol,
    handleSymbolChange,
    stockNotes,
    setStockNotes,
    resetForm,
    isValid
  };
}
