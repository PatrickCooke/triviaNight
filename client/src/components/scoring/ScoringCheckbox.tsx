import React from 'react';
import { Checkbox } from '@mui/material';
import { CheckSquare } from 'lucide-react';

interface ScoringCheckboxProps {
  checked: boolean;
  onChange: () => void;
  size?: 'small' | 'medium';
}

export const ScoringCheckbox: React.FC<ScoringCheckboxProps> = ({ 
  checked, 
  onChange, 
  size = 'small' 
}) => {
  return (
    <Checkbox 
      size={size}
      checked={checked}
      onChange={(e) => {
        e.stopPropagation();
        onChange();
      }}
      checkedIcon={<CheckSquare color="#4caf50" />}
      icon={<CheckSquare color="#444" />}
    />
  );
};
