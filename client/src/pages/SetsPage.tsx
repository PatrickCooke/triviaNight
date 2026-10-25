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
  Chip,
  CircularProgress,
  Box
} from '@mui/material';
import { Trash2, Plus, MessageCircleQuestion, Edit2 } from 'lucide-react';
import QuestionsPage from './QuestionsPage';
import { useSets } from '../hooks/useSets';
import { Set } from '../types';
import { PageHeader } from '../components/layout/PageHeader';

export default function SetsPage() {
  const { sets, loading, saveSet, deleteSet } = useSets();
  const [open, setOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<Set | null>(null);
  const [formData, setFormData] = useState({ name: '', category: '', description: '' });
  const [viewingQuestions, setViewingQuestions] = useState<{ id: number; name: string } | null>(null);

  const handleOpenCreate = () => {
    setEditingSet(null);
    setFormData({ name: '', category: '', description: '' });
    setOpen(true);
  };

  const handleOpenEdit = (set: Set) => {
    setEditingSet(set);
    setFormData({ name: set.name, category: set.category || '', description: set.description || '' });
    setOpen(true);
  };

  const handleSave = async () => {
    await saveSet({ ...editingSet, ...formData });
    setOpen(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure? This will only delete the Set, not the Questions in the bank.')) {
      await deleteSet(id);
    }
  };

  if (viewingQuestions) {
    return (
      <QuestionsPage 
        setId={viewingQuestions.id} 
        setName={viewingQuestions.name} 
        onBack={() => setViewingQuestions(null)} 
      />
    );
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <PageHeader 
        title="Question Sets" 
        actions={
          <Button variant="contained" startIcon={<Plus />} onClick={handleOpenCreate}>
            New Set
          </Button>
        }
      />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sets.map((set) => (
              <TableRow key={set.id}>
                <TableCell>{set.name}</TableCell>
                <TableCell>
                  {set.category && <Chip label={set.category} size="small" variant="outlined" />}
                </TableCell>
                <TableCell>{set.description}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <IconButton color="info" onClick={() => setViewingQuestions({ id: set.id, name: set.name })}>
                      <MessageCircleQuestion size={18} />
                    </IconButton>
                    <IconButton color="primary" onClick={() => handleOpenEdit(set)}>
                      <Edit2 size={18} />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDelete(set.id)}>
                      <Trash2 size={18} />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>{editingSet ? 'Edit Set' : 'Create New Set'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Set Name"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Set Category"
            fullWidth
            placeholder="e.g. History, Bible, Sports"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
