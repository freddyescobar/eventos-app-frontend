import { create } from 'zustand';
import { PersonModel, PaginatedResponse } from '@/lib/types';

interface PersonsState {
    persons: PersonModel[];
    totalPersons: number;
    isLoading: boolean;
    error: string | null;

    // Actions
    setPersons: (persons: PersonModel[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;

    // API calls
    fetchPersons: (eventId: number, limit?: number, offset?: number) => Promise<void>;
    addPerson: (eventId: number, person: any) => Promise<boolean>;
}

export const usePersonsStore = create<PersonsState>((set, get) => ({
    persons: [],
    totalPersons: 0,
    isLoading: false,
    error: null,

    setPersons: (persons) => set({ persons }),

    setLoading: (loading) => set({ isLoading: loading }),

    setError: (error) => set({ error }),

    fetchPersons: async (eventId: number, limit?: number, offset?: number) => {
        set({ isLoading: true, error: null });
        try {
            // Si no se especifica limit, usar un valor muy alto para traer todos
            const actualLimit = limit ?? 9999;
            const actualOffset = offset ?? 0;

            const response = await fetch(`/api/events/${eventId}/persons?limit=${actualLimit}&offset=${actualOffset}`);
            const result = await response.json() as PaginatedResponse<PersonModel>;

            if (result.success) {
                set({
                    persons: result.data,
                    totalPersons: result.total,
                    isLoading: false
                });
            } else {
                set({ error: (result as any).error || 'Error al cargar personas', isLoading: false });
            }
        } catch (error) {
            set({
                error: 'Error de conexión con el servidor',
                isLoading: false
            });
            console.error('Error fetching persons:', error);
        }
    },

    addPerson: async (eventId, personData) => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch(`/api/events/${eventId}/persons`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(personData),
            });

            const result = await response.json();

            if (result.success) {
                await get().fetchPersons(eventId);
                set({ isLoading: false });
                return true;
            } else {
                set({ error: result.error || 'Error al registrar persona', isLoading: false });
                return false;
            }
        } catch (error) {
            set({
                error: 'Error de conexión con el servidor',
                isLoading: false
            });
            console.error('Error adding person:', error);
            return false;
        }
    },
}));
