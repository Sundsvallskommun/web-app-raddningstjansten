import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { Info } from "@mui/icons-material";
import DemoAlert from "./DemoAlert";

/**
 * Self-contained "Information" button that opens a dialog with the demo notice
 * (DemoAlert). Manages its own open state, so it can be dropped into any page —
 * used on both login pages (/admin and citizen).
 */
const DemoInfoDialog = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant='outlined'
        size='small'
        startIcon={<Info />}
        color='info'
        onClick={() => setOpen(true)}
      >
        Information
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth='xs'
        fullWidth
      >
        <DialogTitle>Information</DialogTitle>
        <DialogContent>
          <DemoAlert title='Demo-applikation' mt={0} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Stäng</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DemoInfoDialog;
