
import {
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DeleteWatchlistAlertProps {
  onConfirm: () => void;
  onCancel: () => void;
  watchlistName: string;
}

const DeleteWatchlistAlert = ({
  onConfirm,
  onCancel,
  watchlistName
}: DeleteWatchlistAlertProps) => {
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
        <AlertDialogDescription>
          This will permanently delete <span className="font-medium">{watchlistName}</span> and remove all
          stocks within it. This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
        <Button variant="destructive" onClick={onConfirm}>
          Delete
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
};

export default DeleteWatchlistAlert;
