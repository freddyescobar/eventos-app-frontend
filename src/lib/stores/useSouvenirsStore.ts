import { create } from 'zustand';
import { SouvenirModel, SouvenirDeliveryModel, ApiResponse } from '../types';

interface SouvenirsState {
    souvenirs: SouvenirModel[];
    deliveries: any[];
    isLoading: boolean;
    error: string | null;
    fetchSouvenirs: (eventId: number) => Promise<void>;
    fetchDeliveries: (eventId: number) => Promise<void>;
    addSouvenir: (eventId: number, souvenir: Partial<SouvenirModel>) => Promise<ApiResponse<SouvenirModel>>;
}

export const useSouvenirsStore = create<SouvenirsState>((set, get) => ({
    souvenirs: [],
    deliveries: [],
    isLoading: false,
    error: null,

    fetchSouvenirs: async (eventId: number) => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch(`/api/events/${eventId}/souvenirs`);
            const result = await response.json();
            if (result.success) {
                set({ souvenirs: result.data, isLoading: false });
            } else {
                set({ error: result.error, isLoading: false });
            }
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    fetchDeliveries: async (eventId: number) => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch(`/api/events/${eventId}/souvenirs/deliveries`);
            const result = await response.json();
            if (result.success) {
                set({ deliveries: result.data, isLoading: false });
            } else {
                set({ error: result.error, isLoading: false });
            }
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    addSouvenir: async (eventId: number, souvenir: Partial<SouvenirModel>) => {
        try {
            const response = await fetch(`/api/events/${eventId}/souvenirs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(souvenir),
            });
            const result = await response.json();
            if (result.success) {
                set((state) => ({
                    souvenirs: [...state.souvenirs, result.data],
                }));
            }
            return result;
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },
}));
