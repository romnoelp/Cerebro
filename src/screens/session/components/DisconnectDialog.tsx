import { IconWifiOff } from "@tabler/icons-react";
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/animate-ui/components/base/dialog";
import { Button } from "@/components/ui/button";

interface DisconnectDialogProps {
  open: boolean;
  sampleCount: number;
  onSaveAndEnd: () => void;
}

export const DisconnectDialog = ({
  open,
  sampleCount,
  onSaveAndEnd,
}: DisconnectDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogPopup
        className="sm:max-w-md border border-border/40 bg-background/95 backdrop-blur-sm"
        showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <IconWifiOff className="size-4 text-destructive shrink-0" />
            <DialogTitle>Headset Disconnected</DialogTitle>
          </div>
          <DialogDescription>
            The headset lost connection mid-session.{" "}
            {sampleCount > 0 ? (
              <>
                <span className="font-medium text-foreground">
                  {sampleCount} sample{sampleCount === 1 ? "" : "s"}
                </span>{" "}
                recorded up to this point will be saved.
              </>
            ) : (
              "No samples were recorded."
            )}
          </DialogDescription>
        </DialogHeader>
        <Button onClick={onSaveAndEnd} className="w-full mt-1">
          {sampleCount > 0 ? "Save & End Session" : "End Session"}
        </Button>
      </DialogPopup>
    </Dialog>
  );
};
