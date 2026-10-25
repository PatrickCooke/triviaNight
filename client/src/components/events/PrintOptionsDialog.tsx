import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  FormControl, 
  RadioGroup, 
  FormControlLabel, 
  Radio, 
  Divider 
} from '@mui/material';
import { Printer } from 'lucide-react';

interface PrintOptionsDialogProps {
  open: boolean;
  onClose: () => void;
  onPrint: (mode: string) => void;
}

export const PrintOptionsDialog: React.FC<PrintOptionsDialogProps> = ({ 
  open, 
  onClose, 
  onPrint 
}) => {
  const [printMode, setPrintMode] = React.useState('questions');

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Print Options</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }} color="text.secondary">
          Choose the type of document you want to generate.
        </Typography>
        <FormControl component="fieldset">
          <RadioGroup value={printMode} onChange={(e) => setPrintMode(e.target.value)}>
            <FormControlLabel value="questions" control={<Radio />} label="Questions Only" />
            <FormControlLabel value="answers" control={<Radio />} label="Questions + Correct Answers" />
            <FormControlLabel value="full" control={<Radio />} label="Full Take-Home (Include Distractors)" />
            <Divider sx={{ my: 1 }} />
            <FormControlLabel value="scoresheets" control={<Radio />} label="Participant Score Sheets (Half-Page)" />
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={() => onPrint(printMode)} variant="contained" startIcon={<Printer />}>
          Generate PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
};
