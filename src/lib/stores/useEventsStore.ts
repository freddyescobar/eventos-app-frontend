import { create } from 'zustand';
import { EventModel } from '@/lib/types';

interface EventsState {
  events: EventModel[];
  activeEvent: EventModel | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setEvents: (events: EventModel[]) => void;
  setActiveEvent: (event: EventModel | null) => void;
  addEvent: (event: EventModel) => void;
  updateEvent: (id: number, event: Partial<EventModel>) => void;
  deleteEvent: (id: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // API calls
  fetchEvents: () => Promise<void>;
  createEvent: (event: Omit<EventModel, 'id' | 'created_at'>) => Promise<EventModel | null>;
  removeEvent: (id: number) => Promise<boolean>;
  toggleEventActive: (id: number, isActive: boolean) => Promise<boolean>;
  closeEvent: (id: number) => Promise<boolean>;
}

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],
  activeEvent: null,
  isLoading: false,
  error: null,

  setEvents: (events) => set({ events }),

  setActiveEvent: (event) => set({ activeEvent: event }),

  addEvent: (event) => set((state) => ({
    events: [event, ...state.events],
  })),

  updateEvent: (id, updatedEvent) => set((state) => ({
    events: state.events.map((e) =>
      e.id === id ? { ...e, ...updatedEvent } : e
    ),
  })),

  deleteEvent: (id) => set((state) => ({
    events: state.events.filter((e) => e.id !== id),
    activeEvent: state.activeEvent?.id === id ? null : state.activeEvent,
  })),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  // Fetch events from API
  fetchEvents: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/events');
      const result = await response.json();

      if (result.success) {
        set({ events: result.data, isLoading: false });
      } else {
        set({ error: result.error || 'Error al cargar eventos', isLoading: false });
      }
    } catch (error) {
      set({
        error: 'Error de conexión con el servidor',
        isLoading: false
      });
      console.error('Error fetching events:', error);
    }
  },

  // Create new event
  createEvent: async (eventData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      const result = await response.json();

      if (result.success) {
        get().addEvent(result.data);
        set({ isLoading: false });
        return result.data;
      } else {
        set({ error: result.error || 'Error al crear evento', isLoading: false });
        return null;
      }
    } catch (error) {
      set({
        error: 'Error de conexión con el servidor',
        isLoading: false
      });
      console.error('Error creating event:', error);
      return null;
    }
  },

  // Delete event
  removeEvent: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        get().deleteEvent(id);
        set({ isLoading: false });
        return true;
      } else {
        set({ error: result.error || 'Error al eliminar evento', isLoading: false });
        return false;
      }
    } catch (error) {
      set({
        error: 'Error de conexión con el servidor',
        isLoading: false
      });
      console.error('Error deleting event:', error);
      return false;
    }
  },

  // Toggle event active status
  toggleEventActive: async (id, isActive) => {
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: isActive }),
      });

      const result = await response.json();

      if (result.success) {
        // Actualizar todos los eventos
        await get().fetchEvents();
        return true;
      } else {
        set({ error: result.error || 'Error al actualizar evento' });
        return false;
      }
    } catch (error) {
      console.error('Error toggling event:', error);
      return false;
    }
  },

  // Cerrar evento permanentemente
  closeEvent: async (id) => {
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'closed', is_active: false }),
      });

      const result = await response.json();

      if (result.success) {
        await get().fetchEvents();
        return true;
      } else {
        set({ error: result.error || 'Error al cerrar el evento' });
        return false;
      }
    } catch (error) {
      console.error('Error closing event:', error);
      return false;
    }
  },
}));
