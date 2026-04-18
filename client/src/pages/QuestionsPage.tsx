import React, { useEffect, useState } from 'react';
import { 
  Typography, 
  Button, 
  Paper, 
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Autocomplete
} from '@mui/material';
import { Trash2, Plus, ArrowLeft, Edit2, Link as LinkIcon } from 'lucide-react';
import QuestionEditor from '../components/QuestionEditor';

interface Question {
  id: number;
  type: 'multi_part' | 'multiple_choice' | 'matching';
  category: string;
  prompt: string;
  content: any;
  media_url?: string;
}

interface Props {
  setId: number;
  setName: string;
  onBack: () => void;
}

export default function QuestionsPage({ setId, setName, onBack }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allBankQuestions, setAllBankQuestions] = useState<Question[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  
  const fetchQuestions = async () => {
    const res = await fetch(`/api/sets/${setId}/questions`);
    setQuestions(await res.json());
  };

  const fetchBank = async () => {
    const res = await fetch('/api/questions');
    setAllBankQuestions(await res.json());
  };

  useEffect(() => {
    fetchQuestions();
    fetchBank();
  }, [setId]);

  const handleOpenCreate = () => {
    setEditingQuestion(null);
    setEditorOpen(true);
  };

  const handleOpenEdit = (q: Question) => {
    setEditingQuestion(q);
    setEditorOpen(true);
  };

  const handleSaveQuestion = async (qData: any) => {
    const isNew = !qData.id;
    const url = isNew ? '/api/questions' : `/api/questions/${qData.id}`;
    const method = isNew ? 'POST' : 'PUT';
    
    // If it's new and we're in a set view, pass setId to link it automatically
    const payload = isNew ? { ...qData, setId } : qData;

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setEditorOpen(false);
    fetchQuestions();
  };

  const handleUnlink = async (qId: number) => {
    if (confirm('Remove this question from this set?')) {
      await fetch(`/api/sets/${setId}/questions/${qId}`, { method: 'DELETE' });
      fetchQuestions();
    }
  };

  const handleLinkExisting = async (qId: number) => {
    await fetch(`/api/sets/${setId}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: qId }),
    });
    setPickOpen(false);
    fetchQuestions();
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <IconButton onClick={onBack}><ArrowLeft /></IconButton>
        <Typography variant="h4">{setName}: Questions</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="outlined" startIcon={<LinkIcon />} onClick={() => setPickOpen(true)} sx={{ mr: 1 }}>
          Pick from Bank
        </Button>
        <Button variant="contained" startIcon={<Plus />} onClick={handleOpenCreate}>
          Create New
        </Button>
      </Stack>

      <Stack spacing={2}>
        {questions.map((q) => (
          <Card key={q.id}>
            <CardContent>
              <Stack direction="row" spacing={2}>
                {q.media_url && (
                  <Box sx={{ width: 80, height: 80, borderRadius: 1, overflow: 'hidden' }}>
                    <img src={q.media_url} alt="media" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </Box>
                )}
                <Box sx={{ flexGrow: 1 }}>
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <Chip label={q.type.replace('_', ' ')} size="small" color="primary" />
                    {q.category && <Chip label={q.category} size="small" variant="outlined" />}
                  </Stack>
                  <Typography variant="h6">{q.prompt}</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <IconButton color="primary" onClick={() => handleOpenEdit(q)}><Edit2 size={18} /></IconButton>
                  <IconButton color="error" onClick={() => handleUnlink(q.id)}><Trash2 size={18} /></IconButton>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
        {questions.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'transparent', border: '1px dashed grey' }}>
            <Typography color="text.secondary">No questions in this set.</Typography>
          </Paper>
        )}
      </Stack>

      <QuestionEditor 
        open={editorOpen} 
        onClose={() => setEditorOpen(false)} 
        onSave={handleSaveQuestion} 
        initialData={editingQuestion} 
      />

      {/* Pick from Bank Dialog */}
      <Dialog open={pickOpen} onClose={() => setPickOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Existing Question from Bank</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={allBankQuestions.filter(q => !questions.find(sq => sq.id === q.id))}
            getOptionLabel={(q) => `[${q.category || 'No Category'}] ${q.prompt}`}
            onChange={(_, newValue) => newValue && handleLinkExisting(newValue.id)}
            renderInput={(params) => <TextField {...params} label="Search Question Bank" sx={{ mt: 2 }} />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPickOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
