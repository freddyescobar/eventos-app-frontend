// Modelos de base de datos

export interface EventModel {
  id?: number;
  name: string;
  location: string;
  date: string;
  background_image_path?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PersonModel {
  id?: number;
  ccodper: string;
  cnomper: string;
  cnrodni: string;
  dfecing: string;
  cnomofi: string;
  ccargo: string;
  carea: string;
  cdesest: string;
  cdeszona: string;
  event_id: number;
  created_at: string;
  updated_at: string;
  source?: string;
  created_by_device?: string | null;
  is_inside: boolean;
}

export interface AttendanceModel {
  id?: number;
  event_id: number;
  person_id: number;
  type: 'IN' | 'OUT';
  check_time: string;
  notes?: string | null;
  created_at: string;
  device_id: string;
  synced_at?: string | null;
}

export interface AttendanceDetailModel {
  attendance: AttendanceModel;
  person: {
    cnomper: string;
    cnrodni: string;
    ccargo: string;
    carea: string;
    cdesest: string;
  };
  event: {
    name: string;
  };
}

export interface SouvenirModel {
  id?: number;
  event_id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  cantidad_inicial: number;
  cantidad_disponible: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface SouvenirDeliveryModel {
  id?: number;
  event_id: number;
  person_id: number;
  souvenir_id: number;
  delivery_time: string;
  signature_path: string;
  device_id: string;
  created_at: string;
  synced_at?: string | null;
  notes?: string | null;
}

export interface SouvenirDeliveryDetailModel {
  delivery: SouvenirDeliveryModel;
  person: {
    cnomper: string;
    cnrodni: string;
    ccargo: string;
  };
  souvenir: {
    nombre: string;
    codigo: string;
  };
  event: {
    name: string;
  };
}

export interface DeviceModel {
  id?: number;
  device_id: string;
  device_name: string;
  device_type: string;
  registered_at: string;
  last_sync?: string | null;
  is_active: boolean;
}

export interface UserModel {
  id?: number;
  username: string;
  password?: string;
  last_login?: string | null;
  is_active: boolean;
}

// Tipos de respuesta de API

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

// Tipos de sincronización

export interface SyncPullRequest {
  device_id: string;
  event_id: number;
  last_sync?: string;
}

export interface SyncPullResponse {
  success: boolean;
  data: {
    persons: PersonModel[];
    attendances: AttendanceModel[];
    souvenirs: SouvenirModel[];
    deliveries: SouvenirDeliveryModel[];
  };
  sync_timestamp: string;
}

export interface SyncPushRequest {
  device_id: string;
  operations: {
    attendances?: AttendanceModel[];
    deliveries?: SouvenirDeliveryModel[];
    persons?: PersonModel[];
  };
}

export interface SyncPushResponse {
  success: boolean;
  results: {
    attendances: { success: number; failed: number; conflicts: number };
    deliveries: { success: number; failed: number; conflicts: number };
    persons: { success: number; failed: number; conflicts: number };
  };
  conflicts?: any[];
}

// Estadísticas

export interface AttendanceStats {
  total: number;
  by_zone: Record<string, number>;
  by_office: Record<string, number>;
  hourly_distribution: Record<number, number>;
  first_check_in?: string;
  last_check_in?: string;
}
