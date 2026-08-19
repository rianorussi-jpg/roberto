-- CORRECCIÓN DE DUPLICADOS
-- Ejecuta este archivo UNA VEZ en Supabase > SQL Editor.
--
-- 1) Si un mismo nombre aparece varias veces, conserva la respuesta más reciente.
-- 2) Después crea una restricción que impide volver a guardar el mismo nombre
--    aunque lleguen dos peticiones al mismo tiempo.

delete from public.confirmaciones a
using public.confirmaciones b
where lower(btrim(a.nombre)) = lower(btrim(b.nombre))
  and a.id < b.id;

create unique index if not exists confirmaciones_nombre_unico_idx
on public.confirmaciones ((lower(btrim(nombre))));
