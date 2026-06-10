import { theme } from "@/theme";
import { Box, Typography } from "@mui/material";
import { ReactNode } from "react";

type PdfDownloadButtonProps = {
  icon: ReactNode;
  label: string;
  /** Imported PDF asset URL. */
  href: string;
  /** Download filename; defaults to the label. */
  fileName?: string;
};

/** Outlined chip that downloads a bundled PDF when clicked. */
const PdfDownloadButton = ({ icon, label, href, fileName }: PdfDownloadButtonProps) => {
  return (
    <Box
      component='a'
      href={href}
      download={fileName ?? `${label}.pdf`}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        py: 1,
        px: 2,
        borderRadius: 1,
        cursor: "pointer",
        textDecoration: "none",
        border: `1px solid ${theme.palette.info.main}`,
        color: theme.palette.info.main,
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      <Typography variant='caption'>{label}</Typography>
    </Box>
  );
};

export default PdfDownloadButton;
