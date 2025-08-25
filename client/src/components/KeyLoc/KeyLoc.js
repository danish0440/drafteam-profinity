import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent
} from '@mui/material';
import {
  Construction
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const KeyLoc = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Please log in to access Key&Loc tools.</Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
      <Card elevation={2} sx={{ p: 4, textAlign: 'center' }}>
        <CardContent>
          <Construction sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Under Construction
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Key&Loc Tools
          </Typography>
          <Typography variant="body1" color="text.secondary">
            OSM to DXF conversion tools are currently under development.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default KeyLoc;