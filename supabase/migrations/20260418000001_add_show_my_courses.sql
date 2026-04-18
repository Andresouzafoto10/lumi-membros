-- Adiciona toggle "Meus Cursos" nas configurações da plataforma
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS show_my_courses boolean DEFAULT true;
