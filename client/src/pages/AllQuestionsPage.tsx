import React, { useState } from 'react';
import { 
  Box,
  TextField,
  InputAdornment,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Typography
} from '@mui/material';
import { Search, Plus, FileUp, BookOpen } from 'lucide-react';
import QuestionEditor from '../components/QuestionEditor';
import { useQuestions } from '../hooks/useQuestions';
import { Question } from '../types';
import { PageHeader } from '../components/layout/PageHeader';
import { QuestionTable } from '../components/QuestionTable';
import { BulkImportDialog } from '../components/questions/BulkImportDialog';
import ReferenceLibraryDrawer, { ReferenceResult } from '../components/ReferenceLibraryDrawer';

export default function AllQuestionsPage() {
  const { questions, loading, saveQuestion, deleteQuestion, bulkImport } = useQuestions();
  const [search, setSearch] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [refOpen, setRefOpen] = useState(false);
  
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const handleBulkImport = async (bulkData: string) => {
   try {
     const parsed = JSON.parse(bulkData);
     const res = await bulkImport(parsed);

     if (!res.ok) {
       const errData = await res.json();
       throw new Error(errData.error || 'Server error during import');
     }

     const result = await res.json();
     alert(`Success: ${result.message}`);
     setBulkOpen(false);
   } catch (e: any) {
     console.error('Import failed:', e);
     alert(`Import failed: ${e.message}`);
   }
  };

  const handleSaveQuestion = async (qData: any) => {
    await saveQuestion(qData);
    setEditorOpen(false);
  };

  const handleImportFromReference = (ref: ReferenceResult) => {
    setEditingQuestion({
      id: 0,
      type: 'multi_part',
      category: ref.category,
      title: '',
      prompt: ref.answer,
      content: JSON.stringify({
        parts: [{ subPrompt: 'Answer', text: ref.question }],
      }),
      media_url: '',
    } as any);
    setRefOpen(false);
    setEditorOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Permanently delete this question from the bank?')) {
      await deleteQuestion(id);
    }
  };

  const filtered = questions.filter(q => 
    q.prompt.toLowerCase().includes(search.toLowerCase()) ||
    q.type.toLowerCase().includes(search.toLowerCase()) ||
    (q.category || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <PageHeader 
        title="Question Bank" 
        actions={
          <>
            <Button variant="outlined" startIcon={<BookOpen size={16} />} onClick={() => setRefOpen(true)}>
              Reference Library
            </Button>
            <Button variant="outlined" startIcon={<FileUp />} onClick={() => setBulkOpen(true)}>
              Bulk Import
            </Button>
            <Button variant="contained" startIcon={<Plus />} onClick={() => { setEditingQuestion(null); setEditorOpen(true); }}>
              Add Question
            </Button>
          </>
        }
      />
      
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

      <QuestionTable 
        questions={filtered}
        onEdit={(q) => { setEditingQuestion(q); setEditorOpen(true); }}
        onDelete={handleDelete}
      />

      <QuestionEditor 
        open={editorOpen} 
        onClose={() => setEditorOpen(false)} 
        onSave={handleSaveQuestion} 
        initialData={editingQuestion} 
      />

      <BulkImportDialog 
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onImport={handleBulkImport}
      />

      <ReferenceLibraryDrawer
        open={refOpen}
        onClose={() => setRefOpen(false)}
        onImport={handleImportFromReference}
      />
    </Box>
  );
}
