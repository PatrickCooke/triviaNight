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
  IconButton
} from '@mui/material';
import { Trash2, Plus } from 'lucide-react';

interface Event {
  id: number;
  title: string;
  date: string;
  location: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [open, setOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', location: '' });

  const fetchEvents = async () => {
    const res = await fetch('/api/events');
    const data = await res.json();
    setEvents(data);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreate = async () => {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEvent),
    });
    setOpen(false);
    setNewEvent({ title: '', date: '', location: '' });
    fetchEvents();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/events/${id}`, { method: 'DELETE' });
    fetchEvents();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Typography variant="h4">Events</Typography>
        <Button variant="contained" startIcon={<Plus />} onClick={() => setOpen(true)}>
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
                <TableCell>{new Date(event.date).toLocaleDateString()}</TableCell>
                <TableCell>{event.location}</TableCell>
                <TableCell align="right">
                  <IconButton color="error" onClick={() => handleDelete(event.id)}>
                    <Trash2 size={18} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Create New Event</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Event Title"
            fullWidth
            value={newEvent.title}
            onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Date"
            type="datetime-local"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={newEvent.date}
            onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Location"
            fullWidth
            value={newEvent.location}
            onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
