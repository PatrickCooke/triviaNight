import { useApi } from './useApi';
import { Question } from '../types';

export function useQuestions() {
  const { data, loading, error, refetch } = useApi<Question[]>('/api/questions');

  const saveQuestion = async (qData: Partial<Question>) => {
    const isNew = !qData.id;
    const url = isNew ? '/api/questions' : `/api/questions/${qData.id}`;
    const method = isNew ? 'POST' : 'PUT';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(qData),
    });

    if (res.ok) {
      await refetch();
    }
    return res;
  };

  const deleteQuestion = async (id: number) => {
    const res = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await refetch();
    }
    return res;
  };

  const bulkImport = async (questions: any[]) => {
    const res = await fetch('/api/questions/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions }),
    });
    if (res.ok) {
      await refetch();
    }
    return res;
  };

  return { 
    questions: data || [], 
    loading, 
    error, 
    refetchQuestions: refetch,
    saveQuestion,
    deleteQuestion,
    bulkImport
  };
}
