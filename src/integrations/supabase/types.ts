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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      accounting_periods: {
        Row: {
          ano: number
          created_at: string | null
          fechado: boolean | null
          fechado_em: string | null
          fechado_por: string | null
          id: string
          mes: number
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          ano: number
          created_at?: string | null
          fechado?: boolean | null
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          mes: number
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ano?: number
          created_at?: string | null
          fechado?: boolean | null
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          mes?: number
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_payable: {
        Row: {
          created_at: string | null
          data_vencimento: string
          descricao: string | null
          id: string
          status: string | null
          supplier_id: string | null
          tenant_id: string | null
          valor: number
        }
        Insert: {
          created_at?: string | null
          data_vencimento: string
          descricao?: string | null
          id?: string
          status?: string | null
          supplier_id?: string | null
          tenant_id?: string | null
          valor: number
        }
        Update: {
          created_at?: string | null
          data_vencimento?: string
          descricao?: string | null
          id?: string
          status?: string | null
          supplier_id?: string | null
          tenant_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounts_payable_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_receivable: {
        Row: {
          cliente_id: string | null
          created_at: string | null
          data_vencimento: string
          documento_origem: string | null
          id: string
          status: Database["public"]["Enums"]["status_financeiro"] | null
          tenant_id: string
          valor: number
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string | null
          data_vencimento: string
          documento_origem?: string | null
          id?: string
          status?: Database["public"]["Enums"]["status_financeiro"] | null
          tenant_id: string
          valor: number
        }
        Update: {
          cliente_id?: string | null
          created_at?: string | null
          data_vencimento?: string
          documento_origem?: string | null
          id?: string
          status?: Database["public"]["Enums"]["status_financeiro"] | null
          tenant_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounts_receivable_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          acao: string
          created_at: string | null
          dados_anteriores: Json | null
          dados_novos: Json | null
          entidade: string
          entidade_id: string | null
          id: string
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          entidade: string
          entidade_id?: string | null
          id?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          entidade?: string
          entidade_id?: string | null
          id?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_movements: {
        Row: {
          banco_id: string | null
          created_at: string | null
          data_movimento: string | null
          descricao: string | null
          id: string
          tenant_id: string | null
          tipo: string
          valor: number | null
        }
        Insert: {
          banco_id?: string | null
          created_at?: string | null
          data_movimento?: string | null
          descricao?: string | null
          id?: string
          tenant_id?: string | null
          tipo: string
          valor?: number | null
        }
        Update: {
          banco_id?: string | null
          created_at?: string | null
          data_movimento?: string | null
          descricao?: string | null
          id?: string
          tenant_id?: string | null
          tipo?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_movements_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      banks: {
        Row: {
          agencia: string | null
          ativo: boolean | null
          codigo: string
          conta: string | null
          created_at: string | null
          id: string
          nome: string
          saldo_inicial: number | null
          tenant_id: string | null
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean | null
          codigo: string
          conta?: string | null
          created_at?: string | null
          id?: string
          nome: string
          saldo_inicial?: number | null
          tenant_id?: string | null
        }
        Update: {
          agencia?: string | null
          ativo?: boolean | null
          codigo?: string
          conta?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          saldo_inicial?: number | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      comissoes: {
        Row: {
          created_at: string | null
          documento_id: string | null
          id: string
          percentual: number
          representante_id: string | null
          tenant_id: string | null
          valor_base: number
          valor_comissao: number
        }
        Insert: {
          created_at?: string | null
          documento_id?: string | null
          id?: string
          percentual: number
          representante_id?: string | null
          tenant_id?: string | null
          valor_base: number
          valor_comissao: number
        }
        Update: {
          created_at?: string | null
          documento_id?: string | null
          id?: string
          percentual?: number
          representante_id?: string | null
          tenant_id?: string | null
          valor_base?: number
          valor_comissao?: number
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "representantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          descricao: string
          id: string
          tenant_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          descricao: string
          id?: string
          tenant_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          descricao?: string
          id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          ativo: boolean | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          id: string
          nome_fantasia: string | null
          razao_social: string
          telefone: string | null
          tenant_id: string
        }
        Insert: {
          ativo?: boolean | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome_fantasia?: string | null
          razao_social: string
          telefone?: string | null
          tenant_id: string
        }
        Update: {
          ativo?: boolean | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome_fantasia?: string | null
          razao_social?: string
          telefone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      document_series: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          modelo: string | null
          nome: string
          padrao: boolean | null
          proximo_numero: number | null
          serie: string | null
          tenant_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          modelo?: string | null
          nome: string
          padrao?: boolean | null
          proximo_numero?: number | null
          serie?: string | null
          tenant_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          modelo?: string | null
          nome?: string
          padrao?: boolean | null
          proximo_numero?: number | null
          serie?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_series_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          cnpj: string | null
          created_at: string | null
          id: string
          nome_fantasia: string | null
          plano: Database["public"]["Enums"]["plano_tipo"] | null
          razao_social: string
          slug: string
          status: Database["public"]["Enums"]["status_geral"] | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string | null
          id?: string
          nome_fantasia?: string | null
          plano?: Database["public"]["Enums"]["plano_tipo"] | null
          razao_social: string
          slug: string
          status?: Database["public"]["Enums"]["status_geral"] | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string | null
          id?: string
          nome_fantasia?: string | null
          plano?: Database["public"]["Enums"]["plano_tipo"] | null
          razao_social?: string
          slug?: string
          status?: Database["public"]["Enums"]["status_geral"] | null
        }
        Relationships: []
      }
      financial_natures: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          descricao: string
          id: string
          ordem: number | null
          tenant_id: string | null
          tipo: Database["public"]["Enums"]["tipo_grupo"] | null
          tipo_natureza: string
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          descricao: string
          id?: string
          ordem?: number | null
          tenant_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_grupo"] | null
          tipo_natureza: string
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          descricao?: string
          id?: string
          ordem?: number | null
          tenant_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_grupo"] | null
          tipo_natureza?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_natures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      formas_pagamento: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          nome: string
          tenant_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
          tenant_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formas_pagamento_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_document_items: {
        Row: {
          created_at: string | null
          id: string
          impostos: number | null
          inbound_document_id: string | null
          item_id: string | null
          quantidade: number | null
          tenant_id: string | null
          valor_unitario: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          impostos?: number | null
          inbound_document_id?: string | null
          item_id?: string | null
          quantidade?: number | null
          tenant_id?: string | null
          valor_unitario?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          impostos?: number | null
          inbound_document_id?: string | null
          item_id?: string | null
          quantidade?: number | null
          tenant_id?: string | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inbound_document_items_inbound_document_id_fkey"
            columns: ["inbound_document_id"]
            isOneToOne: false
            referencedRelation: "inbound_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_document_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_document_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_documents: {
        Row: {
          chave_acesso: string | null
          created_at: string | null
          data_emissao: string | null
          fornecedor_id: string | null
          id: string
          numero: string | null
          purchase_order_id: string | null
          serie: string | null
          status: Database["public"]["Enums"]["status_documento"] | null
          tenant_id: string | null
          valor_total: number | null
        }
        Insert: {
          chave_acesso?: string | null
          created_at?: string | null
          data_emissao?: string | null
          fornecedor_id?: string | null
          id?: string
          numero?: string | null
          purchase_order_id?: string | null
          serie?: string | null
          status?: Database["public"]["Enums"]["status_documento"] | null
          tenant_id?: string | null
          valor_total?: number | null
        }
        Update: {
          chave_acesso?: string | null
          created_at?: string | null
          data_emissao?: string | null
          fornecedor_id?: string | null
          id?: string
          numero?: string | null
          purchase_order_id?: string | null
          serie?: string | null
          status?: Database["public"]["Enums"]["status_documento"] | null
          tenant_id?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inbound_documents_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      item_categories: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      item_groups: {
        Row: {
          ativo: boolean | null
          codigo: string
          codigo_pai: string | null
          created_at: string | null
          descricao: string
          id: string
          tenant_id: string | null
          tipo: Database["public"]["Enums"]["tipo_grupo"] | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          codigo_pai?: string | null
          created_at?: string | null
          descricao: string
          id?: string
          tenant_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_grupo"] | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          codigo_pai?: string | null
          created_at?: string | null
          descricao?: string
          id?: string
          tenant_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_grupo"] | null
        }
        Relationships: [
          {
            foreignKeyName: "item_groups_codigo_pai_fkey"
            columns: ["codigo_pai"]
            isOneToOne: false
            referencedRelation: "item_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          ativo: boolean | null
          category_id: string | null
          centro_custo_id: string | null
          centro_custo_venda_id: string | null
          codigo: string
          created_at: string | null
          custo_medio: number | null
          descricao: string
          id: string
          natureza_financeira_id: string | null
          natureza_venda_id: string | null
          preco_venda: number | null
          saldo_estoque: number | null
          tenant_id: string
          tipo_item: Database["public"]["Enums"]["tipo_item"] | null
          unidade_medida: string | null
        }
        Insert: {
          ativo?: boolean | null
          category_id?: string | null
          centro_custo_id?: string | null
          centro_custo_venda_id?: string | null
          codigo: string
          created_at?: string | null
          custo_medio?: number | null
          descricao: string
          id?: string
          natureza_financeira_id?: string | null
          natureza_venda_id?: string | null
          preco_venda?: number | null
          saldo_estoque?: number | null
          tenant_id: string
          tipo_item?: Database["public"]["Enums"]["tipo_item"] | null
          unidade_medida?: string | null
        }
        Update: {
          ativo?: boolean | null
          category_id?: string | null
          centro_custo_id?: string | null
          centro_custo_venda_id?: string | null
          codigo?: string
          created_at?: string | null
          custo_medio?: number | null
          descricao?: string
          id?: string
          natureza_financeira_id?: string | null
          natureza_venda_id?: string | null
          preco_venda?: number | null
          saldo_estoque?: number | null
          tenant_id?: string
          tipo_item?: Database["public"]["Enums"]["tipo_item"] | null
          unidade_medida?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "item_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_centro_custo_venda_id_fkey"
            columns: ["centro_custo_venda_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_natureza_financeira_id_fkey"
            columns: ["natureza_financeira_id"]
            isOneToOne: false
            referencedRelation: "financial_natures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_natureza_venda_id_fkey"
            columns: ["natureza_venda_id"]
            isOneToOne: false
            referencedRelation: "financial_natures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_document_items: {
        Row: {
          created_at: string | null
          id: string
          item_id: string | null
          outbound_document_id: string | null
          quantidade: number
          tenant_id: string | null
          valor_unitario: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          outbound_document_id?: string | null
          quantidade?: number
          tenant_id?: string | null
          valor_unitario?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          outbound_document_id?: string | null
          quantidade?: number
          tenant_id?: string | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "outbound_document_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_document_items_outbound_document_id_fkey"
            columns: ["outbound_document_id"]
            isOneToOne: false
            referencedRelation: "outbound_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_document_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_documents: {
        Row: {
          chave_acesso: string | null
          cliente_id: string | null
          created_at: string | null
          data_emissao: string | null
          id: string
          numero_nf: number | null
          pedido_venda_id: string | null
          serie: string | null
          status: Database["public"]["Enums"]["status_documento"] | null
          tenant_id: string | null
          valor_total: number | null
        }
        Insert: {
          chave_acesso?: string | null
          cliente_id?: string | null
          created_at?: string | null
          data_emissao?: string | null
          id?: string
          numero_nf?: number | null
          pedido_venda_id?: string | null
          serie?: string | null
          status?: Database["public"]["Enums"]["status_documento"] | null
          tenant_id?: string | null
          valor_total?: number | null
        }
        Update: {
          chave_acesso?: string | null
          cliente_id?: string | null
          created_at?: string | null
          data_emissao?: string | null
          id?: string
          numero_nf?: number | null
          pedido_venda_id?: string | null
          serie?: string | null
          status?: Database["public"]["Enums"]["status_documento"] | null
          tenant_id?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "outbound_documents_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_documents_pedido_venda_id_fkey"
            columns: ["pedido_venda_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_conditions: {
        Row: {
          created_at: string | null
          created_by: string | null
          descricao: string
          dias_entre_parcelas: number | null
          id: string
          numero_parcelas: number | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          descricao: string
          dias_entre_parcelas?: number | null
          id?: string
          numero_parcelas?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          descricao?: string
          dias_entre_parcelas?: number | null
          id?: string
          numero_parcelas?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_conditions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          id: string
          module: string
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          id?: string
          module: string
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          id?: string
          module?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auth_id: string
          created_at: string | null
          email: string
          id: string
          nome: string
          tenant_id: string | null
        }
        Insert: {
          auth_id: string
          created_at?: string | null
          email: string
          id?: string
          nome: string
          tenant_id?: string | null
        }
        Update: {
          auth_id?: string
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          centro_custo_id: string | null
          created_at: string | null
          frete_total_item: number | null
          frete_unitario: number | null
          id: string
          impostos: number | null
          item_id: string | null
          natureza_financeira_id: string | null
          purchase_order_id: string | null
          quantidade: number | null
          tenant_id: string | null
          valor_unitario: number | null
        }
        Insert: {
          centro_custo_id?: string | null
          created_at?: string | null
          frete_total_item?: number | null
          frete_unitario?: number | null
          id?: string
          impostos?: number | null
          item_id?: string | null
          natureza_financeira_id?: string | null
          purchase_order_id?: string | null
          quantidade?: number | null
          tenant_id?: string | null
          valor_unitario?: number | null
        }
        Update: {
          centro_custo_id?: string | null
          created_at?: string | null
          frete_total_item?: number | null
          frete_unitario?: number | null
          id?: string
          impostos?: number | null
          item_id?: string | null
          natureza_financeira_id?: string | null
          purchase_order_id?: string | null
          quantidade?: number | null
          tenant_id?: string | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          comprador_id: string | null
          condicao_pagamento_id: string | null
          created_at: string | null
          created_by: string | null
          data_entrega: string | null
          forma_pagamento_id: string | null
          fornecedor_id: string | null
          frete_tipo: string | null
          id: string
          numero_sequencial: number
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          valor_frete: number | null
        }
        Insert: {
          comprador_id?: string | null
          condicao_pagamento_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data_entrega?: string | null
          forma_pagamento_id?: string | null
          fornecedor_id?: string | null
          frete_tipo?: string | null
          id?: string
          numero_sequencial?: number
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          valor_frete?: number | null
        }
        Update: {
          comprador_id?: string | null
          condicao_pagamento_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data_entrega?: string | null
          forma_pagamento_id?: string | null
          fornecedor_id?: string | null
          frete_tipo?: string | null
          id?: string
          numero_sequencial?: number
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          valor_frete?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          centro_custo_id: string | null
          created_at: string | null
          id: string
          item_id: string | null
          natureza_financeira_id: string | null
          quantidade: number | null
          quotation_id: string | null
          tenant_id: string | null
          valor_unitario: number | null
        }
        Insert: {
          centro_custo_id?: string | null
          created_at?: string | null
          id?: string
          item_id?: string | null
          natureza_financeira_id?: string | null
          quantidade?: number | null
          quotation_id?: string | null
          tenant_id?: string | null
          valor_unitario?: number | null
        }
        Update: {
          centro_custo_id?: string | null
          created_at?: string | null
          id?: string
          item_id?: string | null
          natureza_financeira_id?: string | null
          quantidade?: number | null
          quotation_id?: string | null
          tenant_id?: string | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          id: string
          numero_sequencial: number
          status: string | null
          tenant_id: string | null
          validade: string | null
          valor_total: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          id?: string
          numero_sequencial?: number
          status?: string | null
          tenant_id?: string | null
          validade?: string | null
          valor_total?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          id?: string
          numero_sequencial?: number
          status?: string | null
          tenant_id?: string | null
          validade?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      representantes: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          nome: string
          percentual_comissao: number | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          nome: string
          percentual_comissao?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          nome?: string
          percentual_comissao?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "representantes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          id: string
          item_id: string | null
          preco_unitario: number
          quantidade: number
          sale_id: string | null
          tenant_id: string | null
          total_item: number | null
        }
        Insert: {
          id?: string
          item_id?: string | null
          preco_unitario: number
          quantidade: number
          sale_id?: string | null
          tenant_id?: string | null
          total_item?: number | null
        }
        Update: {
          id?: string
          item_id?: string | null
          preco_unitario?: number
          quantidade?: number
          sale_id?: string | null
          tenant_id?: string | null
          total_item?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          numero_sequencial: number
          status: string | null
          tenant_id: string
          valor_total: number | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          numero_sequencial?: number
          status?: string | null
          tenant_id: string
          valor_total?: number | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          numero_sequencial?: number
          status?: string | null
          tenant_id?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_items: {
        Row: {
          centro_custo_id: string | null
          created_at: string | null
          id: string
          item_id: string | null
          natureza_financeira_id: string | null
          quantidade: number | null
          service_order_id: string | null
          tenant_id: string | null
          valor_unitario: number | null
        }
        Insert: {
          centro_custo_id?: string | null
          created_at?: string | null
          id?: string
          item_id?: string | null
          natureza_financeira_id?: string | null
          quantidade?: number | null
          service_order_id?: string | null
          tenant_id?: string | null
          valor_unitario?: number | null
        }
        Update: {
          centro_custo_id?: string | null
          created_at?: string | null
          id?: string
          item_id?: string | null
          natureza_financeira_id?: string | null
          quantidade?: number | null
          service_order_id?: string | null
          tenant_id?: string | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_items_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          condicao_pagamento_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          data_fim: string | null
          data_fim_prevista: string | null
          data_inicio: string | null
          data_inicio_prevista: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          valor_total: number | null
        }
        Insert: {
          condicao_pagamento_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          data_fim?: string | null
          data_fim_prevista?: string | null
          data_inicio?: string | null
          data_inicio_prevista?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          valor_total?: number | null
        }
        Update: {
          condicao_pagamento_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          data_fim?: string | null
          data_fim_prevista?: string | null
          data_inicio?: string | null
          data_inicio_prevista?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string | null
          custo_unitario: number | null
          documento_origem: string | null
          id: string
          item_id: string
          quantidade: number
          tenant_id: string
          tipo: string
        }
        Insert: {
          created_at?: string | null
          custo_unitario?: number | null
          documento_origem?: string | null
          id?: string
          item_id: string
          quantidade: number
          tenant_id: string
          tipo: string
        }
        Update: {
          created_at?: string | null
          custo_unitario?: number | null
          documento_origem?: string | null
          id?: string
          item_id?: string
          quantidade?: number
          tenant_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          ativo: boolean | null
          cnpj: string | null
          created_at: string | null
          id: string
          razao_social: string
          tenant_id: string
        }
        Insert: {
          ativo?: boolean | null
          cnpj?: string | null
          created_at?: string | null
          id?: string
          razao_social: string
          tenant_id: string
        }
        Update: {
          ativo?: boolean | null
          cnpj?: string | null
          created_at?: string | null
          id?: string
          razao_social?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades_medida: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          descricao: string
          id: string
          tenant_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          descricao: string
          id?: string
          tenant_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          descricao?: string
          id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unidades_medida_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_audit_log: {
        Args: {
          _acao: string
          _dados_anteriores?: Json
          _dados_novos?: Json
          _entidade: string
          _entidade_id: string
          _tenant_id: string
          _user_id: string
        }
        Returns: undefined
      }
      get_tenant_id: { Args: { _auth_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_inbound_document: {
        Args: { _doc_id: string }
        Returns: undefined
      }
      process_outbound_document: {
        Args: { _doc_id: string }
        Returns: undefined
      }
      recalc_inbound_costs: { Args: { _tenant_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin_global" | "admin_empresa" | "usuario"
      frete_tipo: "GLOBAL" | "POR_ITEM"
      plano_tipo: "basico" | "pro" | "premium"
      status_documento: "PENDENTE" | "PROCESSADO" | "CANCELADO"
      status_financeiro: "ABERTO" | "PAGO" | "CANCELADO"
      status_geral: "ativo" | "inativo" | "suspenso"
      status_pedido_compra: "ABERTO" | "ATENDIDO" | "CANCELADO"
      tipo_grupo: "ANALITICO" | "SINTETICO"
      tipo_item: "REVENDA" | "SERVICO" | "MATERIA_PRIMA"
      tipo_movimento: "ENTRADA" | "SAIDA"
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
    Enums: {
      app_role: ["admin_global", "admin_empresa", "usuario"],
      frete_tipo: ["GLOBAL", "POR_ITEM"],
      plano_tipo: ["basico", "pro", "premium"],
      status_documento: ["PENDENTE", "PROCESSADO", "CANCELADO"],
      status_financeiro: ["ABERTO", "PAGO", "CANCELADO"],
      status_geral: ["ativo", "inativo", "suspenso"],
      status_pedido_compra: ["ABERTO", "ATENDIDO", "CANCELADO"],
      tipo_grupo: ["ANALITICO", "SINTETICO"],
      tipo_item: ["REVENDA", "SERVICO", "MATERIA_PRIMA"],
      tipo_movimento: ["ENTRADA", "SAIDA"],
    },
  },
} as const
