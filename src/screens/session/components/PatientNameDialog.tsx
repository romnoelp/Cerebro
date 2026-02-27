import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface PatientNameDialogProps {
  open: boolean;
  patientName: string;
  onOpenChange: (open: boolean) => void;
  onPatientNameChange: (name: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const PatientNameDialog = ({
  open,
  patientName,
  onOpenChange,
  onPatientNameChange,
  onSubmit,
  onCancel,
}: PatientNameDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border border-border/40 bg-background/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle>Patient Information</DialogTitle>
          <DialogDescription>
            Enter the participant's name to begin the session.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="patient-name">Patient Name</Label>
            <Input
              id="patient-name"
              placeholder="Enter patient name..."
              value={patientName}
              onChange={(e) => onPatientNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onSubmit();
                }
              }}
              className="border-border/40"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={onCancel} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button onClick={onSubmit} className="flex-1">
              Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
