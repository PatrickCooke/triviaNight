import React, { useEffect, useState, useMemo } from 'react';
import { 
  Typography, 
  Button, 
  Box, 
  IconButton, 
  Chip 
} from '@mui/material';
import { Plus, ArrowLeft, Link as LinkIcon, BookOpen } from 'lucide-react';
import QuestionEditor from '../components/QuestionEditor';
import { Question } from '../types';
import { PageHeader } from '../components/layout/PageHeader';
import { QuestionTable } from '../components/QuestionTable';
import { ItemSelectionDialog, ColumnDef } from '../components/ItemSelectionDialog';
import ReferenceLibraryDrawer, { ReferenceResult } from '../components/ReferenceLibraryDrawer';

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
  const [refOpen, setRefOpen] = useState(false);
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

  const handleImportFromReference = (ref: ReferenceResult) => {
    // Pre-populate the question editor from a Jeopardy clue.
    // In Jeopardy format: `answer` is the clue, `question` is the correct response.
    setEditingQuestion({
      id: 0,
      type: 'multi_part',
      category: ref.category,
      title: '',
      prompt: ref.answer,           // The Jeopardy clue becomes the prompt
      content: JSON.stringify({
        parts: [{ subPrompt: 'Answer', text: ref.question }],
      }),
      media_url: '',
    } as any);
    setRefOpen(false);
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

  const handleToggleBankQuestion = async (q: Question, isChecked: boolean) => {
    if (isChecked) {
      await fetch(`/api/sets/${setId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: q.id }),
      });
    } else {
      await fetch(`/api/sets/${setId}/questions/${q.id}`, {
        method: 'DELETE',
      });
    }
    fetchQuestions();
  };

  const bankColumns: ColumnDef<Question>[] = useMemo(() => [
    {
      id: 'prompt',
      header: 'Prompt',
      render: (q) => (
        <Typography
          variant="body2"
          fontWeight={500}
          sx={{
            maxWidth: 420,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {q.prompt}
        </Typography>
      ),
    },
    {
      id: 'category',
      header: 'Category',
      width: 140,
      render: (q) => (
        <Chip label={q.category || 'Uncategorized'} size="small" variant="outlined" />
      ),
    },
    {
      id: 'type',
      header: 'Type',
      width: 140,
      render: (q) => (
        <Chip label={q.type.replace('_', ' ')} size="small" color="primary" />
      ),
    },
  ], []);

  const selectedQuestionIds = useMemo(() => questions.map((q) => q.id), [questions]);

  return (
    <Box>
      <PageHeader 
        title={`${setName}: Questions`}
        icon={<IconButton onClick={onBack} sx={{ ml: -1 }}><ArrowLeft /></IconButton>}
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<BookOpen size={16} />}
              onClick={() => setRefOpen(true)}
            >
              Reference Library
            </Button>
            <Button
              variant="outlined"
              startIcon={<LinkIcon />}
              onClick={() => {
                fetchBank();
                setPickOpen(true);
              }}
            >
              Pick from Bank
            </Button>
            <Button variant="contained" startIcon={<Plus />} onClick={handleOpenCreate}>
              Create New
            </Button>
          </>
        }
      />

      <QuestionTable 
        questions={questions}
        onEdit={handleOpenEdit}
        onDelete={handleUnlink}
        showCategory={false}
      />

      <QuestionEditor 
        open={editorOpen} 
        onClose={() => setEditorOpen(false)} 
        onSave={handleSaveQuestion} 
        initialData={editingQuestion} 
      />

      {/* Reusable ItemSelectionDialog for Bank Questions */}
      <ItemSelectionDialog<Question>
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        title="Add Existing Question from Bank"
        items={allBankQuestions}
        selectedIds={selectedQuestionIds}
        getItemId={(q) => q.id}
        columns={bankColumns}
        onToggle={handleToggleBankQuestion}
        filterPlaceholder="Filter questions by prompt, category, or type..."
        filterPredicate={(q, search) => {
          const query = search.toLowerCase();
          return (
            (q.prompt && q.prompt.toLowerCase().includes(query)) ||
            (q.category && q.category.toLowerCase().includes(query)) ||
            (q.type && q.type.toLowerCase().includes(query)) ||
            false
          );
        }}
        emptyText="No questions found in bank."
        maxWidth="md"
      />
      {/* Reference Library Drawer */}
      <ReferenceLibraryDrawer
        open={refOpen}
        onClose={() => setRefOpen(false)}
        onImport={handleImportFromReference}
      />
    </Box>
  );
}
