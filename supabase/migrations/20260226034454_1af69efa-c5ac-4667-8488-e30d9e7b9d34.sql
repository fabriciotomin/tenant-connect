
-- Add unidade_medida to items table
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS unidade_medida varchar(10) NOT NULL DEFAULT 'UN';
