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
  MenuItem,
  Stack,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import { Trash2, Plus, ArrowLeft, Edit2 } from 'lucide-react';

interface Question {
  id: number;
  set_id: number;
  type: 'multi_part' | 'multiple_choice' | 'matching';
  prompt: string;
  content: any;
}

interface Props {
  setId: number;
  setName: string;
  onBack: () => void;
}

export default function QuestionsPage({ setId, setName, onBack }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [open, setOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  
  const [type, setType] = useState<'multi_part' | 'multiple_choice' | 'matching'>('multiple_choice');
  const [prompt, setPrompt] = useState('');
  const [content, setContent] = useState<any>({});

  const fetchQuestions = async () => {
    const res = await fetch(`/api/sets/${setId}/questions`);
    const data = await res.json();
    setQuestions(data);
  };

  useEffect(() => {
    fetchQuestions();
  }, [setId]);

  const handleOpenCreate = () => {
    setEditingQuestion(null);
    setType('multiple_choice');
    setPrompt('');
    setContent({ correct: '', distractors: ['', '', ''], answers: [''], pairs: [{ left: '', right: '' }] });
    setOpen(true);
  };

  const handleOpenEdit = (q: Question) => {
    setEditingQuestion(q);
    setType(q.type);
    setPrompt(q.prompt);
    setContent(q.content);
    setOpen(true);
  };

  const handleSave = async () => {
    const url = editingQuestion ? `/api/questions/${editingQuestion.id}` : '/api/questions';
    const method = editingQuestion ? 'PUT' : 'POST';
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ set_id: setId, type, prompt, content }),
    });
    setOpen(false);
    fetchQuestions();
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this question?')) {
      await fetch(`/api/questions/${id}`, { method: 'DELETE' });
      fetchQuestions();
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <IconButton onClick={onBack}><ArrowLeft /></IconButton>
        <Typography variant="h4">{setName}: Questions</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" startIcon={<Plus />} onClick={handleOpenCreate}>
          Add Question
        </Button>
      </Stack>

      <Stack spacing={2}>
        {questions.map((q) => (
          <Card key={q.id}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between">
                <Box sx={{ flexGrow: 1 }}>
                  <Chip label={q.type.replace('_', ' ')} size="small" color="primary" sx={{ mb: 1 }} />
                  <Typography variant="h6">{q.prompt}</Typography>
                  <Box sx={{ mt: 1, color: 'text.secondary', fontSize: '0.9rem' }}>
                    {q.type === 'multiple_choice' && (
                      <Typography variant="body2">Correct: <b>{q.content.correct}</b> | Others: {q.content.distractors.join(', ')}</Typography>
                    )}
                    {q.type === 'multi_part' && (
                      <Typography variant="body2">Answers: <b>{q.content.answers.join(', ')}</b></Typography>
                    )}
                    {q.type === 'matching' && (
                      <Typography variant="body2">Pairs: {q.content.pairs.map((p: any) => `${p.left}→${p.right}`).join(', ')}</Typography>
                    )}
                  </Box>
                </Box>
                <Stack direction="row" spacing={1}>
                  <IconButton color="primary" onClick={() => handleOpenEdit(q)}><Edit2 size={18} /></IconButton>
                  <IconButton color="error" onClick={() => handleDelete(q.id)}><Trash2 size={18} /></IconButton>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingQuestion ? 'Edit Question' : 'New Question'}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select value={type} label="Type" onChange={(e) => setType(e.target.value as any)}>
                <MenuItem value="multiple_choice">Multiple Choice</MenuItem>
                <MenuItem value="multi_part">Multi-Part</MenuItem>
                <MenuItem value="matching">Matching/Sequencing</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Question Prompt"
              multiline
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />

            {/* Content Editors */}
            {type === 'multiple_choice' && (
              <Stack spacing={2}>
                <TextField label="Correct Answer" fullWidth value={content.correct} onChange={(e) => setContent({...content, correct: e.target.value})} />
                {content.distractors?.map((d: string, i: number) => (
                  <TextField 
                    key={i} 
                    label={`Distractor ${i+1}`} 
                    fullWidth 
                    value={d} 
                    onChange={(e) => {
                      const newD = [...content.distractors];
                      newD[i] = e.target.value;
                      setContent({...content, distractors: newD});
                    }} 
                  />
                ))}
              </Stack>
            )}

            {type === 'multi_part' && (
              <Stack spacing={2}>
                <Typography variant="subtitle2">Answers (comma separated)</Typography>
                <TextField 
                  fullWidth 
                  placeholder="Answer 1, Answer 2..."
                  value={content.answers?.join(', ')}
                  onChange={(e) => setContent({...content, answers: e.target.value.split(',').map(s => s.trim())})}
                />
              </Stack>
            )}

            {type === 'matching' && (
              <Stack spacing={2}>
                <Typography variant="subtitle2">Pairs/Sequence</Typography>
                {content.pairs?.map((p: any, i: number) => (
                  <Stack direction="row" spacing={2} key={i}>
                    <TextField label="Left/Key" fullWidth value={p.left} onChange={(e) => {
                      const newP = [...content.pairs];
                      newP[i] = {...p, left: e.target.value};
                      setContent({...content, pairs: newP});
                    }} />
                    <TextField label="Right/Value" fullWidth value={p.right} onChange={(e) => {
                      const newP = [...content.pairs];
                      newP[i] = {...p, right: e.target.value};
                      setContent({...content, pairs: newP});
                    }} />
                  </Stack>
                ))}
                <Button onClick={() => setContent({...content, pairs: [...content.pairs, {left: '', right: ''}]})}>Add Pair</Button>
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
