export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      agent_runs: {
        Row: {
          actor_id: string;
          actor_type: string;
          agent_name: string;
          agent_version: number;
          completed_at: string | null;
          confidence_x100: number | null;
          cost_cents: number | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string | null;
          error: string | null;
          id: string;
          input: Json | null;
          input_tokens: number | null;
          langfuse_trace_id: string | null;
          model_name: string | null;
          model_provider: string | null;
          output: Json | null;
          output_tokens: number | null;
          parent_run_id: string | null;
          requires_approval_int: number | null;
          risk_flags: Json | null;
          risk_level: Database["public"]["Enums"]["risk_level"] | null;
          started_at: string;
          status: Database["public"]["Enums"]["agent_run_status"];
          trigger_source: string;
          updated_at: string;
          workflow_step: string;
        };
        Insert: {
          actor_id: string;
          actor_type: string;
          agent_name: string;
          agent_version: number;
          completed_at?: string | null;
          confidence_x100?: number | null;
          cost_cents?: number | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          error?: string | null;
          id?: string;
          input?: Json | null;
          input_tokens?: number | null;
          langfuse_trace_id?: string | null;
          model_name?: string | null;
          model_provider?: string | null;
          output?: Json | null;
          output_tokens?: number | null;
          parent_run_id?: string | null;
          requires_approval_int?: number | null;
          risk_flags?: Json | null;
          risk_level?: Database["public"]["Enums"]["risk_level"] | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["agent_run_status"];
          trigger_source: string;
          updated_at?: string;
          workflow_step: string;
        };
        Update: {
          actor_id?: string;
          actor_type?: string;
          agent_name?: string;
          agent_version?: number;
          completed_at?: string | null;
          confidence_x100?: number | null;
          cost_cents?: number | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          error?: string | null;
          id?: string;
          input?: Json | null;
          input_tokens?: number | null;
          langfuse_trace_id?: string | null;
          model_name?: string | null;
          model_provider?: string | null;
          output?: Json | null;
          output_tokens?: number | null;
          parent_run_id?: string | null;
          requires_approval_int?: number | null;
          risk_flags?: Json | null;
          risk_level?: Database["public"]["Enums"]["risk_level"] | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["agent_run_status"];
          trigger_source?: string;
          updated_at?: string;
          workflow_step?: string;
        };
        Relationships: [];
      };
      approval_requests: {
        Row: {
          agent_run_id: string | null;
          created_at: string;
          current_state: Json | null;
          description: string;
          entity_id: string;
          entity_type: string;
          expires_at: string | null;
          id: string;
          proposed_action: string;
          proposed_payload: Json | null;
          review_notes: string | null;
          reviewed_at: string | null;
          reviewed_by_id: string | null;
          risk_level: Database["public"]["Enums"]["risk_level"];
          status: Database["public"]["Enums"]["approval_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          agent_run_id?: string | null;
          created_at?: string;
          current_state?: Json | null;
          description: string;
          entity_id: string;
          entity_type: string;
          expires_at?: string | null;
          id?: string;
          proposed_action: string;
          proposed_payload?: Json | null;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by_id?: string | null;
          risk_level?: Database["public"]["Enums"]["risk_level"];
          status?: Database["public"]["Enums"]["approval_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          agent_run_id?: string | null;
          created_at?: string;
          current_state?: Json | null;
          description?: string;
          entity_id?: string;
          entity_type?: string;
          expires_at?: string | null;
          id?: string;
          proposed_action?: string;
          proposed_payload?: Json | null;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by_id?: string | null;
          risk_level?: Database["public"]["Enums"]["risk_level"];
          status?: Database["public"]["Enums"]["approval_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string;
          actor_type: Database["public"]["Enums"]["actor_type"];
          agent_run_id: string | null;
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          metadata: Json | null;
          updated_at: string;
        };
        Insert: {
          action: string;
          actor_id: string;
          actor_type: Database["public"]["Enums"]["actor_type"];
          agent_run_id?: string | null;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          metadata?: Json | null;
          updated_at?: string;
        };
        Update: {
          action?: string;
          actor_id?: string;
          actor_type?: Database["public"]["Enums"]["actor_type"];
          agent_run_id?: string | null;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          metadata?: Json | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      automation_preferences: {
        Row: {
          created_at: string;
          id: string;
          mode: Database["public"]["Enums"]["automation_mode"];
          updated_at: string;
          user_id: string;
          workflow_step: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          mode?: Database["public"]["Enums"]["automation_mode"];
          updated_at?: string;
          user_id: string;
          workflow_step: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          mode?: Database["public"]["Enums"]["automation_mode"];
          updated_at?: string;
          user_id?: string;
          workflow_step?: string;
        };
        Relationships: [
          {
            foreignKeyName: "automation_preferences_user_id_users_id_fk";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      consents: {
        Row: {
          consent_type: Database["public"]["Enums"]["consent_type"];
          created_at: string;
          granted_at: string | null;
          granted_by_actor_id: string | null;
          granted_by_actor_type: string | null;
          id: string;
          notes: string | null;
          revoked_at: string | null;
          subject_id: string;
          subject_type: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          consent_type: Database["public"]["Enums"]["consent_type"];
          created_at?: string;
          granted_at?: string | null;
          granted_by_actor_id?: string | null;
          granted_by_actor_type?: string | null;
          id?: string;
          notes?: string | null;
          revoked_at?: string | null;
          subject_id: string;
          subject_type: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          consent_type?: Database["public"]["Enums"]["consent_type"];
          created_at?: string;
          granted_at?: string | null;
          granted_by_actor_id?: string | null;
          granted_by_actor_type?: string | null;
          id?: string;
          notes?: string | null;
          revoked_at?: string | null;
          subject_id?: string;
          subject_type?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [];
      };
      drive_files: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          drive_url: string;
          entity_id: string;
          entity_type: string;
          folder_path: string | null;
          google_file_id: string;
          id: string;
          mime_type: string | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          drive_url: string;
          entity_id: string;
          entity_type: string;
          folder_path?: string | null;
          google_file_id: string;
          id?: string;
          mime_type?: string | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          drive_url?: string;
          entity_id?: string;
          entity_type?: string;
          folder_path?: string | null;
          google_file_id?: string;
          id?: string;
          mime_type?: string | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_threads: {
        Row: {
          bcc_emails: Json | null;
          cc_emails: Json | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string | null;
          from_email: string;
          gmail_thread_id: string | null;
          id: string;
          sent_at: string | null;
          subject: string;
          to_emails: Json;
          updated_at: string;
        };
        Insert: {
          bcc_emails?: Json | null;
          cc_emails?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          from_email: string;
          gmail_thread_id?: string | null;
          id?: string;
          sent_at?: string | null;
          subject: string;
          to_emails: Json;
          updated_at?: string;
        };
        Update: {
          bcc_emails?: Json | null;
          cc_emails?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          from_email?: string;
          gmail_thread_id?: string | null;
          id?: string;
          sent_at?: string | null;
          subject?: string;
          to_emails?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      google_tokens: {
        Row: {
          access_token_encrypted: string;
          created_at: string;
          expires_at: string;
          id: string;
          refresh_token_encrypted: string;
          scope: string;
          token_type: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          access_token_encrypted: string;
          created_at?: string;
          expires_at: string;
          id?: string;
          refresh_token_encrypted: string;
          scope: string;
          token_type: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          access_token_encrypted?: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          refresh_token_encrypted?: string;
          scope?: string;
          token_type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "google_tokens_user_id_users_id_fk";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          consent_data_processing: boolean;
          converted_at: string | null;
          converted_to_parent_id: string | null;
          created_at: string;
          deleted_at: string | null;
          id: string;
          message: string | null;
          parent_email: string;
          parent_name: string;
          parent_phone: string | null;
          risk_flags: Json | null;
          risk_level: Database["public"]["Enums"]["risk_level"] | null;
          score: number | null;
          scoring_reasoning: string | null;
          source: Database["public"]["Enums"]["lead_source"];
          source_meta: Json | null;
          status: Database["public"]["Enums"]["lead_status"];
          student_grade: string;
          subject_needed: string;
          updated_at: string;
        };
        Insert: {
          consent_data_processing?: boolean;
          converted_at?: string | null;
          converted_to_parent_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          message?: string | null;
          parent_email: string;
          parent_name: string;
          parent_phone?: string | null;
          risk_flags?: Json | null;
          risk_level?: Database["public"]["Enums"]["risk_level"] | null;
          score?: number | null;
          scoring_reasoning?: string | null;
          source?: Database["public"]["Enums"]["lead_source"];
          source_meta?: Json | null;
          status?: Database["public"]["Enums"]["lead_status"];
          student_grade: string;
          subject_needed: string;
          updated_at?: string;
        };
        Update: {
          consent_data_processing?: boolean;
          converted_at?: string | null;
          converted_to_parent_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          message?: string | null;
          parent_email?: string;
          parent_name?: string;
          parent_phone?: string | null;
          risk_flags?: Json | null;
          risk_level?: Database["public"]["Enums"]["risk_level"] | null;
          score?: number | null;
          scoring_reasoning?: string | null;
          source?: Database["public"]["Enums"]["lead_source"];
          source_meta?: Json | null;
          status?: Database["public"]["Enums"]["lead_status"];
          student_grade?: string;
          subject_needed?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      parents: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          email: string;
          full_name: string;
          id: string;
          notes: string | null;
          phone: string | null;
          timezone: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          email: string;
          full_name: string;
          id?: string;
          notes?: string | null;
          phone?: string | null;
          timezone?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          email?: string;
          full_name?: string;
          id?: string;
          notes?: string | null;
          phone?: string | null;
          timezone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      students: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          first_name: string;
          grade: string | null;
          id: string;
          is_minor: boolean;
          last_name: string;
          notes: string | null;
          parent_id: string;
          school: string | null;
          subjects: Json | null;
          timezone: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          first_name: string;
          grade?: string | null;
          id?: string;
          is_minor?: boolean;
          last_name: string;
          notes?: string | null;
          parent_id: string;
          school?: string | null;
          subjects?: Json | null;
          timezone?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          first_name?: string;
          grade?: string | null;
          id?: string;
          is_minor?: boolean;
          last_name?: string;
          notes?: string | null;
          parent_id?: string;
          school?: string | null;
          subjects?: Json | null;
          timezone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "students_parent_id_parents_id_fk";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "parents";
            referencedColumns: ["id"];
          },
        ];
      };
      tutoring_sessions: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          duration_minutes: number;
          end_time: string;
          google_event_id: string | null;
          google_meet_url: string | null;
          id: string;
          notes: string | null;
          start_time: string;
          status: Database["public"]["Enums"]["session_status"];
          student_id: string;
          subject: string;
          tutor_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          duration_minutes: number;
          end_time: string;
          google_event_id?: string | null;
          google_meet_url?: string | null;
          id?: string;
          notes?: string | null;
          start_time: string;
          status?: Database["public"]["Enums"]["session_status"];
          student_id: string;
          subject: string;
          tutor_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          duration_minutes?: number;
          end_time?: string;
          google_event_id?: string | null;
          google_meet_url?: string | null;
          id?: string;
          notes?: string | null;
          start_time?: string;
          status?: Database["public"]["Enums"]["session_status"];
          student_id?: string;
          subject?: string;
          tutor_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tutoring_sessions_student_id_students_id_fk";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tutoring_sessions_tutor_id_tutors_id_fk";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "tutors";
            referencedColumns: ["id"];
          },
        ];
      };
      tutors: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          email: string;
          full_name: string;
          grades: Json | null;
          hourly_rate_cents: number | null;
          id: string;
          notes: string | null;
          phone: string | null;
          status: Database["public"]["Enums"]["tutor_status"];
          subjects: Json | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          email: string;
          full_name: string;
          grades?: Json | null;
          hourly_rate_cents?: number | null;
          id?: string;
          notes?: string | null;
          phone?: string | null;
          status?: Database["public"]["Enums"]["tutor_status"];
          subjects?: Json | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          email?: string;
          full_name?: string;
          grades?: Json | null;
          hourly_rate_cents?: number | null;
          id?: string;
          notes?: string | null;
          phone?: string | null;
          status?: Database["public"]["Enums"]["tutor_status"];
          subjects?: Json | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          auth_user_id: string | null;
          created_at: string;
          deleted_at: string | null;
          email: string;
          full_name: string;
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          timezone: string | null;
          updated_at: string;
        };
        Insert: {
          auth_user_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          email: string;
          full_name: string;
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          timezone?: string | null;
          updated_at?: string;
        };
        Update: {
          auth_user_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          email?: string;
          full_name?: string;
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          timezone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      tutoros_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      tutoros_self_parent_id: { Args: never; Returns: string };
      tutoros_self_tutor_id: { Args: never; Returns: string };
    };
    Enums: {
      actor_type: "USER" | "AGENT" | "SYSTEM";
      agent_run_status:
        | "RUNNING"
        | "COMPLETED"
        | "FAILED"
        | "TIMEOUT"
        | "AWAITING_APPROVAL"
        | "REJECTED";
      approval_status:
        | "PENDING"
        | "APPROVED"
        | "REJECTED"
        | "CHANGES_REQUESTED"
        | "EXPIRED";
      automation_mode:
        | "MANUAL"
        | "DRAFT_ONLY"
        | "AUTO_AFTER_APPROVAL"
        | "FULL_AUTO";
      consent_type:
        | "DATA_PROCESSING"
        | "EMAIL_COMMUNICATION"
        | "SESSION_RECORDING"
        | "SESSION_TRANSCRIPTION"
        | "MARKETING_COMMUNICATION";
      lead_source:
        | "WEBSITE"
        | "REFERRAL"
        | "SOCIAL"
        | "PARTNER"
        | "ADS"
        | "OTHER";
      lead_status:
        | "NEW"
        | "CONTACTED"
        | "QUALIFIED"
        | "DISQUALIFIED"
        | "CONVERTED"
        | "ARCHIVED";
      risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      session_status:
        | "SCHEDULED"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "CANCELED"
        | "NO_SHOW";
      tutor_status:
        | "APPLIED"
        | "SCREENING"
        | "TEST_SENT"
        | "INTERVIEW"
        | "ACTIVE"
        | "INACTIVE"
        | "REJECTED";
      user_role:
        | "OWNER"
        | "ADMIN"
        | "ACADEMIC_MANAGER"
        | "TUTOR"
        | "PARENT"
        | "STUDENT"
        | "AI_AGENT";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      actor_type: ["USER", "AGENT", "SYSTEM"],
      agent_run_status: [
        "RUNNING",
        "COMPLETED",
        "FAILED",
        "TIMEOUT",
        "AWAITING_APPROVAL",
        "REJECTED",
      ],
      approval_status: [
        "PENDING",
        "APPROVED",
        "REJECTED",
        "CHANGES_REQUESTED",
        "EXPIRED",
      ],
      automation_mode: [
        "MANUAL",
        "DRAFT_ONLY",
        "AUTO_AFTER_APPROVAL",
        "FULL_AUTO",
      ],
      consent_type: [
        "DATA_PROCESSING",
        "EMAIL_COMMUNICATION",
        "SESSION_RECORDING",
        "SESSION_TRANSCRIPTION",
        "MARKETING_COMMUNICATION",
      ],
      lead_source: ["WEBSITE", "REFERRAL", "SOCIAL", "PARTNER", "ADS", "OTHER"],
      lead_status: [
        "NEW",
        "CONTACTED",
        "QUALIFIED",
        "DISQUALIFIED",
        "CONVERTED",
        "ARCHIVED",
      ],
      risk_level: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      session_status: [
        "SCHEDULED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELED",
        "NO_SHOW",
      ],
      tutor_status: [
        "APPLIED",
        "SCREENING",
        "TEST_SENT",
        "INTERVIEW",
        "ACTIVE",
        "INACTIVE",
        "REJECTED",
      ],
      user_role: [
        "OWNER",
        "ADMIN",
        "ACADEMIC_MANAGER",
        "TUTOR",
        "PARENT",
        "STUDENT",
        "AI_AGENT",
      ],
    },
  },
} as const;
