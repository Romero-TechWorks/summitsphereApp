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
      adjuntos: {
        Row: {
          creado_en: string
          creado_por: string | null
          documento_id: string | null
          hallazgo_id: string | null
          id: string
          item_id: string | null
          nombre: string
          org_id: string
          ruta: string
          subido_desde: string
          tamano: number | null
          tarea_etapa_id: string | null
          tipo_mime: string | null
          titulo: string | null
        }
        Insert: {
          creado_en?: string
          creado_por?: string | null
          documento_id?: string | null
          hallazgo_id?: string | null
          id?: string
          item_id?: string | null
          nombre: string
          org_id: string
          ruta: string
          subido_desde?: string
          tamano?: number | null
          tarea_etapa_id?: string | null
          tipo_mime?: string | null
          titulo?: string | null
        }
        Update: {
          creado_en?: string
          creado_por?: string | null
          documento_id?: string | null
          hallazgo_id?: string | null
          id?: string
          item_id?: string | null
          nombre?: string
          org_id?: string
          ruta?: string
          subido_desde?: string
          tamano?: number | null
          tarea_etapa_id?: string | null
          tipo_mime?: string | null
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adjuntos_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjuntos_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjuntos_hallazgo_id_fkey"
            columns: ["hallazgo_id"]
            isOneToOne: false
            referencedRelation: "hallazgos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjuntos_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "auditoria_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjuntos_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjuntos_tarea_etapa_id_fkey"
            columns: ["tarea_etapa_id"]
            isOneToOne: false
            referencedRelation: "tareas_etapa"
            referencedColumns: ["id"]
          },
        ]
      }
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
      auditoria_agenda: {
        Row: {
          actualizado_en: string
          auditado: string | null
          auditor_id: string | null
          auditoria_id: string
          contacto_id: string | null
          creado_en: string
          creado_por: string | null
          cumplido: boolean
          fecha: string
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          nota: string | null
          orden: number
          org_id: string
          proceso_id: string | null
          sitio_id: string | null
          tema: string
        }
        Insert: {
          actualizado_en?: string
          auditado?: string | null
          auditor_id?: string | null
          auditoria_id: string
          contacto_id?: string | null
          creado_en?: string
          creado_por?: string | null
          cumplido?: boolean
          fecha: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          nota?: string | null
          orden?: number
          org_id: string
          proceso_id?: string | null
          sitio_id?: string | null
          tema: string
        }
        Update: {
          actualizado_en?: string
          auditado?: string | null
          auditor_id?: string | null
          auditoria_id?: string
          contacto_id?: string | null
          creado_en?: string
          creado_por?: string | null
          cumplido?: boolean
          fecha?: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          nota?: string | null
          orden?: number
          org_id?: string
          proceso_id?: string | null
          sitio_id?: string | null
          tema?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_agenda_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_agenda_auditoria_id_fkey"
            columns: ["auditoria_id"]
            isOneToOne: false
            referencedRelation: "auditorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_agenda_contacto_id_fkey"
            columns: ["contacto_id"]
            isOneToOne: false
            referencedRelation: "contactos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_agenda_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_agenda_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_agenda_proceso_id_fkey"
            columns: ["proceso_id"]
            isOneToOne: false
            referencedRelation: "procesos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_agenda_sitio_id_fkey"
            columns: ["sitio_id"]
            isOneToOne: false
            referencedRelation: "sitios"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria_equipo: {
        Row: {
          auditoria_id: string
          creado_en: string
          creado_por: string | null
          org_id: string
          papel: string
          usuario_id: string
        }
        Insert: {
          auditoria_id: string
          creado_en?: string
          creado_por?: string | null
          org_id: string
          papel?: string
          usuario_id: string
        }
        Update: {
          auditoria_id?: string
          creado_en?: string
          creado_por?: string | null
          org_id?: string
          papel?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_equipo_auditoria_id_fkey"
            columns: ["auditoria_id"]
            isOneToOne: false
            referencedRelation: "auditorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_equipo_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_equipo_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_equipo_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria_items: {
        Row: {
          actualizado_en: string
          auditoria_id: string
          clausula_id: string | null
          creado_en: string
          creado_por: string | null
          evaluado_en: string | null
          evaluado_por: string | null
          id: string
          nota: string | null
          orden: number
          org_id: string
          pregunta: string
          proceso_id: string | null
          veredicto: string
        }
        Insert: {
          actualizado_en?: string
          auditoria_id: string
          clausula_id?: string | null
          creado_en?: string
          creado_por?: string | null
          evaluado_en?: string | null
          evaluado_por?: string | null
          id?: string
          nota?: string | null
          orden?: number
          org_id: string
          pregunta: string
          proceso_id?: string | null
          veredicto?: string
        }
        Update: {
          actualizado_en?: string
          auditoria_id?: string
          clausula_id?: string | null
          creado_en?: string
          creado_por?: string | null
          evaluado_en?: string | null
          evaluado_por?: string | null
          id?: string
          nota?: string | null
          orden?: number
          org_id?: string
          pregunta?: string
          proceso_id?: string | null
          veredicto?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_items_auditoria_id_fkey"
            columns: ["auditoria_id"]
            isOneToOne: false
            referencedRelation: "auditorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_items_clausula_id_fkey"
            columns: ["clausula_id"]
            isOneToOne: false
            referencedRelation: "norma_clausulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_items_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_items_evaluado_por_fkey"
            columns: ["evaluado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_items_proceso_id_fkey"
            columns: ["proceso_id"]
            isOneToOne: false
            referencedRelation: "procesos"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria_normas: {
        Row: {
          auditoria_id: string
          creado_en: string
          creado_por: string | null
          norma_id: string
          org_id: string
        }
        Insert: {
          auditoria_id: string
          creado_en?: string
          creado_por?: string | null
          norma_id: string
          org_id: string
        }
        Update: {
          auditoria_id?: string
          creado_en?: string
          creado_por?: string | null
          norma_id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_normas_auditoria_id_fkey"
            columns: ["auditoria_id"]
            isOneToOne: false
            referencedRelation: "auditorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_normas_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_normas_norma_id_fkey"
            columns: ["norma_id"]
            isOneToOne: false
            referencedRelation: "normas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_normas_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria_procesos: {
        Row: {
          auditoria_id: string
          creado_en: string
          creado_por: string | null
          org_id: string
          proceso_id: string
        }
        Insert: {
          auditoria_id: string
          creado_en?: string
          creado_por?: string | null
          org_id: string
          proceso_id: string
        }
        Update: {
          auditoria_id?: string
          creado_en?: string
          creado_por?: string | null
          org_id?: string
          proceso_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_procesos_auditoria_id_fkey"
            columns: ["auditoria_id"]
            isOneToOne: false
            referencedRelation: "auditorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_procesos_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_procesos_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_procesos_proceso_id_fkey"
            columns: ["proceso_id"]
            isOneToOne: false
            referencedRelation: "procesos"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria_sitios: {
        Row: {
          auditoria_id: string
          creado_en: string
          creado_por: string | null
          org_id: string
          sitio_id: string
        }
        Insert: {
          auditoria_id: string
          creado_en?: string
          creado_por?: string | null
          org_id: string
          sitio_id: string
        }
        Update: {
          auditoria_id?: string
          creado_en?: string
          creado_por?: string | null
          org_id?: string
          sitio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_sitios_auditoria_id_fkey"
            columns: ["auditoria_id"]
            isOneToOne: false
            referencedRelation: "auditorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_sitios_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_sitios_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_sitios_sitio_id_fkey"
            columns: ["sitio_id"]
            isOneToOne: false
            referencedRelation: "sitios"
            referencedColumns: ["id"]
          },
        ]
      }
      auditorias: {
        Row: {
          actualizado_en: string
          alcance: string | null
          auditor_lider_id: string | null
          cerrada_en: string | null
          cerrada_por_id: string | null
          conclusiones: string | null
          creado_en: string
          creado_por: string | null
          criterios: string | null
          estado: string
          fecha_fin: string | null
          fecha_inicio: string | null
          folio: string | null
          id: string
          informe_emitido_en: string | null
          metodologia: string | null
          objetivo: string | null
          org_id: string
          programa_id: string | null
          proyecto_id: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          actualizado_en?: string
          alcance?: string | null
          auditor_lider_id?: string | null
          cerrada_en?: string | null
          cerrada_por_id?: string | null
          conclusiones?: string | null
          creado_en?: string
          creado_por?: string | null
          criterios?: string | null
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          folio?: string | null
          id?: string
          informe_emitido_en?: string | null
          metodologia?: string | null
          objetivo?: string | null
          org_id: string
          programa_id?: string | null
          proyecto_id?: string | null
          tipo?: string
          titulo: string
        }
        Update: {
          actualizado_en?: string
          alcance?: string | null
          auditor_lider_id?: string | null
          cerrada_en?: string | null
          cerrada_por_id?: string | null
          conclusiones?: string | null
          creado_en?: string
          creado_por?: string | null
          criterios?: string | null
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          folio?: string | null
          id?: string
          informe_emitido_en?: string | null
          metodologia?: string | null
          objetivo?: string | null
          org_id?: string
          programa_id?: string | null
          proyecto_id?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditorias_auditor_lider_id_fkey"
            columns: ["auditor_lider_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditorias_cerrada_por_id_fkey"
            columns: ["cerrada_por_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditorias_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditorias_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditorias_programa_id_fkey"
            columns: ["programa_id"]
            isOneToOne: false
            referencedRelation: "programa_auditorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditorias_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
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
      documento_clausulas: {
        Row: {
          clausula_id: string
          creado_en: string
          creado_por: string | null
          documento_id: string
          org_id: string
        }
        Insert: {
          clausula_id: string
          creado_en?: string
          creado_por?: string | null
          documento_id: string
          org_id: string
        }
        Update: {
          clausula_id?: string
          creado_en?: string
          creado_por?: string | null
          documento_id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documento_clausulas_clausula_id_fkey"
            columns: ["clausula_id"]
            isOneToOne: false
            referencedRelation: "norma_clausulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_clausulas_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_clausulas_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_clausulas_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_versiones: {
        Row: {
          actualizado_en: string
          aprobo_id: string | null
          archivo_nombre: string | null
          archivo_ruta: string | null
          archivo_tamano: number | null
          archivo_tipo: string | null
          avisos_conversion: string[]
          control_cambios: string | null
          creado_en: string
          creado_por: string | null
          documento_id: string
          elaboro_id: string | null
          estado: string
          fecha_aprobacion: string | null
          fecha_elaboracion: string | null
          fecha_vigencia: string | null
          id: string
          markdown: string | null
          org_id: string
          origen_markdown: string | null
          reviso_id: string | null
          version: string
        }
        Insert: {
          actualizado_en?: string
          aprobo_id?: string | null
          archivo_nombre?: string | null
          archivo_ruta?: string | null
          archivo_tamano?: number | null
          archivo_tipo?: string | null
          avisos_conversion?: string[]
          control_cambios?: string | null
          creado_en?: string
          creado_por?: string | null
          documento_id: string
          elaboro_id?: string | null
          estado?: string
          fecha_aprobacion?: string | null
          fecha_elaboracion?: string | null
          fecha_vigencia?: string | null
          id?: string
          markdown?: string | null
          org_id: string
          origen_markdown?: string | null
          reviso_id?: string | null
          version: string
        }
        Update: {
          actualizado_en?: string
          aprobo_id?: string | null
          archivo_nombre?: string | null
          archivo_ruta?: string | null
          archivo_tamano?: number | null
          archivo_tipo?: string | null
          avisos_conversion?: string[]
          control_cambios?: string | null
          creado_en?: string
          creado_por?: string | null
          documento_id?: string
          elaboro_id?: string | null
          estado?: string
          fecha_aprobacion?: string | null
          fecha_elaboracion?: string | null
          fecha_vigencia?: string | null
          id?: string
          markdown?: string | null
          org_id?: string
          origen_markdown?: string | null
          reviso_id?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "documento_versiones_aprobo_id_fkey"
            columns: ["aprobo_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_versiones_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_versiones_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_versiones_elaboro_id_fkey"
            columns: ["elaboro_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_versiones_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_versiones_reviso_id_fkey"
            columns: ["reviso_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          actualizado_en: string
          codigo: string
          creado_en: string
          creado_por: string | null
          estado: string
          id: string
          org_id: string
          proceso_id: string | null
          proyecto_id: string | null
          tipo: string
          titulo: string
          version_vigente_id: string | null
        }
        Insert: {
          actualizado_en?: string
          codigo: string
          creado_en?: string
          creado_por?: string | null
          estado?: string
          id?: string
          org_id: string
          proceso_id?: string | null
          proyecto_id?: string | null
          tipo?: string
          titulo: string
          version_vigente_id?: string | null
        }
        Update: {
          actualizado_en?: string
          codigo?: string
          creado_en?: string
          creado_por?: string | null
          estado?: string
          id?: string
          org_id?: string
          proceso_id?: string | null
          proyecto_id?: string | null
          tipo?: string
          titulo?: string
          version_vigente_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_proceso_id_fkey"
            columns: ["proceso_id"]
            isOneToOne: false
            referencedRelation: "procesos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_version_vigente_fkey"
            columns: ["version_vigente_id"]
            isOneToOne: false
            referencedRelation: "documento_versiones"
            referencedColumns: ["id"]
          },
        ]
      }
      hallazgos: {
        Row: {
          actualizado_en: string
          auditoria_id: string
          cerrado_en: string | null
          cerrado_por_id: string | null
          clausula_id: string
          consecutivo: number
          creado_en: string
          creado_por: string | null
          descripcion: string
          detectado_en: string | null
          estado: string
          evidencia_objetiva: string
          fecha_compromiso: string | null
          folio: string
          id: string
          item_id: string | null
          motivo_anulacion: string | null
          motivo_cambio: string | null
          org_id: string
          proceso_id: string | null
          requisito_incumplido: string | null
          responsable_contacto_id: string | null
          sitio_id: string | null
          tipo: string
        }
        Insert: {
          actualizado_en?: string
          auditoria_id: string
          cerrado_en?: string | null
          cerrado_por_id?: string | null
          clausula_id: string
          consecutivo: number
          creado_en?: string
          creado_por?: string | null
          descripcion: string
          detectado_en?: string | null
          estado?: string
          evidencia_objetiva: string
          fecha_compromiso?: string | null
          folio: string
          id?: string
          item_id?: string | null
          motivo_anulacion?: string | null
          motivo_cambio?: string | null
          org_id: string
          proceso_id?: string | null
          requisito_incumplido?: string | null
          responsable_contacto_id?: string | null
          sitio_id?: string | null
          tipo?: string
        }
        Update: {
          actualizado_en?: string
          auditoria_id?: string
          cerrado_en?: string | null
          cerrado_por_id?: string | null
          clausula_id?: string
          consecutivo?: number
          creado_en?: string
          creado_por?: string | null
          descripcion?: string
          detectado_en?: string | null
          estado?: string
          evidencia_objetiva?: string
          fecha_compromiso?: string | null
          folio?: string
          id?: string
          item_id?: string | null
          motivo_anulacion?: string | null
          motivo_cambio?: string | null
          org_id?: string
          proceso_id?: string | null
          requisito_incumplido?: string | null
          responsable_contacto_id?: string | null
          sitio_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "hallazgos_auditoria_id_fkey"
            columns: ["auditoria_id"]
            isOneToOne: false
            referencedRelation: "auditorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hallazgos_cerrado_por_id_fkey"
            columns: ["cerrado_por_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hallazgos_clausula_id_fkey"
            columns: ["clausula_id"]
            isOneToOne: false
            referencedRelation: "norma_clausulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hallazgos_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hallazgos_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "auditoria_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hallazgos_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hallazgos_proceso_id_fkey"
            columns: ["proceso_id"]
            isOneToOne: false
            referencedRelation: "procesos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hallazgos_responsable_contacto_id_fkey"
            columns: ["responsable_contacto_id"]
            isOneToOne: false
            referencedRelation: "contactos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hallazgos_sitio_id_fkey"
            columns: ["sitio_id"]
            isOneToOne: false
            referencedRelation: "sitios"
            referencedColumns: ["id"]
          },
        ]
      }
      hallazgos_historial: {
        Row: {
          antes: string | null
          campo: string
          despues: string | null
          hallazgo_id: string
          hecho_en: string
          hecho_por: string | null
          id: string
          motivo: string | null
          org_id: string
        }
        Insert: {
          antes?: string | null
          campo: string
          despues?: string | null
          hallazgo_id: string
          hecho_en?: string
          hecho_por?: string | null
          id?: string
          motivo?: string | null
          org_id: string
        }
        Update: {
          antes?: string | null
          campo?: string
          despues?: string | null
          hallazgo_id?: string
          hecho_en?: string
          hecho_por?: string | null
          id?: string
          motivo?: string | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hallazgos_historial_hallazgo_id_fkey"
            columns: ["hallazgo_id"]
            isOneToOne: false
            referencedRelation: "hallazgos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hallazgos_historial_hecho_por_fkey"
            columns: ["hecho_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hallazgos_historial_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      indicadores: {
        Row: {
          activo: boolean
          actualizado_en: string
          creado_en: string
          creado_por: string | null
          formula: string | null
          frecuencia: string
          id: string
          meta: number | null
          nombre: string
          org_id: string
          proceso_id: string | null
          responsable_id: string | null
          sentido: string
          unidad: string | null
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          creado_en?: string
          creado_por?: string | null
          formula?: string | null
          frecuencia?: string
          id?: string
          meta?: number | null
          nombre: string
          org_id: string
          proceso_id?: string | null
          responsable_id?: string | null
          sentido?: string
          unidad?: string | null
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          creado_en?: string
          creado_por?: string | null
          formula?: string | null
          frecuencia?: string
          id?: string
          meta?: number | null
          nombre?: string
          org_id?: string
          proceso_id?: string | null
          responsable_id?: string | null
          sentido?: string
          unidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indicadores_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicadores_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicadores_proceso_id_fkey"
            columns: ["proceso_id"]
            isOneToOne: false
            referencedRelation: "procesos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicadores_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      mediciones: {
        Row: {
          comentario: string | null
          creado_en: string
          creado_por: string | null
          id: string
          indicador_id: string
          org_id: string
          periodo: string
          valor: number
        }
        Insert: {
          comentario?: string | null
          creado_en?: string
          creado_por?: string | null
          id?: string
          indicador_id: string
          org_id: string
          periodo: string
          valor: number
        }
        Update: {
          comentario?: string | null
          creado_en?: string
          creado_por?: string | null
          id?: string
          indicador_id?: string
          org_id?: string
          periodo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "mediciones_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mediciones_indicador_id_fkey"
            columns: ["indicador_id"]
            isOneToOne: false
            referencedRelation: "indicadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mediciones_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
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
          es_demo: boolean
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
          es_demo?: boolean
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
          es_demo?: boolean
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
          es_demo: boolean
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
          es_demo?: boolean
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
          es_demo?: boolean
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
          es_demo: boolean
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
          es_demo?: boolean
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
          es_demo?: boolean
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
      procesos: {
        Row: {
          activo: boolean
          actualizado_en: string
          codigo: string | null
          creado_en: string
          creado_por: string | null
          dueno_contacto_id: string | null
          entradas: string | null
          id: string
          nombre: string
          objetivo: string | null
          orden: number
          org_id: string
          salidas: string | null
          tipo: string
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          codigo?: string | null
          creado_en?: string
          creado_por?: string | null
          dueno_contacto_id?: string | null
          entradas?: string | null
          id?: string
          nombre: string
          objetivo?: string | null
          orden?: number
          org_id: string
          salidas?: string | null
          tipo?: string
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          codigo?: string | null
          creado_en?: string
          creado_por?: string | null
          dueno_contacto_id?: string | null
          entradas?: string | null
          id?: string
          nombre?: string
          objetivo?: string | null
          orden?: number
          org_id?: string
          salidas?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "procesos_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procesos_dueno_contacto_id_fkey"
            columns: ["dueno_contacto_id"]
            isOneToOne: false
            referencedRelation: "contactos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procesos_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      programa_auditorias: {
        Row: {
          actualizado_en: string
          alcance: string | null
          anio: number
          aprobado_en: string | null
          aprobado_por_id: string | null
          creado_en: string
          creado_por: string | null
          criterios: string | null
          estado: string
          id: string
          nombre: string
          objetivo: string | null
          org_id: string
        }
        Insert: {
          actualizado_en?: string
          alcance?: string | null
          anio: number
          aprobado_en?: string | null
          aprobado_por_id?: string | null
          creado_en?: string
          creado_por?: string | null
          criterios?: string | null
          estado?: string
          id?: string
          nombre: string
          objetivo?: string | null
          org_id: string
        }
        Update: {
          actualizado_en?: string
          alcance?: string | null
          anio?: number
          aprobado_en?: string | null
          aprobado_por_id?: string | null
          creado_en?: string
          creado_por?: string | null
          criterios?: string | null
          estado?: string
          id?: string
          nombre?: string
          objetivo?: string | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "programa_auditorias_aprobado_por_id_fkey"
            columns: ["aprobado_por_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programa_auditorias_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programa_auditorias_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      programa_procesos: {
        Row: {
          actualizado_en: string
          auditorias_requeridas: number | null
          creado_en: string
          creado_por: string | null
          id: string
          meses: Json
          nc_previas: number
          nota: string | null
          orden: number
          org_id: string
          proceso_id: string
          programa_id: string
          puntos: number | null
          valor: number
        }
        Insert: {
          actualizado_en?: string
          auditorias_requeridas?: number | null
          creado_en?: string
          creado_por?: string | null
          id?: string
          meses?: Json
          nc_previas?: number
          nota?: string | null
          orden?: number
          org_id: string
          proceso_id: string
          programa_id: string
          puntos?: number | null
          valor: number
        }
        Update: {
          actualizado_en?: string
          auditorias_requeridas?: number | null
          creado_en?: string
          creado_por?: string | null
          id?: string
          meses?: Json
          nc_previas?: number
          nota?: string | null
          orden?: number
          org_id?: string
          proceso_id?: string
          programa_id?: string
          puntos?: number | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "programa_procesos_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programa_procesos_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programa_procesos_proceso_id_fkey"
            columns: ["proceso_id"]
            isOneToOne: false
            referencedRelation: "procesos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programa_procesos_programa_id_fkey"
            columns: ["programa_id"]
            isOneToOne: false
            referencedRelation: "programa_auditorias"
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
      requisitos: {
        Row: {
          actualizado_en: string
          clausula_id: string
          creado_en: string
          creado_por: string | null
          estado: string
          evaluado_en: string | null
          evaluado_por: string | null
          id: string
          justificacion: string | null
          observaciones: string | null
          org_id: string
          proyecto_id: string
          responsable_id: string | null
        }
        Insert: {
          actualizado_en?: string
          clausula_id: string
          creado_en?: string
          creado_por?: string | null
          estado?: string
          evaluado_en?: string | null
          evaluado_por?: string | null
          id?: string
          justificacion?: string | null
          observaciones?: string | null
          org_id: string
          proyecto_id: string
          responsable_id?: string | null
        }
        Update: {
          actualizado_en?: string
          clausula_id?: string
          creado_en?: string
          creado_por?: string | null
          estado?: string
          evaluado_en?: string | null
          evaluado_por?: string | null
          id?: string
          justificacion?: string | null
          observaciones?: string | null
          org_id?: string
          proyecto_id?: string
          responsable_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requisitos_clausula_id_fkey"
            columns: ["clausula_id"]
            isOneToOne: false
            referencedRelation: "norma_clausulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitos_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitos_evaluado_por_fkey"
            columns: ["evaluado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitos_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitos_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      riesgos: {
        Row: {
          actualizado_en: string
          causa: string | null
          consecuencia: string | null
          creado_en: string
          creado_por: string | null
          descripcion: string
          fecha_revision: string | null
          id: string
          impacto: number
          nivel: number | null
          org_id: string
          plan: string | null
          probabilidad: number
          proceso_id: string | null
          responsable_id: string | null
          tipo: string
          tratamiento: string | null
        }
        Insert: {
          actualizado_en?: string
          causa?: string | null
          consecuencia?: string | null
          creado_en?: string
          creado_por?: string | null
          descripcion: string
          fecha_revision?: string | null
          id?: string
          impacto?: number
          nivel?: number | null
          org_id: string
          plan?: string | null
          probabilidad?: number
          proceso_id?: string | null
          responsable_id?: string | null
          tipo?: string
          tratamiento?: string | null
        }
        Update: {
          actualizado_en?: string
          causa?: string | null
          consecuencia?: string | null
          creado_en?: string
          creado_por?: string | null
          descripcion?: string
          fecha_revision?: string | null
          id?: string
          impacto?: number
          nivel?: number | null
          org_id?: string
          plan?: string | null
          probabilidad?: number
          proceso_id?: string | null
          responsable_id?: string | null
          tipo?: string
          tratamiento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "riesgos_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riesgos_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riesgos_proceso_id_fkey"
            columns: ["proceso_id"]
            isOneToOne: false
            referencedRelation: "procesos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riesgos_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
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
      tareas_etapa: {
        Row: {
          actualizado_en: string
          creado_en: string
          creado_por: string | null
          detalle: string | null
          estado: string
          etapa: string
          exige_evidencia: boolean
          fecha_compromiso: string | null
          hecha_en: string | null
          hecha_por: string | null
          id: string
          orden: number
          org_id: string
          proyecto_id: string
          responsable_id: string | null
          titulo: string
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          creado_por?: string | null
          detalle?: string | null
          estado?: string
          etapa: string
          exige_evidencia?: boolean
          fecha_compromiso?: string | null
          hecha_en?: string | null
          hecha_por?: string | null
          id?: string
          orden?: number
          org_id: string
          proyecto_id: string
          responsable_id?: string | null
          titulo: string
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          creado_por?: string | null
          detalle?: string | null
          estado?: string
          etapa?: string
          exige_evidencia?: boolean
          fecha_compromiso?: string | null
          hecha_en?: string | null
          hecha_por?: string | null
          id?: string
          orden?: number
          org_id?: string
          proyecto_id?: string
          responsable_id?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareas_etapa_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_etapa_hecha_por_fkey"
            columns: ["hecha_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_etapa_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_etapa_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_etapa_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
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
          es_dev: boolean
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
          es_dev?: boolean
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
          es_dev?: boolean
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
      generar_lista_verificacion: {
        Args: { p_auditoria: string }
        Returns: number
      }
      meses_de_programa_validos: { Args: { p: Json }; Returns: boolean }
      mis_organizaciones: { Args: never; Returns: string[] }
      org_de_la_ruta: { Args: { p_ruta: string }; Returns: string }
      pgp_armor_headers: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      puedo_borrar_documento: {
        Args: { p_documento: string }
        Returns: boolean
      }
      puedo_borrar_org: { Args: { p_org: string }; Returns: boolean }
      puedo_borrar_proyecto: { Args: { p_proyecto: string }; Returns: boolean }
      puedo_editar_org: { Args: { p_org: string }; Returns: boolean }
      registrar_inicio_sesion: { Args: never; Returns: undefined }
      soy_dev: { Args: never; Returns: boolean }
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

