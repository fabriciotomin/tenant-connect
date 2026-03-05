
-- Remove "Administração - Empresas" permissions (admin_global only)
UPDATE permissions SET deleted_at = now() WHERE module = 'Administração - Empresas' AND deleted_at IS NULL;

-- Remove "Aprovar" action from "Administração - Usuários" (admin_global only)
UPDATE permissions SET deleted_at = now() WHERE module = 'Administração - Usuários' AND action = 'Aprovar' AND deleted_at IS NULL;
