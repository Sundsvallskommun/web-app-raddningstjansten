import { Alert, AlertTitle, Typography } from "@mui/material";
import { ReactNode } from "react";

type DemoAlertProps = { title: string; children?: ReactNode; mt?: number };

const DemoAlert = ({ title, children, mt = 2 }: DemoAlertProps) => {
  return (
    <Alert variant='outlined' sx={{ mt }} severity='info'>
      <AlertTitle>{title}</AlertTitle>
      <Typography>
        Detta är en demo-applikation. Uppdateringar kommer göras över tid.
      </Typography>
      <Typography>
        Ingen känslig data exponeras i applikationen och databasen rensas varje
        natt.
      </Typography>
      {children}
    </Alert>
  );
};

export default DemoAlert;
