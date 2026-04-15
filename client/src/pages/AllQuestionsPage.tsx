import React, { useEffect, useState } from 'react';
import { 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Chip,
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import { Search, Plus, Edit2, Trash2, FileUp } from 'lucide-react';

interface Question {
  id: number;
  type: string;
  category: string;
  prompt: string;
  content: any;
  media_url?: string;
}

export default function AllQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [search, setSearch] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkData, setBulkData] = useState('');

  const fetchAllQuestions = async () => {
    const res = await fetch('/api/questions');
    setQuestions(await res.json());
  };

  useEffect(() => {
    fetchAllQuestions();
  }, []);

  const handleBulkImport = async () => {
    try {
      const parsed = JSON.parse(bulkData);
      await fetch('/api/questions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: parsed }),
      });
      setBulkOpen(false);
      setBulkData('');
      fetchAllQuestions();
    } catch (e) {
      alert('Invalid JSON format');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Permanently delete this question from the bank?')) {
      await fetch(`/api/questions/${id}`, { method: 'DELETE' });
      fetchAllQuestions();
    }
  };

  const filtered = questions.filter(q => 
    q.prompt.toLowerCase().includes(search.toLowerCase()) ||
    q.type.toLowerCase().includes(search.toLowerCase()) ||
    (q.category || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h4">Question Bank</Typography>
        <Button variant="outlined" startIcon={<FileUp />} onClick={() => setBulkOpen(true)}>
          Bulk Import (JSON)
        </Button>
      </Stack>
      
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search prompts, types, or categories..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search size={20} />
            </InputAdornment>
          ),
        }}
      />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Category</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Prompt</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((q) => (
              <TableRow key={q.id}>
                <TableCell>
                  <Chip label={q.category || 'Uncategorized'} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Chip label={q.type} size="small" color="primary" />
                </TableCell>
                <TableCell sx={{ maxWidth: 400 }}>{q.prompt}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <IconButton color="error" onClick={() => handleDelete(q.id)}><Trash2 size={18} /></IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Bulk Import Dialog */}
      <Dialog open={bulkOpen} onClose={() => setBulkOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Bulk Import Questions (JSON)</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Paste a JSON array of questions. Format:
            <pre style={{ background: '#333', padding: 8, borderRadius: 4 }}>
{`[
  {
    "type": "multiple_choice",
    "category": "Science",
    "prompt": "What is 2+2?",
    "content": { "correct": "4", "distractors": ["1", "2", "3"] }
  }
]`}
            </pre>
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={10}
            placeholder='[{"type": "multiple_choice", ...}]'
            value={bulkData}
            onChange={(e) => setBulkData(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkOpen(false)}>Cancel</Button>
          <Button onClick={handleBulkImport} variant="contained" disabled={!bulkData}>Import</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
