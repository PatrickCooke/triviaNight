import { useApi } from './useApi';
import { Event } from '../types';

export function useEvents() {
  const { data, loading, error, refetch } = useApi<Event[]>('/api/events');

  const saveEvent = async (eventData: Partial<Event>) => {
    const isNew = !eventData.id;
    const url = isNew ? '/api/events' : `/api/events/${eventData.id}`;
    const method = isNew ? 'POST' : 'PUT';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });

    if (res.ok) {
      await refetch();
    }
    return res;
  };

  const deleteEvent = async (id: number) => {
    const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await refetch();
    }
    return res;
  };

  return { 
    events: data || [], 
    loading, 
    error, 
    refetchEvents: refetch,
    saveEvent,
    deleteEvent
  };
}
