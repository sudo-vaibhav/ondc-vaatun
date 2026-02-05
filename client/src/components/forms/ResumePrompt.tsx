import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ResumePromptProps {
  open: boolean;
  onResume: () => void;
  onStartFresh: () => void;
}

export function ResumePrompt({
  open,
  onResume,
  onStartFresh,
}: ResumePromptProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onStartFresh()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resume where you left off?</DialogTitle>
          <DialogDescription>
            We found your previously entered information. Would you like to
            continue from where you stopped, or start fresh?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onStartFresh}
            className="w-full sm:w-auto"
          >
            Start Fresh
          </Button>
          <Button onClick={onResume} className="w-full sm:w-auto">
            Resume
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
