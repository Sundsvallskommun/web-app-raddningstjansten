import DialogTitle from "@mui/material/DialogTitle";
import Dialog from "@mui/material/Dialog";
import { Me } from "@/api/api-service";
import { DialogContent, Typography } from "@mui/material";

export interface SimpleDialogProps {
  open: boolean;
  onClose: () => void;
  user: Me | null;
}

export const ProfileDialog = ({ onClose, open, user }: SimpleDialogProps) => {
  const handleClose = () => {
    onClose();
  };

  const adminContent =
    user?.type === "admin" ? (
      <>
        <Typography gutterBottom>{user?.username}</Typography>
        <Typography gutterBottom>{user?.email}</Typography>
        {user?.groups?.map((g, i) => {
          <Typography key={i} gutterBottom>{`Grupp: ${g}`}</Typography>;
        })}
        <Typography gutterBottom>{user?.employee?.company}</Typography>
        <Typography gutterBottom>{user?.employee?.workPhone}</Typography>
        <Typography gutterBottom>{user?.employee?.mobilePhone}</Typography>
      </>
    ) : null;

  const citizenContent =
    user?.type === "citizen" ? (
      <>
        <Typography gutterBottom>{user?.citizen?.city}</Typography>
      </>
    ) : null;

  return (
    <Dialog onClose={handleClose} open={open}>
      <DialogTitle>{`Profil - ${user?.name}`}</DialogTitle>
      <DialogContent dividers>
        <Typography gutterBottom>{user?.name}</Typography>
        <Typography gutterBottom>{user?.maskedPersonNumber}</Typography>
        {adminContent}
        {citizenContent}
      </DialogContent>
    </Dialog>
  );
};
