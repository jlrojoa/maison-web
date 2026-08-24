-- Terranova: agrega como colores nuevos las 18 fotos de Froca que ya estaban subidas al
-- bucket (terranova-01..25) pero que no correspondian a ninguno de los 7 colores nombrados
-- que ya existian (Arena, Grafito, Tiza, Camel, Terracota, Azul Noche, Verde Bosque).
-- Froca no da nombre a estos, solo numero -> se nombran literal "Terranova NN", mismo
-- criterio ya usado para Nantes. codigo_hex es el promedio de color real de cada foto
-- (no inventado). composicion y martindale replican lo que ya tienen las otras 7 filas
-- de Terranova (100% Poliester, martindale NULL porque la ficha real solo dice >100.000).
-- orden continua despues del maximo actual (7) para no reordenar los 7 ya existentes.

insert into tela_colores (tela_id, nombre, imagen_url, orden, codigo_hex, composicion, martindale, activo)
values
  ('a1000000-0000-0000-0000-000000000001', 'Terranova 02', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/terranova/terranova-02.webp', 8,  '#666666', '100% Poliéster', null, true),
  ('a1000000-0000-0000-0000-000000000001', 'Terranova 03', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/terranova/terranova-03.webp', 9,  '#949995', '100% Poliéster', null, true),
  ('a1000000-0000-0000-0000-000000000001', 'Terranova 04', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/terranova/terranova-04.webp', 10, '#9D9D9D', '100% Poliéster', null, true),
  ('a1000000-0000-0000-0000-000000000001', 'Terranova 06', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/terranova/terranova-06.webp', 11, '#DBD2B9', '100% Poliéster', null, true),
  ('a1000000-0000-0000-0000-000000000001', 'Terranova 08', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/terranova/terranova-08.webp', 12, '#B2B1AC', '100% Poliéster', null, true),
  ('a1000000-0000-0000-0000-000000000001', 'Terranova 09', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/terranova/terranova-09.webp', 13, '#666666', '100% Poliéster', null, true),
  ('a1000000-0000-0000-0000-000000000001', 'Terranova 10', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/terranova/terranova-10.webp', 14, '#6D524F', '100% Poliéster', null, true),
  ('a1000000-0000-0000-0000-000000000001', 'Terranova 11', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/terranova/terranova-11.webp', 15, '#8A6057', '100% Poliéster', null, true),
  ('a1000000-0000-0000-0000-000000000001', 'Terranova 12', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/terranova/terranova-12.webp', 16, '#795E4C', '100% Poliéster', null, true),
  ('a1000000-0000-0000-0000-000000000001', 'Terranova 14', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/terranova/terranova-14.webp', 17, '#987012', '100% Poliéster', null, true),
  ('a1000000-0000-0000-0000-000000000001', 'Terranova 16', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/terranova/terranova-16.webp', 18, '#81381E', '100% Poliéster', null, true),
  ('a1000000-0000-0000-0000-000000000001', 'Terranova 17', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/terranova/terranova-17.webp', 19, '#752934', '100% Poliéster', null, true),
  ('a1000000-0000-0000-0000-000000000001', 'Terranova 18', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/terranova/terranova-18.webp', 20, '#5F3942', '100% Poliéster', null, true),
  ('a1000000-0000-0000-0000-000000000001', 'Terranova 19', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/terranova/terranova-19.webp', 21, '#411E26', '100% Poliéster', null, true),
  ('a1000000-0000-0000-0000-000000000001', 'Terranova 20', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/terranova/terranova-20.webp', 22, '#35484E', '100% Poliéster', null, true),
  ('a1000000-0000-0000-0000-000000000001', 'Terranova 22', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/terranova/terranova-22.webp', 23, '#1B494B', '100% Poliéster', null, true),
  ('a1000000-0000-0000-0000-000000000001', 'Terranova 23', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/terranova/terranova-23.webp', 24, '#A2B5AC', '100% Poliéster', null, true),
  ('a1000000-0000-0000-0000-000000000001', 'Terranova 24', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/terranova/terranova-24.webp', 25, '#506F66', '100% Poliéster', null, true);
