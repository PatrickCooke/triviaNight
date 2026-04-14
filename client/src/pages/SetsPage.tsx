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
import { Trash2, Plus, MessageCircleQuestion } from 'lucide-react';

interface Set {
  id: number;
  name: string;
  description: string;
}

export default function SetsPage() {
  const [sets, setSets] = useState<Set[]>([]);
  const [open, setOpen] = useState(false);
  const [newSet, setNewSet] = useState({ name: '', description: '' });

  const fetchSets = async () => {
    const res = await fetch('/api/sets');
    const data = await res.json();
    setSets(data);
  };

  useEffect(() => {
    fetchSets();
  }, []);

  const handleCreate = async () => {
    await fetch('/api/sets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSet),
    });
    setOpen(false);
    setNewSet({ name: '', description: '' });
    fetchSets();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/sets/${id}`, { method: 'DELETE' });
    fetchSets();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Typography variant="h4">Question Sets</Typography>
        <Button variant="contained" startIcon={<Plus />} onClick={() => setOpen(true)}>
          New Set
        </Button>
      </div>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sets.map((set) => (
              <TableRow key={set.id}>
                <TableCell>{set.name}</TableCell>
                <TableCell>{set.description}</TableCell>
                <TableCell align="right">
                  <IconButton color="primary">
                    <MessageCircleQuestion size={18} />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDelete(set.id)}>
                    <Trash2 size={18} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Create New Set</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Set Name (e.g., 'General Trivia')"
            fullWidth
            value={newSet.name}
            onChange={(e) => setNewSet({ ...newSet, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={2}
            value={newSet.description}
            onChange={(e) => setNewSet({ ...newSet, description: e.target.value })}
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
