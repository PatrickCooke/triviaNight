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
  InputAdornment
} from '@mui/material';
import { Search } from 'lucide-react';

interface Question {
  id: number;
  set_id: number;
  type: string;
  prompt: string;
  content: any;
}

export default function AllQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [search, setSearch] = useState('');

  const fetchAllQuestions = async () => {
    // We'll add a specific "all questions" endpoint to the server for efficiency
    const res = await fetch('/api/questions');
    const data = await res.json();
    setQuestions(data);
  };

  useEffect(() => {
    fetchAllQuestions();
  }, []);

  const filtered = questions.filter(q => 
    q.prompt.toLowerCase().includes(search.toLowerCase()) ||
    q.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Database: All Questions</Typography>
      
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search prompts or types..."
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
              <TableCell>ID</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Prompt</TableCell>
              <TableCell>Preview</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((q) => (
              <TableRow key={q.id}>
                <TableCell>{q.id}</TableCell>
                <TableCell>
                  <Chip label={q.type} size="small" variant="outlined" />
                </TableCell>
                <TableCell sx={{ maxWidth: 400 }}>{q.prompt}</TableCell>
                <TableCell color="text.secondary">
                  {q.type === 'multiple_choice' ? q.content.correct : q.content.answers?.[0] || 'Matching...'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
