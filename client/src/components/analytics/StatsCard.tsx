import React from 'react';
import { Card, CardContent, Stack, Typography } from '@mui/material';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  description?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  icon, 
  color = 'primary.main',
  description
}) => {
  return (
    <Card sx={{ 
      height: '100%',
      bgcolor: 'rgba(255, 255, 255, 0.02)', 
      border: '1px solid rgba(255, 255, 255, 0.05)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Box sx={{ 
            p: 1, 
            borderRadius: 1, 
            bgcolor: `${color}15`, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            {React.cloneElement(icon as React.ReactElement, { color, size: 24 })}
          </Box>
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 'medium' }}>
            {title}
          </Typography>
        </Stack>
        
        <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
          {value}
        </Typography>
        
        {description && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {description}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

import { Box } from '@mui/material';
