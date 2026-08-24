-- La ficha tecnica real de Froca para Terranova (froca.com/cli/fichas/terranova.pdf) dice
-- resistencia a la abrasion ">100.000 ciclos", no un numero exacto. Hoy las 7 filas de
-- Terranova en tela_colores tienen martindale = 60000, que no corresponde a ese dato real.
-- Lo dejamos en NULL (no hay cifra exacta que poner) en vez de inventar un numero.
update tela_colores
set martindale = null
where tela_id = 'a1000000-0000-0000-0000-000000000001';
