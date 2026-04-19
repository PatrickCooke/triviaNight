import React, { useState, useRef, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  MenuItem, 
  Stack, 
  FormControl, 
  InputLabel, 
  Select, 
  Box, 
  Typography, 
  IconButton,
  List,
  ListItem
} from '@mui/material';
import { Image as ImageIcon, X, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

interface Question {
  id?: number;
  type: string;
  category: string;
  title: string;
  prompt: string;
  content: any;
  media_url?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (question: Question) => Promise<void>;
  initialData?: Question | null;
}

export default function QuestionEditor({ open, onClose, onSave, initialData }: Props) {
  const [type, setType] = useState('multiple_choice');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [content, setContent] = useState<any>({ 
    correct: '', 
    distractors: ['', '', ''], 
    answers: [''], 
    pairs: [{ left: '', right: '' }],
    items: [''] // For sequencing
  });
  const [mediaUrl, setMediaUrl] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setCategory(initialData.category || '');
      setTitle(initialData.title || '');
      setPrompt(initialData.prompt);
      setContent({
        correct: '', distractors: ['', '', ''], answers: [''], pairs: [{ left: '', right: '' }], items: [''],
        ...initialData.content 
      });
      setMediaUrl(initialData.media_url || '');
    } else {
      setType('multiple_choice');
      setCategory('');
      setTitle('');
      setPrompt('');
      setContent({ 
        correct: '', 
        distractors: ['', '', ''], 
        answers: [''], 
        pairs: [{ left: '', right: '' }],
        items: [''] 
      });
      setMediaUrl('');
    }
  }, [initialData, open]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('media', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    setMediaUrl(data.url);
  };

  const handleLocalSave = async () => {
    await onSave({
      id: initialData?.id,
      type,
      category,
      title,
      prompt,
      content,
      media_url: mediaUrl
    });
  };

  // --- Matching Handlers ---
  const deletePair = (index: number) => {
    const newPairs = content.pairs.filter((_: any, i: number) => i !== index);
    setContent({ ...content, pairs: newPairs });
  };

  // --- Sequencing Handlers ---
  const updateSequenceItem = (index: number, val: string) => {
    const newItems = [...content.items];
    newItems[index] = val;
    setContent({ ...content, items: newItems });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...content.items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setContent({ ...content, items: newItems });
  };

  const deleteItem = (index: number) => {
    const newItems = content.items.filter((_: any, i: number) => i !== index);
    setContent({ ...content, items: newItems });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{initialData ? 'Edit Question' : 'Add New Question'}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select value={type} label="Type" onChange={(e) => setType(e.target.value)}>
                <MenuItem value="multiple_choice">Multiple Choice</MenuItem>
                <MenuItem value="multi_part">Multi-Part</MenuItem>
                <MenuItem value="matching">Matching</MenuItem>
                <MenuItem value="sequencing">Sequencing</MenuItem>
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
            label="Question Title" 
            placeholder="e.g. History Round: Question 1"
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
          />
          
          <TextField
            fullWidth
            label="Question Prompt"
            multiline
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />

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
              onChange={(e) => setContent({...content, answers: e.target.value.split(',').map((s: string) => s.trim())})}
            />
          )}

          {type === 'matching' && (
            <Stack spacing={2}>
              <Typography variant="subtitle2">Matching Pairs</Typography>
              {content.pairs?.map((p: any, i: number) => (
                <Stack direction="row" spacing={2} key={i} alignItems="center">
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
                  <IconButton color="error" onClick={() => deletePair(i)} disabled={content.pairs.length <= 1}>
                    <Trash2 size={20} />
                  </IconButton>
                </Stack>
              ))}
              <Button onClick={() => setContent({...content, pairs: [...content.pairs, {left: '', right: ''}]})}>Add Pair</Button>
            </Stack>
          )}

          {type === 'sequencing' && (
            <Stack spacing={2}>
              <Typography variant="subtitle2">Arrange Items in CORRECT order:</Typography>
              {content.items?.map((item: string, i: number) => (
                <Stack direction="row" spacing={1} key={i} alignItems="center">
                  <Typography sx={{ minWidth: 25, fontWeight: 'bold' }}>{i + 1}.</Typography>
                  <TextField 
                    fullWidth 
                    value={item} 
                    onChange={(e) => updateSequenceItem(i, e.target.value)} 
                  />
                  <IconButton onClick={() => moveItem(i, 'up')} disabled={i === 0} size="small"><ArrowUp size={18}/></IconButton>
                  <IconButton onClick={() => moveItem(i, 'down')} disabled={i === content.items.length - 1} size="small"><ArrowDown size={18}/></IconButton>
                  <IconButton color="error" onClick={() => deleteItem(i)} disabled={content.items.length <= 1} size="small">
                    <Trash2 size={18} />
                  </IconButton>
                </Stack>
              ))}
              <Button onClick={() => setContent({...content, items: [...content.items, '']})}>Add Item</Button>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleLocalSave} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
}
