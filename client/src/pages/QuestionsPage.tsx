import React, { useEffect, useState, useRef } from 'react';
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
  Select,
  Autocomplete,
  Divider
} from '@mui/material';
import { Trash2, Plus, ArrowLeft, Edit2, Link as LinkIcon, Image as ImageIcon, X } from 'lucide-react';

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
  const [open, setOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  
  const [type, setType] = useState<'multi_part' | 'multiple_choice' | 'matching'>('multiple_choice');
  const [category, setCategory] = useState('');
  const [prompt, setPrompt] = useState('');
  const [content, setContent] = useState<any>({});
  const [mediaUrl, setMediaUrl] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setType('multiple_choice');
    setCategory('');
    setPrompt('');
    setMediaUrl('');
    setContent({ correct: '', distractors: ['', '', ''], answers: [''], pairs: [{ left: '', right: '' }] });
    setOpen(true);
  };

  const handleOpenEdit = (q: Question) => {
    setEditingQuestion(q);
    setType(q.type);
    setCategory(q.category || '');
    setPrompt(q.prompt);
    setMediaUrl(q.media_url || '');
    setContent(q.content);
    setOpen(true);
  };

  const handleSave = async () => {
    const url = editingQuestion ? `/api/questions/${editingQuestion.id}` : '/api/questions';
    const method = editingQuestion ? 'PUT' : 'POST';
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setId, type, category, prompt, content, media_url: mediaUrl }),
    });
    setOpen(false);
    fetchQuestions();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('media', file);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    setMediaUrl(data.url);
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
                  <Box sx={{ width: 100, height: 100, borderRadius: 1, overflow: 'hidden' }}>
                    <img src={q.media_url} alt="Question media" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
      </Stack>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingQuestion ? 'Edit Question' : 'Create New Question'}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
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
                label="Category" 
                value={category} 
                onChange={(e) => setCategory(e.target.value)} 
              />
            </Stack>
            
            <TextField
              fullWidth
              label="Question Prompt"
              multiline
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />

            {/* Media Upload */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>Media (Optional)</Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Button variant="outlined" startIcon={<ImageIcon />} onClick={() => fileInputRef.current?.click()}>
                  Upload Image
                </Button>
                <input type="file" hidden ref={fileInputRef} onChange={handleUpload} accept="image/*" />
                {mediaUrl && (
                  <Box sx={{ position: 'relative' }}>
                    <img src={mediaUrl} alt="Preview" style={{ height: 60, borderRadius: 4 }} />
                    <IconButton 
                      size="small" 
                      sx={{ position: 'absolute', top: -10, right: -10, bgcolor: 'background.paper' }}
                      onClick={() => setMediaUrl('')}
                    >
                      <X size={14} />
                    </IconButton>
                  </Box>
                )}
              </Stack>
            </Box>

            {/* Type-specific content editors */}
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
              <TextField 
                label="Answers (comma separated)" 
                fullWidth 
                value={content.answers?.join(', ')}
                onChange={(e) => setContent({...content, answers: e.target.value.split(',').map(s => s.trim())})}
              />
            )}

            {type === 'matching' && (
              <Stack spacing={2}>
                {content.pairs?.map((p: any, i: number) => (
                  <Stack direction="row" spacing={2} key={i}>
                    <TextField label="Key" fullWidth value={p.left} onChange={(e) => {
                      const newP = [...content.pairs];
                      newP[i] = {...p, left: e.target.value};
                      setContent({...content, pairs: newP});
                    }} />
                    <TextField label="Value" fullWidth value={p.right} onChange={(e) => {
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
