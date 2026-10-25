import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography
} from '@mui/material';
import { Event } from '../../types';

interface FormData {
  title: string;
  date: string;
  location: string;
  game_mode: 'pub' | 'speed';
  digital_input: boolean;
}

interface EventFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (formData: FormData) => void;
  initialData: Event | null;
}

export const EventFormDialog: React.FC<EventFormDialogProps> = ({ 
  open, 
  onClose, 
  onSave, 
  initialData 
}) => {
  const [formData, setFormData] = React.useState<FormData>({ 
    title: '', 
    date: '', 
    location: '', 
    game_mode: 'pub',
    digital_input: false
  });

  React.useEffect(() => {
    if (initialData) {
      // Migrate legacy 'analog'/'digital' to 'pub'
      const mode = (initialData.game_mode === 'analog' || initialData.game_mode === 'digital' || initialData.game_mode === 'pub') ? 'pub' : 'speed';
      setFormData({ 
        title: initialData.title, 
        date: new Date(initialData.date).toISOString().slice(0, 16), 
        location: initialData.location,
        game_mode: mode as 'pub' | 'speed',
        digital_input: !!(initialData.digital_input || initialData.game_mode === 'digital')
      });
    } else {
      setFormData({ title: '', date: '', location: '', game_mode: 'pub', digital_input: false });
    }
  }, [initialData, open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{initialData ? 'Edit Event' : 'Create New Event'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <TextField
          autoFocus
          margin="dense"
          label="Event Title"
          fullWidth
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
        <TextField
          margin="dense"
          label="Date"
          type="datetime-local"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
        />
        <TextField
          margin="dense"
          label="Location"
          fullWidth
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
        />
        <FormControl fullWidth margin="dense">
          <InputLabel id="game-mode-label">Game Mode</InputLabel>
          <Select
            labelId="game-mode-label"
            value={formData.game_mode}
            label="Game Mode"
            onChange={(e) => setFormData({ ...formData, game_mode: e.target.value as 'pub' | 'speed' })}
          >
            <MenuItem value="pub">Pub Mode</MenuItem>
            <MenuItem value="speed">Speed Round</MenuItem>
          </Select>
        </FormControl>

        {formData.game_mode === 'pub' && (
          <Box sx={{ px: 1, py: 1.5, border: '1px solid #333', borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.digital_input}
                  onChange={(e) => setFormData({ ...formData, digital_input: e.target.checked })}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Digital Input</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Players submit answers from their phones
                  </Typography>
                </Box>
              }
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(formData)} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};
