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

interface SubjectNameDialogProps {
  open: boolean;
  subjectName: string;
  onOpenChange: (open: boolean) => void;
  onSubjectNameChange: (name: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const SubjectNameDialog = ({
  open,
  subjectName,
  onOpenChange,
  onSubjectNameChange,
  onSubmit,
  onCancel,
}: SubjectNameDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border border-border/40 bg-background/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle>Subject Information</DialogTitle>
          <DialogDescription>
            Enter the participant's name to begin the session.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="subject-name">Subject Name</Label>
            <Input
              id="subject-name"
              placeholder="Enter subject name..."
              value={subjectName}
              onChange={(e) => onSubjectNameChange(e.target.value)}
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
