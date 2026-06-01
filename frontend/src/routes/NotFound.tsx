import { Box, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <Box sx={{ textAlign: 'center', mt: 10 }}>
      <Typography variant="h3" gutterBottom>
        404
      </Typography>
      <Typography color="text.secondary" gutterBottom>
        Sidan kunde inte hittas.
      </Typography>
      <Button component={Link} to="/" variant="contained" sx={{ mt: 2 }}>
        Till startsidan
      </Button>
    </Box>
  );
}
