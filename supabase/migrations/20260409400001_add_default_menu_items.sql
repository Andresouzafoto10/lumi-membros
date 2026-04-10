-- ============================================================
-- Add new default menu items for students: Trilhas and Aulas ao Vivo
-- ============================================================

-- Insert "Trilhas" after "Comunidade" (sort_order 2.5 → will be normalized)
INSERT INTO nav_menu_items (label, url, target, icon, visible, is_external, is_default, area, sort_order)
VALUES
  ('Trilhas', '/trilhas', '_self', 'Route', true, false, true, 'student', 25),
  ('Ao Vivo', '/aulas-ao-vivo', '_self', 'Video', true, false, true, 'student', 35)
ON CONFLICT DO NOTHING;
