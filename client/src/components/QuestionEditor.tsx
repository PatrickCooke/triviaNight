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
  IconButton 
} from '@mui/material';
import { Image as ImageIcon, X } from 'lucide-react';

interface Question {
  id?: number;
  type: string;
  category: string;
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
  const [prompt, setPrompt] = useState('');
  const [content, setContent] = useState<any>({ correct: '', distractors: ['', '', ''], answers: [''], pairs: [{ left: '', right: '' }] });
  const [mediaUrl, setMediaUrl] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setCategory(initialData.category || '');
      setPrompt(initialData.prompt);
      setContent(initialData.content);
      setMediaUrl(initialData.media_url || '');
    } else {
      setType('multiple_choice');
      setCategory('');
      setPrompt('');
      setContent({ correct: '', distractors: ['', '', ''], answers: [''], pairs: [{ left: '', right: '' }] });
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
      prompt,
      content,
      media_url: mediaUrl
    });
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
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleLocalSave} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
}
