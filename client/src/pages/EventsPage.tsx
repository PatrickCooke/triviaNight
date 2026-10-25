import React, { useState } from 'react';
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
  Stack,
  Autocomplete,
  Chip,
  Divider,
  Box,
  CircularProgress
} from '@mui/material';
import { Trash2, Plus, Edit2, Layers, Gauge, ClipboardList } from 'lucide-react';
import EventDashboard from './EventDashboard';
import TeamScorer from './TeamScorer';
import { useEvents } from '../hooks/useEvents';
import { useSets } from '../hooks/useSets';
import { Event, Set } from '../types';
import { PageHeader } from '../components/layout/PageHeader';
import { ManageSetsDialog } from '../components/events/ManageSetsDialog';
import { EventFormDialog } from '../components/events/EventFormDialog';

export default function EventsPage() {
  const { events, loading: eventsLoading, saveEvent, deleteEvent } = useEvents();
  const { sets } = useSets();

  const [open, setOpen] = useState(false);
  const [manageSetsOpen, setManageSetsOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [viewingDashboard, setViewingDashboard] = useState<Event | null>(null);
  const [viewingTeamScorer, setViewingTeamScorer] = useState<Event | null>(null);

  const handleOpenCreate = () => {
    setEditingEvent(null);
    setOpen(true);
  };

  const handleOpenEdit = (event: Event) => {
    setEditingEvent(event);
    setOpen(true);
  };

  const handleSave = async (formData: any) => {
    await saveEvent({ ...editingEvent, ...formData });
    setOpen(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this event?')) {
      await deleteEvent(id);
    }
  };

  const handleManageSets = (event: Event) => {
    setActiveEvent(event);
    setManageSetsOpen(true);
  };

  if (viewingDashboard) {
    return <EventDashboard event={viewingDashboard} onBack={() => setViewingDashboard(null)} />;
  }

  if (viewingTeamScorer) {
    return <TeamScorer event={viewingTeamScorer} onBack={() => setViewingTeamScorer(null)} />;
  }

  if (eventsLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <PageHeader 
        title="Events" 
        actions={
          <Button variant="contained" startIcon={<Plus />} onClick={handleOpenCreate}>
            New Event
          </Button>
        }
      />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Mode</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell>{event.title}</TableCell>
                <TableCell>{new Date(event.date).toLocaleString()}</TableCell>
                <TableCell>{event.location}</TableCell>
                <TableCell>
                  <Chip 
                    label={
                      event.game_mode === 'speed' ? 'Speed Round' 
                      : event.digital_input ? 'Pub (Digital)' 
                      : 'Pub Mode'
                    } 
                    size="small" 
                    color={event.game_mode === 'speed' ? 'warning' : event.digital_input ? 'secondary' : 'primary'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <IconButton color="warning" onClick={() => setViewingTeamScorer(event)} title="Team Score Sheets">
                      <ClipboardList size={18} />
                    </IconButton>
                    <IconButton color="success" onClick={() => setViewingDashboard(event)} title="Event Dashboard">
                      <Gauge size={18} />
                    </IconButton>
                    <IconButton color="info" onClick={() => handleManageSets(event)} title="Manage Rounds">
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

      <EventFormDialog 
        open={open}
        onClose={() => setOpen(false)}
        onSave={handleSave}
        initialData={editingEvent}
      />

      <ManageSetsDialog 
        open={manageSetsOpen}
        onClose={() => setManageSetsOpen(false)}
        event={activeEvent}
        allSets={sets}
      />
    </Box>
  );
}
