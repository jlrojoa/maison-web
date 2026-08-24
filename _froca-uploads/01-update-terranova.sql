-- Terranova: apuntar las 7 filas existentes a las fotos reales de Froca ya subidas
-- al bucket 'telas' (telas/terranova/terranova-XX.webp).
-- Mapeo por tono visual + distancia de color contra los 25 colores de Froca.
-- Revisar la tabla de mapeo antes de correr esto — Camel es el match más débil.

update tela_colores set imagen_url =
  'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/terranova/terranova-07.webp'
  where id = '3fcdea4a-af54-4297-94aa-9dbb7c3d2ea3'; -- Arena

update tela_colores set imagen_url =
  'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/terranova/terranova-01.webp'
  where id = '0a192984-05cf-48e5-bc5f-43151feaf46a'; -- Grafito

update tela_colores set imagen_url =
  'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/terranova/terranova-05.webp'
  where id = '315f3df1-a5f8-46ae-a4eb-a04deb0de5a0'; -- Tiza

update tela_colores set imagen_url =
  'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/terranova/terranova-13.webp'
  where id = 'aec61725-1c85-4c67-b30c-78f329f15777'; -- Camel (match débil, ver nota)

update tela_colores set imagen_url =
  'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/terranova/terranova-15.webp'
  where id = '4a0707fd-5d5e-4279-90eb-84d9a79f8fa8'; -- Terracota

update tela_colores set imagen_url =
  'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/terranova/terranova-21.webp'
  where id = '327e3561-052b-4ac4-8d2a-111abeb9b6cd'; -- Azul Noche

update tela_colores set imagen_url =
  'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/terranova/terranova-25.webp'
  where id = '19c43508-7fd6-4699-8d17-e004f7c96134'; -- Verde Bosque

-- Opcional (no incluido arriba): el martindale actual de estas 7 filas está en 60000,
-- pero la ficha técnica real de Froca para Terranova dice ">100.000 ciclos". Si quieres
-- que lo corrija, avísame y agrego un UPDATE aparte para el campo martindale.
