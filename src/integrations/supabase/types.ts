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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounting_periods: {
        Row: {
          ano: number
          created_at: string
          fechado: boolean
          fechado_em: string | null
          fechado_por: string | null
          id: string
          mes: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ano: number
          created_at?: string
          fechado?: boolean
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          mes: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ano?: number
          created_at?: string
          fechado?: boolean
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          mes?: number
          tenant_id?: string
          updated_at?: string
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
          banco_baixa_id: string | null
          centro_custo_id: string | null
          competencia: string
          created_at: string
          created_by: string | null
          data_baixa: string | null
          data_emissao: string
          data_lancamento: string
          data_vencimento: string
          desconto: number
          descricao: string | null
          documento_origem: string | null
          forma_pagamento_id: string | null
          fornecedor_id: string
          id: string
          juros: number
          multa: number
          natureza_financeira_id: string | null
          observacao: string | null
          status: Database["public"]["Enums"]["status_financeiro"]
          tenant_id: string
          updated_at: string
          updated_by: string | null
          valor: number
          valor_pago: number | null
        }
        Insert: {
          banco_baixa_id?: string | null
          centro_custo_id?: string | null
          competencia?: string
          created_at?: string
          created_by?: string | null
          data_baixa?: string | null
          data_emissao?: string
          data_lancamento?: string
          data_vencimento: string
          desconto?: number
          descricao?: string | null
          documento_origem?: string | null
          forma_pagamento_id?: string | null
          fornecedor_id: string
          id?: string
          juros?: number
          multa?: number
          natureza_financeira_id?: string | null
          observacao?: string | null
          status?: Database["public"]["Enums"]["status_financeiro"]
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          valor: number
          valor_pago?: number | null
        }
        Update: {
          banco_baixa_id?: string | null
          centro_custo_id?: string | null
          competencia?: string
          created_at?: string
          created_by?: string | null
          data_baixa?: string | null
          data_emissao?: string
          data_lancamento?: string
          data_vencimento?: string
          desconto?: number
          descricao?: string | null
          documento_origem?: string | null
          forma_pagamento_id?: string | null
          fornecedor_id?: string
          id?: string
          juros?: number
          multa?: number
          natureza_financeira_id?: string | null
          observacao?: string | null
          status?: Database["public"]["Enums"]["status_financeiro"]
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          valor?: number
          valor_pago?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_payable_banco_baixa_id_fkey"
            columns: ["banco_baixa_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_forma_pagamento_id_fkey"
            columns: ["forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_natureza_financeira_id_fkey"
            columns: ["natureza_financeira_id"]
            isOneToOne: false
            referencedRelation: "financial_natures"
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
          banco_baixa_id: string | null
          centro_custo_id: string | null
          cliente_id: string
          competencia: string
          created_at: string
          created_by: string | null
          data_baixa: string | null
          data_emissao: string
          data_lancamento: string
          data_vencimento: string
          desconto: number
          descricao: string | null
          documento_origem: string | null
          forma_pagamento_id: string | null
          id: string
          juros: number
          multa: number
          natureza_financeira_id: string | null
          observacao: string | null
          status: Database["public"]["Enums"]["status_financeiro"]
          tenant_id: string
          updated_at: string
          updated_by: string | null
          valor: number
          valor_recebido: number | null
        }
        Insert: {
          banco_baixa_id?: string | null
          centro_custo_id?: string | null
          cliente_id: string
          competencia?: string
          created_at?: string
          created_by?: string | null
          data_baixa?: string | null
          data_emissao?: string
          data_lancamento?: string
          data_vencimento: string
          desconto?: number
          descricao?: string | null
          documento_origem?: string | null
          forma_pagamento_id?: string | null
          id?: string
          juros?: number
          multa?: number
          natureza_financeira_id?: string | null
          observacao?: string | null
          status?: Database["public"]["Enums"]["status_financeiro"]
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          valor: number
          valor_recebido?: number | null
        }
        Update: {
          banco_baixa_id?: string | null
          centro_custo_id?: string | null
          cliente_id?: string
          competencia?: string
          created_at?: string
          created_by?: string | null
          data_baixa?: string | null
          data_emissao?: string
          data_lancamento?: string
          data_vencimento?: string
          desconto?: number
          descricao?: string | null
          documento_origem?: string | null
          forma_pagamento_id?: string | null
          id?: string
          juros?: number
          multa?: number
          natureza_financeira_id?: string | null
          observacao?: string | null
          status?: Database["public"]["Enums"]["status_financeiro"]
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          valor?: number
          valor_recebido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_receivable_banco_baixa_id_fkey"
            columns: ["banco_baixa_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_forma_pagamento_id_fkey"
            columns: ["forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_natureza_financeira_id_fkey"
            columns: ["natureza_financeira_id"]
            isOneToOne: false
            referencedRelation: "financial_natures"
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
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          entidade: string
          entidade_id: string | null
          id: string
          ip: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          entidade: string
          entidade_id?: string | null
          id?: string
          ip?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          entidade?: string
          entidade_id?: string | null
          id?: string
          ip?: string | null
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
          banco_id: string
          centro_custo_id: string | null
          created_at: string
          created_by: string | null
          data: string
          id: string
          natureza_financeira_id: string | null
          referencia: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_movimento"]
          valor: number
        }
        Insert: {
          banco_id: string
          centro_custo_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          natureza_financeira_id?: string | null
          referencia?: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_movimento"]
          valor: number
        }
        Update: {
          banco_id?: string
          centro_custo_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          natureza_financeira_id?: string | null
          referencia?: string | null
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_movimento"]
          valor?: number
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
            foreignKeyName: "bank_movements_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_movements_natureza_financeira_id_fkey"
            columns: ["natureza_financeira_id"]
            isOneToOne: false
            referencedRelation: "financial_natures"
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
          ativo: boolean
          codigo: string
          conta: string | null
          created_at: string
          created_by: string | null
          id: string
          nome: string
          saldo_inicial: number
          tenant_id: string
          tipo_conta: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean
          codigo: string
          conta?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          saldo_inicial?: number
          tenant_id: string
          tipo_conta?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agencia?: string | null
          ativo?: boolean
          codigo?: string
          conta?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          saldo_inicial?: number
          tenant_id?: string
          tipo_conta?: string
          updated_at?: string
          updated_by?: string | null
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
          created_at: string
          documento_id: string
          id: string
          percentual: number
          representante_id: string
          tenant_id: string
          valor_base: number
          valor_comissao: number
        }
        Insert: {
          created_at?: string
          documento_id: string
          id?: string
          percentual: number
          representante_id: string
          tenant_id: string
          valor_base: number
          valor_comissao: number
        }
        Update: {
          created_at?: string
          documento_id?: string
          id?: string
          percentual?: number
          representante_id?: string
          tenant_id?: string
          valor_base?: number
          valor_comissao?: number
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "outbound_documents"
            referencedColumns: ["id"]
          },
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
          ativo: boolean
          codigo: string
          codigo_pai: string | null
          created_at: string
          created_by: string | null
          descricao: string
          id: string
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_grupo"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          codigo: string
          codigo_pai?: string | null
          created_at?: string
          created_by?: string | null
          descricao: string
          id?: string
          tenant_id: string
          tipo?: Database["public"]["Enums"]["tipo_grupo"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          codigo?: string
          codigo_pai?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string
          id?: string
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_grupo"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_codigo_pai_fkey"
            columns: ["codigo_pai"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
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
          ativo: boolean
          cep: string | null
          cidade: string | null
          cnpj: string | null
          created_at: string
          created_by: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome_fantasia: string | null
          razao_social: string
          telefone: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome_fantasia?: string | null
          razao_social: string
          telefone?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome_fantasia?: string | null
          razao_social?: string
          telefone?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
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
          ativo: boolean
          created_at: string
          id: string
          modelo: string
          nome: string
          padrao: boolean
          proximo_numero: number
          serie: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          modelo?: string
          nome: string
          padrao?: boolean
          proximo_numero?: number
          serie?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          modelo?: string
          nome?: string
          padrao?: boolean
          proximo_numero?: number
          serie?: string
          tenant_id?: string
          updated_at?: string
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
          created_at: string
          id: string
          nome_fantasia: string | null
          plano: Database["public"]["Enums"]["plano_tipo"]
          razao_social: string
          slug: string
          status: Database["public"]["Enums"]["status_geral"]
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          id?: string
          nome_fantasia?: string | null
          plano?: Database["public"]["Enums"]["plano_tipo"]
          razao_social: string
          slug: string
          status?: Database["public"]["Enums"]["status_geral"]
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          id?: string
          nome_fantasia?: string | null
          plano?: Database["public"]["Enums"]["plano_tipo"]
          razao_social?: string
          slug?: string
          status?: Database["public"]["Enums"]["status_geral"]
          updated_at?: string
        }
        Relationships: []
      }
      financial_natures: {
        Row: {
          ativo: boolean
          codigo: string
          codigo_pai: string | null
          created_at: string
          created_by: string | null
          descricao: string
          id: string
          ordem: number
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_grupo"]
          tipo_natureza: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          codigo: string
          codigo_pai?: string | null
          created_at?: string
          created_by?: string | null
          descricao: string
          id?: string
          ordem?: number
          tenant_id: string
          tipo?: Database["public"]["Enums"]["tipo_grupo"]
          tipo_natureza?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          codigo?: string
          codigo_pai?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string
          id?: string
          ordem?: number
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_grupo"]
          tipo_natureza?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_natures_codigo_pai_fkey"
            columns: ["codigo_pai"]
            isOneToOne: false
            referencedRelation: "financial_natures"
            referencedColumns: ["id"]
          },
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
          ativo: boolean
          created_at: string
          id: string
          nome: string
          tenant_id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          tenant_id: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          tenant_id?: string
          tipo?: string
          updated_at?: string
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
          centro_custo_id: string | null
          created_at: string
          id: string
          impostos: number
          inbound_document_id: string
          item_id: string
          natureza_financeira_id: string | null
          quantidade: number
          valor_unitario: number
        }
        Insert: {
          centro_custo_id?: string | null
          created_at?: string
          id?: string
          impostos?: number
          inbound_document_id: string
          item_id: string
          natureza_financeira_id?: string | null
          quantidade?: number
          valor_unitario?: number
        }
        Update: {
          centro_custo_id?: string | null
          created_at?: string
          id?: string
          impostos?: number
          inbound_document_id?: string
          item_id?: string
          natureza_financeira_id?: string | null
          quantidade?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "inbound_document_items_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "inbound_document_items_natureza_financeira_id_fkey"
            columns: ["natureza_financeira_id"]
            isOneToOne: false
            referencedRelation: "financial_natures"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_documents: {
        Row: {
          chave_acesso: string | null
          condicao_pagamento_id: string | null
          created_at: string
          created_by: string | null
          data_emissao: string | null
          forma_pagamento_id: string | null
          fornecedor_id: string
          id: string
          numero: string | null
          purchase_order_id: string | null
          serie: string | null
          status: Database["public"]["Enums"]["status_documento"]
          tenant_id: string
          updated_at: string
          updated_by: string | null
          valor_total: number
        }
        Insert: {
          chave_acesso?: string | null
          condicao_pagamento_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          forma_pagamento_id?: string | null
          fornecedor_id: string
          id?: string
          numero?: string | null
          purchase_order_id?: string | null
          serie?: string | null
          status?: Database["public"]["Enums"]["status_documento"]
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          valor_total?: number
        }
        Update: {
          chave_acesso?: string | null
          condicao_pagamento_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          forma_pagamento_id?: string | null
          fornecedor_id?: string
          id?: string
          numero?: string | null
          purchase_order_id?: string | null
          serie?: string | null
          status?: Database["public"]["Enums"]["status_documento"]
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "inbound_documents_condicao_pagamento_id_fkey"
            columns: ["condicao_pagamento_id"]
            isOneToOne: false
            referencedRelation: "payment_conditions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_documents_forma_pagamento_id_fkey"
            columns: ["forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_documents_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_documents_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
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
      item_groups: {
        Row: {
          ativo: boolean
          codigo: string
          codigo_pai: string | null
          created_at: string
          created_by: string | null
          descricao: string
          id: string
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_grupo"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          codigo: string
          codigo_pai?: string | null
          created_at?: string
          created_by?: string | null
          descricao: string
          id?: string
          tenant_id: string
          tipo?: Database["public"]["Enums"]["tipo_grupo"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          codigo?: string
          codigo_pai?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string
          id?: string
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_grupo"]
          updated_at?: string
          updated_by?: string | null
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
          ativo: boolean
          centro_custo_id: string | null
          centro_custo_venda_id: string | null
          codigo: string
          created_at: string
          created_by: string | null
          custo_medio: number
          custo_servico: number
          descricao: string
          endereco_padrao: string | null
          grupo_id: string | null
          id: string
          natureza_financeira_id: string | null
          natureza_venda_id: string | null
          preco_venda: number
          saldo_estoque: number
          tenant_id: string
          tipo_item: Database["public"]["Enums"]["tipo_item"]
          unidade_medida: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          centro_custo_id?: string | null
          centro_custo_venda_id?: string | null
          codigo: string
          created_at?: string
          created_by?: string | null
          custo_medio?: number
          custo_servico?: number
          descricao: string
          endereco_padrao?: string | null
          grupo_id?: string | null
          id?: string
          natureza_financeira_id?: string | null
          natureza_venda_id?: string | null
          preco_venda?: number
          saldo_estoque?: number
          tenant_id: string
          tipo_item?: Database["public"]["Enums"]["tipo_item"]
          unidade_medida?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          centro_custo_id?: string | null
          centro_custo_venda_id?: string | null
          codigo?: string
          created_at?: string
          created_by?: string | null
          custo_medio?: number
          custo_servico?: number
          descricao?: string
          endereco_padrao?: string | null
          grupo_id?: string | null
          id?: string
          natureza_financeira_id?: string | null
          natureza_venda_id?: string | null
          preco_venda?: number
          saldo_estoque?: number
          tenant_id?: string
          tipo_item?: Database["public"]["Enums"]["tipo_item"]
          unidade_medida?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
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
            foreignKeyName: "items_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "item_groups"
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
          centro_custo_id: string | null
          created_at: string
          id: string
          impostos: number
          item_id: string
          natureza_financeira_id: string | null
          outbound_document_id: string
          quantidade: number
          valor_unitario: number
        }
        Insert: {
          centro_custo_id?: string | null
          created_at?: string
          id?: string
          impostos?: number
          item_id: string
          natureza_financeira_id?: string | null
          outbound_document_id: string
          quantidade?: number
          valor_unitario?: number
        }
        Update: {
          centro_custo_id?: string | null
          created_at?: string
          id?: string
          impostos?: number
          item_id?: string
          natureza_financeira_id?: string | null
          outbound_document_id?: string
          quantidade?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "outbound_document_items_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_document_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_document_items_natureza_financeira_id_fkey"
            columns: ["natureza_financeira_id"]
            isOneToOne: false
            referencedRelation: "financial_natures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_document_items_outbound_document_id_fkey"
            columns: ["outbound_document_id"]
            isOneToOne: false
            referencedRelation: "outbound_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_documents: {
        Row: {
          chave_acesso: string | null
          cliente_id: string
          condicao_pagamento_id: string | null
          created_at: string
          created_by: string | null
          data_emissao: string
          forma_pagamento_id: string | null
          id: string
          numero: string | null
          numero_nf: number | null
          pedido_venda_id: string | null
          representante_id: string | null
          serie: string | null
          serie_id: string | null
          service_order_id: string | null
          status: Database["public"]["Enums"]["status_documento"]
          tenant_id: string
          updated_at: string
          updated_by: string | null
          valor_total: number
        }
        Insert: {
          chave_acesso?: string | null
          cliente_id: string
          condicao_pagamento_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          forma_pagamento_id?: string | null
          id?: string
          numero?: string | null
          numero_nf?: number | null
          pedido_venda_id?: string | null
          representante_id?: string | null
          serie?: string | null
          serie_id?: string | null
          service_order_id?: string | null
          status?: Database["public"]["Enums"]["status_documento"]
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          valor_total?: number
        }
        Update: {
          chave_acesso?: string | null
          cliente_id?: string
          condicao_pagamento_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          forma_pagamento_id?: string | null
          id?: string
          numero?: string | null
          numero_nf?: number | null
          pedido_venda_id?: string | null
          representante_id?: string | null
          serie?: string | null
          serie_id?: string | null
          service_order_id?: string | null
          status?: Database["public"]["Enums"]["status_documento"]
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          valor_total?: number
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
            foreignKeyName: "outbound_documents_condicao_pagamento_id_fkey"
            columns: ["condicao_pagamento_id"]
            isOneToOne: false
            referencedRelation: "payment_conditions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_documents_forma_pagamento_id_fkey"
            columns: ["forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_documents_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "representantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_documents_serie_id_fkey"
            columns: ["serie_id"]
            isOneToOne: false
            referencedRelation: "document_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_documents_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
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
          created_at: string
          created_by: string | null
          descricao: string
          dias_entre_parcelas: number
          id: string
          numero_parcelas: number
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao: string
          dias_entre_parcelas?: number
          id?: string
          numero_parcelas?: number
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string
          dias_entre_parcelas?: number
          id?: string
          numero_parcelas?: number
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
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
          description: string | null
          id: string
          module: string
        }
        Insert: {
          action: string
          description?: string | null
          id?: string
          module: string
        }
        Update: {
          action?: string
          description?: string | null
          id?: string
          module?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auth_id: string
          created_at: string
          email: string
          id: string
          nome: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          auth_id: string
          created_at?: string
          email: string
          id?: string
          nome: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          auth_id?: string
          created_at?: string
          email?: string
          id?: string
          nome?: string
          tenant_id?: string | null
          updated_at?: string
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
          created_at: string
          frete_total_item: number
          frete_unitario: number
          id: string
          impostos: number
          item_id: string
          natureza_financeira_id: string | null
          purchase_order_id: string
          quantidade: number
          valor_unitario: number
        }
        Insert: {
          centro_custo_id?: string | null
          created_at?: string
          frete_total_item?: number
          frete_unitario?: number
          id?: string
          impostos?: number
          item_id: string
          natureza_financeira_id?: string | null
          purchase_order_id: string
          quantidade?: number
          valor_unitario?: number
        }
        Update: {
          centro_custo_id?: string | null
          created_at?: string
          frete_total_item?: number
          frete_unitario?: number
          id?: string
          impostos?: number
          item_id?: string
          natureza_financeira_id?: string | null
          purchase_order_id?: string
          quantidade?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_natureza_financeira_id_fkey"
            columns: ["natureza_financeira_id"]
            isOneToOne: false
            referencedRelation: "financial_natures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          comprador_id: string | null
          condicao_pagamento_id: string | null
          created_at: string
          created_by: string | null
          data_entrega: string | null
          forma_pagamento_id: string | null
          fornecedor_id: string
          frete_tipo: Database["public"]["Enums"]["frete_tipo"]
          id: string
          numero_sequencial: number
          status: Database["public"]["Enums"]["status_pedido_compra"]
          tenant_id: string
          updated_at: string
          updated_by: string | null
          valor_frete: number
        }
        Insert: {
          comprador_id?: string | null
          condicao_pagamento_id?: string | null
          created_at?: string
          created_by?: string | null
          data_entrega?: string | null
          forma_pagamento_id?: string | null
          fornecedor_id: string
          frete_tipo?: Database["public"]["Enums"]["frete_tipo"]
          id?: string
          numero_sequencial: number
          status?: Database["public"]["Enums"]["status_pedido_compra"]
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          valor_frete?: number
        }
        Update: {
          comprador_id?: string | null
          condicao_pagamento_id?: string | null
          created_at?: string
          created_by?: string | null
          data_entrega?: string | null
          forma_pagamento_id?: string | null
          fornecedor_id?: string
          frete_tipo?: Database["public"]["Enums"]["frete_tipo"]
          id?: string
          numero_sequencial?: number
          status?: Database["public"]["Enums"]["status_pedido_compra"]
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          valor_frete?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_condicao_pagamento_id_fkey"
            columns: ["condicao_pagamento_id"]
            isOneToOne: false
            referencedRelation: "payment_conditions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_forma_pagamento_id_fkey"
            columns: ["forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
            referencedColumns: ["id"]
          },
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
          created_at: string
          id: string
          item_id: string
          natureza_financeira_id: string | null
          quantidade: number
          quotation_id: string
          valor_unitario: number
        }
        Insert: {
          centro_custo_id?: string | null
          created_at?: string
          id?: string
          item_id: string
          natureza_financeira_id?: string | null
          quantidade?: number
          quotation_id: string
          valor_unitario?: number
        }
        Update: {
          centro_custo_id?: string | null
          created_at?: string
          id?: string
          item_id?: string
          natureza_financeira_id?: string | null
          quantidade?: number
          quotation_id?: string
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_natureza_financeira_id_fkey"
            columns: ["natureza_financeira_id"]
            isOneToOne: false
            referencedRelation: "financial_natures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          numero_sequencial: number
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          validade: string | null
          valor_total: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          numero_sequencial: number
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          validade?: string | null
          valor_total?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          numero_sequencial?: number
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          validade?: string | null
          valor_total?: number
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
          created_at: string
          created_by: string | null
          id: string
          nome: string
          percentual_comissao: number
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          percentual_comissao?: number
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          percentual_comissao?: number
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
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
      sales_order_items: {
        Row: {
          centro_custo_id: string | null
          created_at: string
          id: string
          item_id: string
          natureza_financeira_id: string | null
          quantidade: number
          sales_order_id: string
          valor_unitario: number
        }
        Insert: {
          centro_custo_id?: string | null
          created_at?: string
          id?: string
          item_id: string
          natureza_financeira_id?: string | null
          quantidade?: number
          sales_order_id: string
          valor_unitario?: number
        }
        Update: {
          centro_custo_id?: string | null
          created_at?: string
          id?: string
          item_id?: string
          natureza_financeira_id?: string | null
          quantidade?: number
          sales_order_id?: string
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_natureza_financeira_id_fkey"
            columns: ["natureza_financeira_id"]
            isOneToOne: false
            referencedRelation: "financial_natures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          condicao_pagamento_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          forma_pagamento_id: string | null
          id: string
          numero_sequencial: number
          quotation_id: string | null
          representante_id: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          valor_total: number
        }
        Insert: {
          condicao_pagamento_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          forma_pagamento_id?: string | null
          id?: string
          numero_sequencial: number
          quotation_id?: string | null
          representante_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          valor_total?: number
        }
        Update: {
          condicao_pagamento_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          forma_pagamento_id?: string | null
          id?: string
          numero_sequencial?: number
          quotation_id?: string | null
          representante_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_condicao_pagamento_id_fkey"
            columns: ["condicao_pagamento_id"]
            isOneToOne: false
            referencedRelation: "payment_conditions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_forma_pagamento_id_fkey"
            columns: ["forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "representantes"
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
          created_at: string
          id: string
          item_id: string
          natureza_financeira_id: string | null
          quantidade: number
          service_order_id: string
          valor_unitario: number
        }
        Insert: {
          centro_custo_id?: string | null
          created_at?: string
          id?: string
          item_id: string
          natureza_financeira_id?: string | null
          quantidade?: number
          service_order_id: string
          valor_unitario?: number
        }
        Update: {
          centro_custo_id?: string | null
          created_at?: string
          id?: string
          item_id?: string
          natureza_financeira_id?: string | null
          quantidade?: number
          service_order_id?: string
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_order_items_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_items_natureza_financeira_id_fkey"
            columns: ["natureza_financeira_id"]
            isOneToOne: false
            referencedRelation: "financial_natures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_items_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          condicao_pagamento_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          data_fim: string | null
          data_fim_prevista: string | null
          data_inicio: string | null
          data_inicio_prevista: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          valor_total: number
        }
        Insert: {
          condicao_pagamento_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          data_fim?: string | null
          data_fim_prevista?: string | null
          data_inicio?: string | null
          data_inicio_prevista?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          valor_total?: number
        }
        Update: {
          condicao_pagamento_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          data_fim?: string | null
          data_fim_prevista?: string | null
          data_inicio?: string | null
          data_inicio_prevista?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_condicao_pagamento_id_fkey"
            columns: ["condicao_pagamento_id"]
            isOneToOne: false
            referencedRelation: "payment_conditions"
            referencedColumns: ["id"]
          },
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
          created_at: string
          created_by: string | null
          custo_unitario: number
          documento_origem: string | null
          id: string
          item_id: string
          quantidade: number
          saldo_resultante: number
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_movimento"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custo_unitario?: number
          documento_origem?: string | null
          id?: string
          item_id: string
          quantidade: number
          saldo_resultante?: number
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_movimento"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custo_unitario?: number
          documento_origem?: string | null
          id?: string
          item_id?: string
          quantidade?: number
          saldo_resultante?: number
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_movimento"]
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
      supplier_item_mappings: {
        Row: {
          created_at: string
          id: string
          item_id: string
          supplier_id: string
          supplier_item_code: string | null
          supplier_item_description: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          supplier_id: string
          supplier_item_code?: string | null
          supplier_item_description: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          supplier_id?: string
          supplier_item_code?: string | null
          supplier_item_description?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_item_mappings_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_item_mappings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_item_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          ativo: boolean
          cnpj: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          nome_fantasia: string | null
          razao_social: string
          telefone: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          nome_fantasia?: string | null
          razao_social: string
          telefone?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          nome_fantasia?: string | null
          razao_social?: string
          telefone?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
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
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string
          id?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string
          id?: string
          tenant_id?: string
          updated_at?: string
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
          created_at: string
          id: string
          permission_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          tenant_id?: string
          user_id?: string
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
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tenants: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      baixar_titulo_pagar:
        | {
            Args: {
              p_banco_id: string
              p_titulo_id: string
              p_user_id?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_banco_id: string
              p_data_baixa?: string
              p_desconto?: number
              p_juros?: number
              p_multa?: number
              p_observacao?: string
              p_titulo_id: string
              p_user_id?: string
            }
            Returns: undefined
          }
      baixar_titulo_receber:
        | {
            Args: {
              p_banco_id: string
              p_titulo_id: string
              p_user_id?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_banco_id: string
              p_data_baixa?: string
              p_desconto?: number
              p_juros?: number
              p_multa?: number
              p_observacao?: string
              p_titulo_id: string
              p_user_id?: string
            }
            Returns: undefined
          }
      cancel_purchase_order: { Args: { p_id: string }; Returns: undefined }
      cancel_quotation: { Args: { p_id: string }; Returns: undefined }
      cancel_sales_order: { Args: { p_id: string }; Returns: undefined }
      cancelar_documento_entrada: {
        Args: { p_document_id: string; p_user_id: string }
        Returns: undefined
      }
      cancelar_documento_saida: {
        Args: { p_document_id: string; p_user_id?: string }
        Returns: undefined
      }
      check_entity_dependencies: {
        Args: { p_entity: string; p_id: string }
        Returns: string
      }
      confirmar_documento_entrada: {
        Args: { p_document_id: string; p_user_id?: string }
        Returns: undefined
      }
      confirmar_documento_saida: {
        Args: { p_document_id: string; p_user_id?: string }
        Returns: undefined
      }
      confirmar_ordem_servico: {
        Args: { p_os_id: string; p_user_id: string }
        Returns: undefined
      }
      delete_cost_center_safe: { Args: { p_id: string }; Returns: undefined }
      delete_financial_nature_safe: {
        Args: { p_id: string }
        Returns: undefined
      }
      delete_user_safe:
        | {
            Args: {
              p_admin_user_id: string
              p_auth_id: string
              p_tenant_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_admin_user_id: string
              p_auth_id: string
              p_tenant_id: string
            }
            Returns: undefined
          }
      estornar_baixa_pagar: {
        Args: { p_titulo_id: string; p_user_id?: string }
        Returns: undefined
      }
      estornar_baixa_receber: {
        Args: { p_titulo_id: string; p_user_id?: string }
        Returns: undefined
      }
      generate_accounts_payable: {
        Args: {
          p_data_vencimento: string
          p_documento_origem?: string
          p_fornecedor_id: string
          p_tenant_id: string
          p_user_id?: string
          p_valor: number
        }
        Returns: string
      }
      generate_stock_movement: {
        Args: {
          p_custo_unitario: number
          p_documento_origem?: string
          p_item_id: string
          p_quantidade: number
          p_tenant_id: string
          p_tipo: Database["public"]["Enums"]["tipo_movimento"]
          p_user_id?: string
        }
        Returns: string
      }
      gerar_documento_saida_os: {
        Args: { p_os_id: string; p_user_id: string }
        Returns: string
      }
      gerar_movimentacao_estoque: {
        Args: {
          p_custo_unitario: number
          p_documento_origem: string
          p_item_id: string
          p_quantidade: number
          p_tenant_id: string
          p_tipo: Database["public"]["Enums"]["tipo_movimento"]
          p_user_id?: string
        }
        Returns: string
      }
      gerar_titulos_pagar: {
        Args: {
          p_condicao_pagamento_id: string
          p_documento_origem: string
          p_fornecedor_id: string
          p_tenant_id: string
          p_user_id?: string
          p_valor_total: number
        }
        Returns: undefined
      }
      gerar_titulos_receber: {
        Args: {
          p_cliente_id: string
          p_condicao_pagamento_id: string
          p_documento_origem: string
          p_tenant_id: string
          p_user_id?: string
          p_valor_total: number
        }
        Returns: undefined
      }
      get_po_pending_items: {
        Args: { p_purchase_order_id: string }
        Returns: {
          impostos: number
          item_codigo: string
          item_descricao: string
          item_id: string
          quantidade_pedida: number
          quantidade_pendente: number
          quantidade_recebida: number
          valor_unitario: number
        }[]
      }
      get_purchase_orders_with_pending_balance: {
        Args: { p_tenant_id: string }
        Returns: {
          condicao_pagamento_id: string
          fornecedor_id: string
          fornecedor_nome: string
          id: string
          numero_sequencial: number
          status: string
          valor_frete: number
        }[]
      }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_permission: {
        Args: { _action: string; _module: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id?: string
          _user_id: string
        }
        Returns: boolean
      }
      has_user_tenant_link: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      is_admin_empresa: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      is_admin_global: { Args: { _user_id: string }; Returns: boolean }
      is_admin_global_in_tenant: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      is_period_closed: {
        Args: { p_date: string; p_tenant_id: string }
        Returns: boolean
      }
      link_current_user_to_tenant: {
        Args: { _tenant_id: string }
        Returns: undefined
      }
      seed_financial_data_for_tenant: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      validate_inbound_doc_unique: {
        Args: { p_numero: string; p_serie: string; p_tenant_id: string }
        Returns: boolean
      }
      validate_purchase_order_editable: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      validate_quotation_editable: {
        Args: { p_quotation_id: string }
        Returns: undefined
      }
      validate_sales_order_editable: {
        Args: { p_order_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin_global" | "admin_empresa" | "usuario"
      frete_tipo: "GLOBAL" | "POR_ITEM"
      plano_tipo: "basico" | "profissional" | "enterprise"
      status_documento: "PENDENTE" | "PROCESSADO" | "CANCELADO"
      status_financeiro: "ABERTO" | "PAGO" | "CANCELADO"
      status_geral: "ativo" | "inativo" | "suspenso"
      status_pedido_compra: "ABERTO" | "PARCIAL" | "ATENDIDO" | "CANCELADO"
      tipo_grupo: "SINTETICO" | "ANALITICO"
      tipo_item:
        | "REVENDA"
        | "MATERIA_PRIMA"
        | "EMBALAGEM"
        | "PRODUTO_ACABADO"
        | "USO_CONSUMO"
        | "SERVICO"
      tipo_movimento: "ENTRADA" | "SAIDA" | "AJUSTE"
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
      plano_tipo: ["basico", "profissional", "enterprise"],
      status_documento: ["PENDENTE", "PROCESSADO", "CANCELADO"],
      status_financeiro: ["ABERTO", "PAGO", "CANCELADO"],
      status_geral: ["ativo", "inativo", "suspenso"],
      status_pedido_compra: ["ABERTO", "PARCIAL", "ATENDIDO", "CANCELADO"],
      tipo_grupo: ["SINTETICO", "ANALITICO"],
      tipo_item: [
        "REVENDA",
        "MATERIA_PRIMA",
        "EMBALAGEM",
        "PRODUTO_ACABADO",
        "USO_CONSUMO",
        "SERVICO",
      ],
      tipo_movimento: ["ENTRADA", "SAIDA", "AJUSTE"],
    },
  },
} as const
