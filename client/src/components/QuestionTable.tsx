import React from 'react';
import { 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Chip, 
  Stack, 
  IconButton 
} from '@mui/material';
import { Edit2, Trash2 } from 'lucide-react';
import { Question } from '../types';

interface QuestionTableProps {
  questions: Question[];
  onEdit: (question: Question) => void;
  onDelete: (id: number) => void;
  showCategory?: boolean;
}

export const QuestionTable: React.FC<QuestionTableProps> = ({ 
  questions, 
  onEdit, 
  onDelete, 
  showCategory = true 
}) => {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {showCategory && <TableCell>Category</TableCell>}
            <TableCell>Type</TableCell>
            <TableCell>Prompt</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {questions.map((q) => (
            <TableRow key={q.id}>
              {showCategory && (
                <TableCell>
                  <Chip label={q.category || 'Uncategorized'} size="small" variant="outlined" />
                </TableCell>
              )}
              <TableCell>
                <Chip label={q.type.replace('_', ' ')} size="small" color="primary" />
              </TableCell>
              <TableCell sx={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {q.prompt}
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <IconButton color="primary" onClick={() => onEdit(q)}>
                    <Edit2 size={18} />
                  </IconButton>
                  <IconButton color="error" onClick={() => onDelete(q.id)}>
                    <Trash2 size={18} />
                  </IconButton>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
          {questions.length === 0 && (
            <TableRow>
              <TableCell colSpan={showCategory ? 4 : 3} align="center" sx={{ py: 3, opacity: 0.5 }}>
                No questions found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
