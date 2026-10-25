import { useApi } from './useApi';
import { Set } from '../types';

export function useSets() {
  const { data, loading, error, refetch } = useApi<Set[]>('/api/sets');

  const saveSet = async (setData: Partial<Set>) => {
    const isNew = !setData.id;
    const url = isNew ? '/api/sets' : `/api/sets/${setData.id}`;
    const method = isNew ? 'POST' : 'PUT';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(setData),
    });

    if (res.ok) {
      await refetch();
    }
    return res;
  };

  const deleteSet = async (id: number) => {
    const res = await fetch(`/api/sets/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await refetch();
    }
    return res;
  };

  return { 
    sets: data || [], 
    loading, 
    error, 
    refetchSets: refetch,
    saveSet,
    deleteSet
  };
}
