import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  TextField 
} from '@mui/material';

interface BulkImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (bulkData: string) => void;
}

export const BulkImportDialog: React.FC<BulkImportDialogProps> = ({ 
  open, 
  onClose, 
  onImport 
}) => {
  const [bulkData, setBulkData] = React.useState('');

  const handleImport = () => {
    onImport(bulkData);
    setBulkData('');
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Bulk Import Questions (JSON)</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Paste a JSON array of questions. Format:
          <pre style={{ background: '#333', padding: 8, borderRadius: 4, fontSize: '0.8rem', overflowX: 'auto' }}>
{`[
  {
    "type": "multiple_choice",
    "category": "Science",
    "prompt": "What is 2+2?",
    "content": { "correct": "4", "distractors": ["1", "2", "3"] }
  },
  {
    "type": "multi_part",
    "category": "Art",
    "prompt": "Name the primary colors.",
    "content": { "answers": ["Red", "Blue", "Yellow"] }
  },
  {
    "type": "matching",
    "category": "Geography",
    "prompt": "Match country to capital.",
    "content": { 
      "pairs": [
        {"left": "France", "right": "Paris"},
        {"left": "Japan", "right": "Tokyo"}
      ] 
    }
  },
  {
    "type": "sequencing",
    "category": "Nature",
    "prompt": "Order by size (small to large).",
    "content": { "items": ["Mouse", "Dog", "Elephant"] }
  }
]`}
          </pre>
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={10}
          placeholder='[{"type": "multiple_choice", ...}, {"type": "multi_part", ...}]'
          value={bulkData}
          onChange={(e) => setBulkData(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleImport} variant="contained" disabled={!bulkData}>Import</Button>
      </DialogActions>
    </Dialog>
  );
};
