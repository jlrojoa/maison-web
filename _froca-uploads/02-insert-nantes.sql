-- Nantes: catalogo nuevo (de prueba, JL reemplazara despues).
-- Composicion y specs tomadas de la ficha tecnica real (froca.com/cli/fichas/nantes.pdf):
-- 90% PES / 10% COT, 140cm, 450 gr/m2, >100.000 ciclos (sin cifra exacta -> martindale NULL).
-- Grado 'A' confirmado por JL. Nombres de color son literal 'Nantes NN' (Froca no da nombres, solo numeros).
-- descripcion se deja NULL a proposito -- eso lo redacta JL, no lo invento.

with new_tela as (
  insert into telas (nombre, grado, descripcion, orden, activo)
  values ('Nantes', 'A', null, 3, true)
  returning id
)
insert into tela_colores (tela_id, nombre, imagen_url, orden, codigo_hex, composicion, martindale, activo)
select new_tela.id, v.nombre, v.imagen_url, v.orden, v.codigo_hex, '90% PES / 10% COT', null, true
from new_tela, (values
  ('Nantes 01', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/nantes/nantes-01.jpg', 0, '#282828'),
  ('Nantes 02', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/nantes/nantes-02.jpg', 1, '#4E4E4E'),
  ('Nantes 03', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/nantes/nantes-03.jpg', 2, '#A0A098'),
  ('Nantes 04', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/nantes/nantes-04.jpg', 3, '#B1B1AF'),
  ('Nantes 05', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/nantes/nantes-05.jpg', 4, '#B4B4AA'),
  ('Nantes 06', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/nantes/nantes-06.jpg', 5, '#D1D0BD'),
  ('Nantes 07', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/nantes/nantes-07.jpg', 6, '#F2F3F0'),
  ('Nantes 08', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/nantes/nantes-08.jpg', 7, '#E8E6D7'),
  ('Nantes 09', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/nantes/nantes-09.jpg', 8, '#BCB3A5'),
  ('Nantes 10', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/nantes/nantes-10.jpg', 9, '#8C857B'),
  ('Nantes 11', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/nantes/nantes-11.jpg', 10, '#50514B'),
  ('Nantes 12', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/nantes/nantes-12.jpg', 11, '#494136'),
  ('Nantes 13', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/nantes/nantes-13.jpg', 12, '#E0CC90'),
  ('Nantes 14', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/nantes/nantes-14.jpg', 13, '#C49D64'),
  ('Nantes 15', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/nantes/nantes-15.jpg', 14, '#B97D4B'),
  ('Nantes 16', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/nantes/nantes-16.jpg', 15, '#8E5345'),
  ('Nantes 17', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/nantes/nantes-17.jpg', 16, '#8B3B37'),
  ('Nantes 18', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/nantes/nantes-18.jpg', 17, '#B96E52'),
  ('Nantes 19', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/nantes/nantes-19.jpg', 18, '#CFB8B4'),
  ('Nantes 20', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/nantes/nantes-20.jpg', 19, '#A97F6E'),
  ('Nantes 21', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/nantes/nantes-21.jpg', 20, '#6E3F44'),
  ('Nantes 22', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/nantes/nantes-22.jpg', 21, '#243B51'),
  ('Nantes 23', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/nantes/nantes-23.jpg', 22, '#456E79'),
  ('Nantes 24', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/nantes/nantes-24.jpg', 23, '#6D9294'),
  ('Nantes 25', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/nantes/nantes-25.jpg', 24, '#A2AD8D'),
  ('Nantes 26', 'https://smnjbqjvqomopeulsuvp.supabase.co/storage/v1/object/public/telas/nantes/nantes-26.jpg', 25, '#849371')
) as v(nombre, imagen_url, orden, codigo_hex);
