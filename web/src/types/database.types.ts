// Database types generated from Supabase
// Regenerate with: supabase gen types typescript --local > web/src/types/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'projects_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          status: string;
          due_date: string;
          urgency: string;
          project_id: string | null;
          created_at: string;
          completed_date: string | null;
          follow_up_item: boolean;
          url1: string | null;
          url2: string | null;
          url3: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          status?: string;
          due_date?: string;
          urgency?: string;
          project_id?: string | null;
          created_at?: string;
          completed_date?: string | null;
          follow_up_item?: boolean;
          url1?: string | null;
          url2?: string | null;
          url3?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          status?: string;
          due_date?: string;
          urgency?: string;
          project_id?: string | null;
          created_at?: string;
          completed_date?: string | null;
          follow_up_item?: boolean;
          url1?: string | null;
          url2?: string | null;
          url3?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_tasks_with_projects: {
        Args: {
          user_uuid: string;
          task_status?: string;
          search_term?: string;
          project_uuid?: string;
          from_date?: string;
          to_date?: string;
        };
        Returns: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          status: string;
          due_date: string;
          urgency: string;
          project_id: string | null;
          project_name: string | null;
          project_description: string | null;
          created_at: string;
          completed_date: string | null;
          follow_up_item: boolean;
          url1: string | null;
          url2: string | null;
          url3: string | null;
          updated_at: string;
        }[];
      };
      get_project_stats: {
        Args: {
          user_uuid: string;
        };
        Returns: {
          id: string;
          name: string;
          description: string | null;
          status: string;
          total_tasks: number;
          open_tasks: number;
          completed_tasks: number;
          created_at: string;
          updated_at: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

