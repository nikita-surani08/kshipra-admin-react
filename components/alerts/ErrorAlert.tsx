import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import type { SyntheticEvent } from "react";

interface ErrorAlertProps {
  message: string;
  open: boolean;
  onClose: (event?: SyntheticEvent | Event, reason?: string) => void;
  autoHideDuration?: number;
}

const ErrorAlert = ({
  message,
  open,
  onClose,
  autoHideDuration = 6000,
}: ErrorAlertProps) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
    >
      <Alert onClose={onClose} severity="error" variant="filled" sx={{ width: "100%" }}>
        {message}
      </Alert>
    </Snackbar>
  );
};

export default ErrorAlert;
