
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function useWatchlistCreateForm(
  onSuccess: () => void,
  onCancel: () => void
) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const isValid = name.trim().length > 0;

  const handleNameChange = (value: string) => {
    setName(value);
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
  };

  const resetForm = () => {
    setName("");
    setDescription("");
  };

  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  const handleSubmit = (callback: (name: string, description: string) => Promise<any>) => {
    if (!isValid) {
      toast({
        title: "Error",
        description: "Please enter a name for the watchlist.",
        variant: "destructive",
      });
      return;
    }

    callback(name, description)
      .then(() => {
        resetForm();
        onSuccess();
      })
      .catch((error) => {
        console.error("Error in form submission:", error);
        toast({
          title: "Error",
          description: "Failed to process your request. Please try again.",
          variant: "destructive",
        });
      });
  };

  return {
    name,
    description,
    handleNameChange,
    handleDescriptionChange,
    isValid,
    handleCancel,
    handleSubmit,
  };
}
