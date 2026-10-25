import React from 'react';
import { Box, Typography } from '@mui/material';
import { ScoringCheckbox } from './ScoringCheckbox';

interface AnswerScorerProps {
  label: string;
  isCorrect: boolean;
  onToggle: () => void;
  compact?: boolean;
}

export const AnswerScorer: React.FC<AnswerScorerProps> = ({ 
  label, 
  isCorrect, 
  onToggle,
  compact = false
}) => {
  return (
    <Box 
      onClick={onToggle}
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        p: compact ? 0.5 : 1, 
        cursor: 'pointer',
        borderRadius: 1,
        border: '1px solid',
        borderColor: isCorrect ? 'success.main' : '#333',
        bgcolor: isCorrect ? 'rgba(76, 175, 80, 0.05)' : 'transparent',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
        transition: 'all 0.2s ease'
      }}
    >
      <ScoringCheckbox 
        checked={isCorrect}
        onChange={onToggle}
      />
      <Typography 
        variant="body2" 
        noWrap 
        sx={{ 
          ml: 1, 
          color: isCorrect ? 'success.light' : 'text.primary',
          fontWeight: isCorrect ? 'bold' : 'normal'
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};
