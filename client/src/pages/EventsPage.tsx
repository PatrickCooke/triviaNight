import React, { useEffect, useState } from 'react';
import { 
  Typography, 
  Button, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Box,
  Stack,
  Autocomplete,
  Chip,
  Divider
} from '@mui/material';
import { Trash2, Plus, Edit2, Layers } from 'lucide-react';

interface Event {
  id: number;
  title: string;
  date: string;
  location: string;
}

interface Set {
  id: number;
  name: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [sets, setSets] = useState<Set[]>([]);
  const [open, setOpen] = useState(false);
  const [manageSetsOpen, setManageSetsOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [eventSets, setEventSets] = useState<Set[]>([]);
  
  const [formData, setFormData] = useState({ title: '', date: '', location: '' });

  const fetchData = async () => {
    const [evRes, setRes] = await Promise.all([
      fetch('/api/events'),
      fetch('/api/sets')
    ]);
    setEvents(await evRes.json());
    setSets(await setRes.json());
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setEditingEvent(null);
    setFormData({ title: '', date: '', location: '' });
    setOpen(true);
  };

  const handleOpenEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({ 
      title: event.title, 
      date: new Date(event.date).toISOString().slice(0, 16), 
      location: event.location 
    });
    setOpen(true);
  };

  const handleSave = async () => {
    const url = editingEvent ? `/api/events/${editingEvent.id}` : '/api/events';
    const method = editingEvent ? 'PUT' : 'POST';
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    setOpen(false);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this event?')) {
      await fetch(`/api/events/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const handleManageSets = async (event: Event) => {
    setActiveEvent(event);
    const res = await fetch(`/api/events/${event.id}/sets`);
    setEventSets(await res.json());
    setManageSetsOpen(true);
  };

  const addSetToEvent = async (setId: number) => {
    if (!activeEvent) return;
    await fetch(`/api/events/${activeEvent.id}/sets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ set_id: setId }),
    });
    handleManageSets(activeEvent);
  };

  const removeSetFromEvent = async (setId: number) => {
    if (!activeEvent) return;
    await fetch(`/api/events/${activeEvent.id}/sets/${setId}`, { method: 'DELETE' });
    handleManageSets(activeEvent);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Typography variant="h4">Events</Typography>
        <Button variant="contained" startIcon={<Plus />} onClick={handleOpenCreate}>
          New Event
        </Button>
      </div>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Location</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell>{event.title}</TableCell>
                <TableCell>{new Date(event.date).toLocaleString()}</TableCell>
                <TableCell>{event.location}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <IconButton color="info" onClick={() => handleManageSets(event)}>
                      <Layers size={18} />
                    </IconButton>
                    <IconButton color="primary" onClick={() => handleOpenEdit(event)}>
                      <Edit2 size={18} />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDelete(event.id)}>
                      <Trash2 size={18} />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit/Create Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>{editingEvent ? 'Edit Event' : 'Create New Event'}</DialogTitle>
        <DialogContent>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Manage Sets Dialog */}
      <Dialog open={manageSetsOpen} onClose={() => setManageSetsOpen(false)} fullWidth>
        <DialogTitle>Manage Sets for: {activeEvent?.title}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>Assigned Sets</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {eventSets.map(s => (
                <Chip 
                  key={s.id} 
                  label={s.name} 
                  onDelete={() => removeSetFromEvent(s.id)}
                  color="primary"
                />
              ))}
              {eventSets.length === 0 && <Typography variant="body2" color="text.secondary">No sets assigned yet.</Typography>}
            </Stack>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Autocomplete
            options={sets.filter(s => !eventSets.find(es => es.id === s.id))}
            getOptionLabel={(option) => option.name}
            onChange={(_, newValue) => newValue && addSetToEvent(newValue.id)}
            renderInput={(params) => <TextField {...params} label="Add a Set to this Event" />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageSetsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
