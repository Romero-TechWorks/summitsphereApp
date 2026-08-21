export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          antes: Json | null
          contexto: string | null
          creado_en: string
          despues: Json | null
          id: number
          operacion: string
          org_id: string | null
          registro_id: string | null
          tabla: string
          usuario_id: string | null
        }
        Insert: {
          antes?: Json | null
          contexto?: string | null
          creado_en?: string
          despues?: Json | null
          id?: never
          operacion: string
          org_id?: string | null
          registro_id?: string | null
          tabla: string
          usuario_id?: string | null
        }
        Update: {
          antes?: Json | null
          contexto?: string | null
          creado_en?: string
          despues?: Json | null
          id?: never
          operacion?: string
          org_id?: string | null
          registro_id?: string | null
          tabla?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      bitacora_proyecto: {
        Row: {
          creado_en: string
          creado_por: string | null
          detalle: string | null
          fecha: string
          id: string
          org_id: string
          participantes: string[]
          proyecto_id: string
          tipo: string
          titulo: string
        }
        Insert: {
          creado_en?: string
          creado_por?: string | null
          detalle?: string | null
          fecha: string
          id?: string
          org_id: string
          participantes?: string[]
          proyecto_id: string
          tipo?: string
          titulo: string
        }
        Update: {
          creado_en?: string
          creado_por?: string | null
          detalle?: string | null
          fecha?: string
          id?: string
          org_id?: string
          participantes?: string[]
          proyecto_id?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "bitacora_proyecto_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bitacora_proyecto_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bitacora_proyecto_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      config_firma: {
        Row: {
          actualizado_en: string
          actualizado_por: string | null
          correo: string | null
          direccion: string | null
          id: number
          logotipo_url: string | null
          modulos_activos: string[]
          plantillas: Json
          plazos_default: Json
          razon_social: string
          rfc: string | null
          telefono: string | null
        }
        Insert: {
          actualizado_en?: string
          actualizado_por?: string | null
          correo?: string | null
          direccion?: string | null
          id?: number
          logotipo_url?: string | null
          modulos_activos?: string[]
          plantillas?: Json
          plazos_default?: Json
          razon_social?: string
          rfc?: string | null
          telefono?: string | null
        }
        Update: {
          actualizado_en?: string
          actualizado_por?: string | null
          correo?: string | null
          direccion?: string | null
          id?: number
          logotipo_url?: string | null
          modulos_activos?: string[]
          plantillas?: Json
          plazos_default?: Json
          razon_social?: string
          rfc?: string | null
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "config_firma_actualizado_por_fkey"
            columns: ["actualizado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      contactos: {
        Row: {
          activo: boolean
          actualizado_en: string
          correo: string | null
          creado_en: string
          creado_por: string | null
          id: string
          nombre: string
          notas: string | null
          org_id: string
          papel: string
          principal: boolean
          puesto: string | null
          sitio_id: string | null
          telefono: string | null
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          correo?: string | null
          creado_en?: string
          creado_por?: string | null
          id?: string
          nombre: string
          notas?: string | null
          org_id: string
          papel?: string
          principal?: boolean
          puesto?: string | null
          sitio_id?: string | null
          telefono?: string | null
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          correo?: string | null
          creado_en?: string
          creado_por?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          org_id?: string
          papel?: string
          principal?: boolean
          puesto?: string | null
          sitio_id?: string | null
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contactos_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contactos_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contactos_sitio_id_fkey"
            columns: ["sitio_id"]
            isOneToOne: false
            referencedRelation: "sitios"
            referencedColumns: ["id"]
          },
        ]
      }
      norma_clausulas: {
        Row: {
          activa: boolean
          actualizado_en: string
          auditable: boolean
          creado_en: string
          id: string
          norma_id: string
          numero: string
          orden: number
          padre_id: string | null
          resumen: string | null
          titulo: string
        }
        Insert: {
          activa?: boolean
          actualizado_en?: string
          auditable?: boolean
          creado_en?: string
          id?: string
          norma_id: string
          numero: string
          orden?: number
          padre_id?: string | null
          resumen?: string | null
          titulo: string
        }
        Update: {
          activa?: boolean
          actualizado_en?: string
          auditable?: boolean
          creado_en?: string
          id?: string
          norma_id?: string
          numero?: string
          orden?: number
          padre_id?: string | null
          resumen?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "norma_clausulas_norma_id_fkey"
            columns: ["norma_id"]
            isOneToOne: false
            referencedRelation: "normas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "norma_clausulas_padre_id_fkey"
            columns: ["padre_id"]
            isOneToOne: false
            referencedRelation: "norma_clausulas"
            referencedColumns: ["id"]
          },
        ]
      }
      normas: {
        Row: {
          activa: boolean
          actualizado_en: string
          clave: string
          creado_en: string
          id: string
          nombre: string
          titulo: string | null
          version: string | null
        }
        Insert: {
          activa?: boolean
          actualizado_en?: string
          clave: string
          creado_en?: string
          id?: string
          nombre: string
          titulo?: string | null
          version?: string | null
        }
        Update: {
          activa?: boolean
          actualizado_en?: string
          clave?: string
          creado_en?: string
          id?: string
          nombre?: string
          titulo?: string | null
          version?: string | null
        }
        Relationships: []
      }
      notificaciones: {
        Row: {
          categoria: string
          creado_en: string
          cuerpo: string | null
          enlace: string | null
          id: string
          leida_en: string | null
          org_id: string
          titulo: string
          usuario_id: string
        }
        Insert: {
          categoria: string
          creado_en?: string
          cuerpo?: string | null
          enlace?: string | null
          id?: string
          leida_en?: string | null
          org_id: string
          titulo: string
          usuario_id: string
        }
        Update: {
          categoria?: string
          creado_en?: string
          cuerpo?: string | null
          enlace?: string | null
          id?: string
          leida_en?: string | null
          org_id?: string
          titulo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      organizaciones: {
        Row: {
          actualizado_en: string
          creado_en: string
          creado_por: string | null
          estado: string
          giro: string | null
          id: string
          logotipo_url: string | null
          nombre_comercial: string | null
          notas: string | null
          razon_social: string
          rfc: string | null
          tamano: string | null
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          creado_por?: string | null
          estado?: string
          giro?: string | null
          id?: string
          logotipo_url?: string | null
          nombre_comercial?: string | null
          notas?: string | null
          razon_social: string
          rfc?: string | null
          tamano?: string | null
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          creado_por?: string | null
          estado?: string
          giro?: string | null
          id?: string
          logotipo_url?: string | null
          nombre_comercial?: string | null
          notas?: string | null
          razon_social?: string
          rfc?: string | null
          tamano?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizaciones_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      preferencias_tablero: {
        Row: {
          actualizado_en: string
          orden: string[]
          usuario_id: string
        }
        Insert: {
          actualizado_en?: string
          orden?: string[]
          usuario_id: string
        }
        Update: {
          actualizado_en?: string
          orden?: string[]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preferencias_tablero_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      proyecto_normas: {
        Row: {
          creado_en: string
          creado_por: string | null
          norma_id: string
          org_id: string
          proyecto_id: string
        }
        Insert: {
          creado_en?: string
          creado_por?: string | null
          norma_id: string
          org_id: string
          proyecto_id: string
        }
        Update: {
          creado_en?: string
          creado_por?: string | null
          norma_id?: string
          org_id?: string
          proyecto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proyecto_normas_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_normas_norma_id_fkey"
            columns: ["norma_id"]
            isOneToOne: false
            referencedRelation: "normas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_normas_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_normas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      proyecto_sitios: {
        Row: {
          creado_en: string
          creado_por: string | null
          org_id: string
          proyecto_id: string
          sitio_id: string
        }
        Insert: {
          creado_en?: string
          creado_por?: string | null
          org_id: string
          proyecto_id: string
          sitio_id: string
        }
        Update: {
          creado_en?: string
          creado_por?: string | null
          org_id?: string
          proyecto_id?: string
          sitio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proyecto_sitios_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_sitios_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_sitios_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_sitios_sitio_id_fkey"
            columns: ["sitio_id"]
            isOneToOne: false
            referencedRelation: "sitios"
            referencedColumns: ["id"]
          },
        ]
      }
      proyectos: {
        Row: {
          actualizado_en: string
          creado_en: string
          creado_por: string | null
          estado: string
          etapa: string
          fecha_fin_estimada: string | null
          fecha_fin_real: string | null
          fecha_inicio: string | null
          id: string
          lider_id: string | null
          moneda: string
          monto: number | null
          nombre: string
          objetivo: string | null
          org_id: string
          tipo: string
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          creado_por?: string | null
          estado?: string
          etapa?: string
          fecha_fin_estimada?: string | null
          fecha_fin_real?: string | null
          fecha_inicio?: string | null
          id?: string
          lider_id?: string | null
          moneda?: string
          monto?: number | null
          nombre: string
          objetivo?: string | null
          org_id: string
          tipo?: string
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          creado_por?: string | null
          estado?: string
          etapa?: string
          fecha_fin_estimada?: string | null
          fecha_fin_real?: string | null
          fecha_inicio?: string | null
          id?: string
          lider_id?: string | null
          moneda?: string
          monto?: number | null
          nombre?: string
          objetivo?: string | null
          org_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      sitios: {
        Row: {
          activo: boolean
          actualizado_en: string
          cp: string | null
          creado_en: string
          creado_por: string | null
          direccion: string | null
          entidad: string | null
          id: string
          municipio: string | null
          nombre: string
          notas: string | null
          num_trabajadores: number | null
          org_id: string
          tipo: string
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          cp?: string | null
          creado_en?: string
          creado_por?: string | null
          direccion?: string | null
          entidad?: string | null
          id?: string
          municipio?: string | null
          nombre: string
          notas?: string | null
          num_trabajadores?: number | null
          org_id: string
          tipo?: string
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          cp?: string | null
          creado_en?: string
          creado_por?: string | null
          direccion?: string | null
          entidad?: string | null
          id?: string
          municipio?: string | null
          nombre?: string
          notas?: string | null
          num_trabajadores?: number | null
          org_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "sitios_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sitios_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          activo: boolean
          actualizado_en: string
          avatar_url: string | null
          certificaciones: string[]
          correo: string
          creado_en: string
          id: string
          nombre: string
          rol: string
          telefono: string | null
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          avatar_url?: string | null
          certificaciones?: string[]
          correo: string
          creado_en?: string
          id: string
          nombre: string
          rol?: string
          telefono?: string | null
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          avatar_url?: string | null
          certificaciones?: string[]
          correo?: string
          creado_en?: string
          id?: string
          nombre?: string
          rol?: string
          telefono?: string | null
        }
        Relationships: []
      }
      usuarios_organizaciones: {
        Row: {
          creado_en: string
          creado_por: string | null
          org_id: string
          papel: string
          usuario_id: string
        }
        Insert: {
          creado_en?: string
          creado_por?: string | null
          org_id: string
          papel?: string
          usuario_id: string
        }
        Update: {
          creado_en?: string
          creado_por?: string | null
          org_id?: string
          papel?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_organizaciones_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_organizaciones_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_organizaciones_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      es_socio: { Args: never; Returns: boolean }
      mis_organizaciones: { Args: never; Returns: string[] }
      puedo_editar_org: { Args: { p_org: string }; Returns: boolean }
      registrar_inicio_sesion: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
