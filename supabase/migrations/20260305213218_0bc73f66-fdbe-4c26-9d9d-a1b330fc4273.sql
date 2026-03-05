-- Remove generic permissions and insert granular per-feature permissions
DELETE FROM user_permissions;
DELETE FROM permissions;

INSERT INTO permissions (module, action, description) VALUES
  -- Compras > Pedidos
  ('Compras - Pedidos', 'Visualizar', 'Visualizar pedidos de compra'),
  ('Compras - Pedidos', 'Criar', 'Criar novos pedidos de compra'),
  ('Compras - Pedidos', 'Editar', 'Editar pedidos de compra existentes'),
  ('Compras - Pedidos', 'Excluir', 'Cancelar/excluir pedidos de compra'),
  -- Compras > Entradas (NF-e)
  ('Compras - Entradas (NF-e)', 'Visualizar', 'Visualizar documentos de entrada'),
  ('Compras - Entradas (NF-e)', 'Criar', 'Criar documentos de entrada / importar XML'),
  ('Compras - Entradas (NF-e)', 'Editar', 'Editar documentos de entrada pendentes'),
  ('Compras - Entradas (NF-e)', 'Processar', 'Processar documentos de entrada (gera estoque e contas a pagar)'),
  ('Compras - Entradas (NF-e)', 'Cancelar', 'Cancelar documentos de entrada processados'),
  -- Estoque > Itens
  ('Estoque - Itens', 'Visualizar', 'Visualizar cadastro de itens'),
  ('Estoque - Itens', 'Criar', 'Criar novos itens'),
  ('Estoque - Itens', 'Editar', 'Editar itens existentes'),
  ('Estoque - Itens', 'Excluir', 'Excluir itens'),
  -- Estoque > Grupos
  ('Estoque - Grupos', 'Visualizar', 'Visualizar grupos de itens'),
  ('Estoque - Grupos', 'Criar', 'Criar grupos de itens'),
  ('Estoque - Grupos', 'Editar', 'Editar grupos de itens'),
  ('Estoque - Grupos', 'Excluir', 'Excluir grupos de itens'),
  -- Estoque > Movimentações
  ('Estoque - Movimentações', 'Visualizar', 'Visualizar movimentações de estoque'),
  ('Estoque - Movimentações', 'Criar', 'Criar movimentações manuais de estoque'),
  -- Comercial > Orçamentos
  ('Comercial - Orçamentos', 'Visualizar', 'Visualizar orçamentos'),
  ('Comercial - Orçamentos', 'Criar', 'Criar novos orçamentos'),
  ('Comercial - Orçamentos', 'Editar', 'Editar orçamentos existentes'),
  ('Comercial - Orçamentos', 'Excluir', 'Excluir orçamentos'),
  -- Comercial > Pedidos de Venda
  ('Comercial - Pedidos de Venda', 'Visualizar', 'Visualizar pedidos de venda'),
  ('Comercial - Pedidos de Venda', 'Criar', 'Criar pedidos de venda'),
  ('Comercial - Pedidos de Venda', 'Editar', 'Editar pedidos de venda'),
  ('Comercial - Pedidos de Venda', 'Excluir', 'Excluir pedidos de venda'),
  -- Comercial > Doc. Saída (NF-e)
  ('Comercial - Doc. Saída (NF-e)', 'Visualizar', 'Visualizar documentos de saída'),
  ('Comercial - Doc. Saída (NF-e)', 'Criar', 'Criar documentos de saída'),
  ('Comercial - Doc. Saída (NF-e)', 'Editar', 'Editar documentos de saída pendentes'),
  ('Comercial - Doc. Saída (NF-e)', 'Processar', 'Processar documentos de saída (gera estoque e contas a receber)'),
  ('Comercial - Doc. Saída (NF-e)', 'Cancelar', 'Cancelar documentos de saída processados'),
  -- Serviços > Ordens de Serviço
  ('Serviços - Ordens de Serviço', 'Visualizar', 'Visualizar ordens de serviço'),
  ('Serviços - Ordens de Serviço', 'Criar', 'Criar novas ordens de serviço'),
  ('Serviços - Ordens de Serviço', 'Editar', 'Editar ordens de serviço'),
  ('Serviços - Ordens de Serviço', 'Confirmar', 'Confirmar ordens de serviço (gera documento de saída)'),
  ('Serviços - Ordens de Serviço', 'Excluir', 'Excluir ordens de serviço'),
  -- Serviços > Agenda
  ('Serviços - Agenda', 'Visualizar', 'Visualizar agenda de serviços'),
  -- Financeiro > Contas a Pagar
  ('Financeiro - Contas a Pagar', 'Visualizar', 'Visualizar contas a pagar'),
  ('Financeiro - Contas a Pagar', 'Criar', 'Criar lançamentos de contas a pagar'),
  ('Financeiro - Contas a Pagar', 'Editar', 'Editar contas a pagar'),
  ('Financeiro - Contas a Pagar', 'Excluir', 'Excluir contas a pagar'),
  ('Financeiro - Contas a Pagar', 'Baixar', 'Dar baixa em contas a pagar'),
  -- Financeiro > Contas a Receber
  ('Financeiro - Contas a Receber', 'Visualizar', 'Visualizar contas a receber'),
  ('Financeiro - Contas a Receber', 'Criar', 'Criar lançamentos de contas a receber'),
  ('Financeiro - Contas a Receber', 'Editar', 'Editar contas a receber'),
  ('Financeiro - Contas a Receber', 'Excluir', 'Excluir contas a receber'),
  ('Financeiro - Contas a Receber', 'Baixar', 'Dar baixa em contas a receber'),
  -- Financeiro > Extrato Bancário
  ('Financeiro - Extrato Bancário', 'Visualizar', 'Visualizar extrato e movimentações bancárias'),
  ('Financeiro - Extrato Bancário', 'Criar', 'Criar movimentações bancárias'),
  ('Financeiro - Extrato Bancário', 'Editar', 'Editar movimentações bancárias'),
  ('Financeiro - Extrato Bancário', 'Excluir', 'Excluir movimentações bancárias'),
  -- Controladoria > DRE
  ('Controladoria - DRE', 'Visualizar', 'Visualizar Demonstrativo de Resultados'),
  -- Controladoria > Fluxo de Caixa
  ('Controladoria - Fluxo de Caixa', 'Visualizar', 'Visualizar Fluxo de Caixa'),
  -- Cadastros > Clientes
  ('Cadastros - Clientes', 'Visualizar', 'Visualizar cadastro de clientes'),
  ('Cadastros - Clientes', 'Criar', 'Criar clientes'),
  ('Cadastros - Clientes', 'Editar', 'Editar clientes'),
  ('Cadastros - Clientes', 'Excluir', 'Excluir clientes'),
  -- Cadastros > Fornecedores
  ('Cadastros - Fornecedores', 'Visualizar', 'Visualizar cadastro de fornecedores'),
  ('Cadastros - Fornecedores', 'Criar', 'Criar fornecedores'),
  ('Cadastros - Fornecedores', 'Editar', 'Editar fornecedores'),
  ('Cadastros - Fornecedores', 'Excluir', 'Excluir fornecedores'),
  -- Cadastros > Formas de Pagamento
  ('Cadastros - Formas de Pagamento', 'Visualizar', 'Visualizar formas de pagamento'),
  ('Cadastros - Formas de Pagamento', 'Criar', 'Criar formas de pagamento'),
  ('Cadastros - Formas de Pagamento', 'Editar', 'Editar formas de pagamento'),
  ('Cadastros - Formas de Pagamento', 'Excluir', 'Excluir formas de pagamento'),
  -- Cadastros > Condições de Pagamento
  ('Cadastros - Cond. Pagamento', 'Visualizar', 'Visualizar condições de pagamento'),
  ('Cadastros - Cond. Pagamento', 'Criar', 'Criar condições de pagamento'),
  ('Cadastros - Cond. Pagamento', 'Editar', 'Editar condições de pagamento'),
  ('Cadastros - Cond. Pagamento', 'Excluir', 'Excluir condições de pagamento'),
  -- Cadastros > Naturezas Financeiras
  ('Cadastros - Nat. Financeiras', 'Visualizar', 'Visualizar naturezas financeiras'),
  ('Cadastros - Nat. Financeiras', 'Criar', 'Criar naturezas financeiras'),
  ('Cadastros - Nat. Financeiras', 'Editar', 'Editar naturezas financeiras'),
  ('Cadastros - Nat. Financeiras', 'Excluir', 'Excluir naturezas financeiras'),
  -- Cadastros > Centros de Custo
  ('Cadastros - Centros de Custo', 'Visualizar', 'Visualizar centros de custo'),
  ('Cadastros - Centros de Custo', 'Criar', 'Criar centros de custo'),
  ('Cadastros - Centros de Custo', 'Editar', 'Editar centros de custo'),
  ('Cadastros - Centros de Custo', 'Excluir', 'Excluir centros de custo'),
  -- Cadastros > Bancos
  ('Cadastros - Bancos', 'Visualizar', 'Visualizar cadastro de bancos'),
  ('Cadastros - Bancos', 'Criar', 'Criar bancos'),
  ('Cadastros - Bancos', 'Editar', 'Editar bancos'),
  ('Cadastros - Bancos', 'Excluir', 'Excluir bancos'),
  -- Cadastros > Séries de Documento
  ('Cadastros - Séries de Documento', 'Visualizar', 'Visualizar séries de documento'),
  ('Cadastros - Séries de Documento', 'Criar', 'Criar séries de documento'),
  ('Cadastros - Séries de Documento', 'Editar', 'Editar séries de documento'),
  ('Cadastros - Séries de Documento', 'Excluir', 'Excluir séries de documento'),
  -- Cadastros > Unidades de Medida
  ('Cadastros - Unid. Medida', 'Visualizar', 'Visualizar unidades de medida'),
  ('Cadastros - Unid. Medida', 'Criar', 'Criar unidades de medida'),
  ('Cadastros - Unid. Medida', 'Editar', 'Editar unidades de medida'),
  ('Cadastros - Unid. Medida', 'Excluir', 'Excluir unidades de medida'),
  -- Administração > Usuários
  ('Administração - Usuários', 'Visualizar', 'Visualizar lista de usuários'),
  ('Administração - Usuários', 'Aprovar', 'Aprovar/rejeitar usuários pendentes'),
  ('Administração - Usuários', 'Editar Permissões', 'Gerenciar permissões de usuários'),
  ('Administração - Usuários', 'Excluir', 'Excluir usuários'),
  -- Administração > Empresas
  ('Administração - Empresas', 'Visualizar', 'Visualizar empresas'),
  ('Administração - Empresas', 'Criar', 'Criar novas empresas'),
  ('Administração - Empresas', 'Editar', 'Editar empresas'),
  ('Administração - Empresas', 'Excluir', 'Excluir empresas');