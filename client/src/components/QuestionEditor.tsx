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
  InputAdornment
} from '@mui/material';
import { Image as ImageIcon, X, Trash2, ArrowUp, ArrowDown, Plus } from 'lucide-react';

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
    items: [''],
    parts: [{ text: '', type: 'text', range: '' }] 
  });
  const [mediaUrl, setMediaUrl] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setCategory(initialData.category || '');
      setTitle(initialData.title || '');
      setPrompt(initialData.prompt);
      
      let normalizedContent = { ...initialData.content };
      if (initialData.type === 'multi_part' && !normalizedContent.parts) {
        normalizedContent.parts = (normalizedContent.answers || []).map((a: string) => ({
          text: a,
          type: 'text',
          range: ''
        }));
      }

      setContent({
        correct: '', distractors: ['', '', ''], answers: [''], pairs: [{ left: '', right: '' }], items: [''], parts: [{ text: '', type: 'text', range: '' }],
        ...normalizedContent 
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
        items: [''],
        parts: [{ text: '', type: 'text', range: '' }]
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

  const updatePart = (index: number, field: string, value: any) => {
    const newParts = [...content.parts];
    newParts[index] = { ...newParts[index], [field]: value };
    setContent({ ...content, parts: newParts });
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
            <TextField fullWidth label="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
          </Stack>

          <TextField fullWidth label="Question Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextField fullWidth label="Question Prompt" multiline rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} />

          <Box>
            <Typography variant="subtitle2" gutterBottom>Media (Optional)</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button variant="outlined" startIcon={<ImageIcon />} onClick={() => fileInputRef.current?.click()}>Upload Image</Button>
              <input type="file" hidden ref={fileInputRef} onChange={handleUpload} accept="image/*" />
              {mediaUrl && (
                <Box sx={{ position: 'relative' }}>
                  <img src={mediaUrl} alt="Preview" style={{ height: 60, borderRadius: 4 }} />
                  <IconButton size="small" sx={{ position: 'absolute', top: -10, right: -10, bgcolor: 'background.paper' }} onClick={() => setMediaUrl('')}><X size={14} /></IconButton>
                </Box>
              )}
            </Stack>
          </Box>

          {type === 'multi_part' && (
            <Stack spacing={2}>
              <Typography variant="subtitle2">Answer Key (Parts)</Typography>
              {content.parts?.map((part: any, i: number) => (
                <Stack direction="row" spacing={2} key={i} alignItems="center">
                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>Format</InputLabel>
                    <Select size="small" value={part.type} label="Format" onChange={(e) => updatePart(i, 'type', e.target.value)}>
                      <MenuItem value="text">Text</MenuItem>
                      <MenuItem value="number">Number</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <TextField 
                    size="small" 
                    fullWidth 
                    type={part.type === 'number' ? 'number' : 'text'}
                    label={part.type === 'number' ? 'Correct Value' : 'Correct Answer'} 
                    value={part.text} 
                    onChange={(e) => updatePart(i, 'text', e.target.value)} 
                  />

                  {part.type === 'number' && (
                    <TextField 
                      size="small" 
                      sx={{ width: 150 }} 
                      type="number"
                      label="Range" 
                      placeholder="e.g. 100"
                      InputProps={{ startAdornment: <InputAdornment position="start">±</InputAdornment> }}
                      value={part.range} 
                      onChange={(e) => updatePart(i, 'range', e.target.value)} 
                    />
                  )}

                  <IconButton color="error" onClick={() => setContent({ ...content, parts: content.parts.filter((_: any, idx: number) => idx !== i) })} disabled={content.parts.length <= 1}>
                    <Trash2 size={20} />
                  </IconButton>
                </Stack>
              ))}
              <Button startIcon={<Plus />} onClick={() => setContent({ ...content, parts: [...content.parts, { text: '', type: 'text', range: '' }] })}>
                Add Answer Part
              </Button>
            </Stack>
          )}

          {type === 'multiple_choice' && (
            <Stack spacing={2}>
              <TextField label="Correct Answer" fullWidth value={content.correct} onChange={(e) => setContent({...content, correct: e.target.value})} />
              {content.distractors?.map((d: string, i: number) => (
                <TextField key={i} label={`Distractor ${i+1}`} fullWidth value={d} onChange={(e) => {
                  const newD = [...content.distractors];
                  newD[i] = e.target.value;
                  setContent({...content, distractors: newD});
                }} />
              ))}
            </Stack>
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
                  <IconButton color="error" onClick={() => {
                    const newPairs = content.pairs.filter((_: any, idx: number) => idx !== i);
                    setContent({ ...content, pairs: newPairs });
                  }} disabled={content.pairs.length <= 1}><Trash2 size={20} /></IconButton>
                </Stack>
              ))}
              <Button startIcon={<Plus />} onClick={() => setContent({...content, pairs: [...content.pairs, {left: '', right: ''}]})}>Add Pair</Button>
            </Stack>
          )}

          {type === 'sequencing' && (
            <Stack spacing={2}>
              <Typography variant="subtitle2">Arrange Items in CORRECT order:</Typography>
              {content.items?.map((item: string, i: number) => (
                <Stack direction="row" spacing={1} key={i} alignItems="center">
                  <Typography sx={{ minWidth: 25, fontWeight: 'bold' }}>{i + 1}.</Typography>
                  <TextField fullWidth value={item} onChange={(e) => {
                    const newItems = [...content.items];
                    newItems[i] = e.target.value;
                    setContent({ ...content, items: newItems });
                  }} />
                  <IconButton onClick={() => {
                    const newItems = [...content.items];
                    if (i > 0) {
                      [newItems[i], newItems[i-1]] = [newItems[i-1], newItems[i]];
                      setContent({ ...content, items: newItems });
                    }
                  }} disabled={i === 0} size="small"><ArrowUp size={18}/></IconButton>
                  <IconButton onClick={() => {
                    const newItems = [...content.items];
                    if (i < newItems.length - 1) {
                      [newItems[i], newItems[i+1]] = [newItems[i+1], newItems[i]];
                      setContent({ ...content, items: newItems });
                    }
                  }} disabled={i === content.items.length - 1} size="small"><ArrowDown size={18}/></IconButton>
                  <IconButton color="error" onClick={() => setContent({ ...content, items: content.items.filter((_: any, idx: number) => idx !== i) })} disabled={content.items.length <= 1} size="small"><Trash2 size={18} /></IconButton>
                </Stack>
              ))}
              <Button startIcon={<Plus />} onClick={() => setContent({...content, items: [...content.items, '']})}>Add Item</Button>
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
