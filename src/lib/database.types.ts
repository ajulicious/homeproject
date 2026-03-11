export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          title: string
          order_index: number
        }
        Insert: {
          id?: string
          title: string
          order_index: number
        }
        Update: {
          id?: string
          title?: string
          order_index?: number
        }
      }
      tasks: {
        Row: {
          id: string
          category_id: string
          title: string
          status_type: string | null
          planned_weeks: number[] | null
        }
        Insert: {
          id?: string
          category_id: string
          title: string
          status_type?: string | null
          planned_weeks?: number[] | null
        }
        Update: {
          id?: string
          category_id?: string
          title?: string
          status_type?: string | null
          planned_weeks?: number[] | null
        }
      }
      progress_reports: {
        Row: {
          id: string
          task_id: string
          week: number
          status: 'not_started' | 'in_progress' | 'done'
          proof_image_url: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          task_id: string
          week: number
          status?: 'not_started' | 'in_progress' | 'done'
          proof_image_url?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          week?: number
          status?: 'not_started' | 'in_progress' | 'done'
          proof_image_url?: string | null
          notes?: string | null
          updated_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          type: 'material_purchase' | 'labor_cost'
          amount: number
          description: string
          receipt_image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          type: 'material_purchase' | 'labor_cost'
          amount: number
          description: string
          receipt_image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          type?: 'material_purchase' | 'labor_cost'
          amount?: number
          description?: string
          receipt_image_url?: string | null
          created_at?: string
        }
      }
    }
  }
}
