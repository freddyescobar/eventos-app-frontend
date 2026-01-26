import { create } from 'zustand';
import { AttendanceDetailModel } from '@/lib/types';

interface AttendanceState {
  attendances: AttendanceDetailModel[];
  recentAttendances: any[];
  totalAttendances: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  setAttendances: (attendances: AttendanceDetailModel[]) => void;
  setRecentAttendances: (attendances: any[]) => void;
  addRecentAttendance: (attendance: any) => void;
  setTotalAttendances: (total: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAttendances: () => void;

  // API calls
  fetchAttendances: (eventId: number) => Promise<void>;
  fetchRecentAttendances: (eventId: number, limit?: number) => Promise<void>;
  registerAttendance: (eventId: number, personId: number, deviceId: string) => Promise<boolean>;
  checkAttendance: (eventId: number, personId: number) => Promise<boolean>;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  attendances: [],
  recentAttendances: [],
  totalAttendances: 0,
  isLoading: false,
  error: null,

  setAttendances: (attendances) => set({ attendances }),

  setRecentAttendances: (attendances) => set({ recentAttendances: attendances }),

  addRecentAttendance: (attendance) => set((state) => ({
    recentAttendances: [attendance, ...state.recentAttendances].slice(0, 50),
  })),

  setTotalAttendances: (total) => set({ totalAttendances: total }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  clearAttendances: () => set({
    attendances: [],
    recentAttendances: [],
    totalAttendances: 0,
  }),

  // Fetch attendances
  fetchAttendances: async (eventId: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/events/${eventId}/attendances`);
      const result = await response.json();

      if (result.success) {
        set({
          attendances: result.data,
          totalAttendances: result.total,
          isLoading: false,
        });
      } else {
        set({ error: result.error || 'Error al cargar asistencias', isLoading: false });
      }
    } catch (error) {
      set({
        error: 'Error de conexión con el servidor',
        isLoading: false
      });
      console.error('Error fetching attendances:', error);
    }
  },

  // Fetch recent attendances
  fetchRecentAttendances: async (eventId: number, limit = 50) => {
    try {
      const response = await fetch(`/api/events/${eventId}/attendances/recent?limit=${limit}`);
      const result = await response.json();

      if (result.success) {
        set({ recentAttendances: result.data });
      }
    } catch (error) {
      console.error('Error fetching recent attendances:', error);
    }
  },

  // Register attendance
  registerAttendance: async (eventId: number, personId: number, deviceId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/events/${eventId}/attendances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          person_id: personId,
          device_id: deviceId,
          check_in_time: new Date().toISOString(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Recargar asistencias recientes
        await get().fetchRecentAttendances(eventId);
        set({
          totalAttendances: get().totalAttendances + 1,
          isLoading: false,
        });
        return true;
      } else {
        set({ error: result.error || 'Error al registrar asistencia', isLoading: false });
        return false;
      }
    } catch (error) {
      set({
        error: 'Error de conexión con el servidor',
        isLoading: false
      });
      console.error('Error registering attendance:', error);
      return false;
    }
  },

  // Check if person has attendance
  checkAttendance: async (eventId: number, personId: number) => {
    try {
      const response = await fetch(`/api/events/${eventId}/attendances/check?person_id=${personId}`);
      const result = await response.json();

      if (result.success) {
        return result.data.hasAttendance;
      }
      return false;
    } catch (error) {
      console.error('Error checking attendance:', error);
      return false;
    }
  },
}));
