-- ============================================================================
-- F03·B5 · El informe de auditoría — `objetivo` y el sello de emisión
--
-- Los dos cambios salen de leer el formato oficial de la firma, que llegó el
-- 30 ago 2026 con la tarea del dueño `D01`
-- (docs/formatos_informeAuditorias/F-SG-12_reporte_final.md).
--
-- ⚠️ Va DESPUÉS de `20260824120000_auditorias_y_hallazgos.sql`, que crea la
-- tabla y `sellar_cierre_auditoria()`. No depende de la partición de pruebas:
-- `auditorias` ya se parte sola por `org_id`, y una columna nueva en una tabla
-- que ya tiene sus políticas no necesita ninguna política nueva (CLAUDE.md,
-- regla 1).
-- ============================================================================


-- ============================================================================
-- §1 · `objetivo` — porque no es lo mismo que el alcance
-- ============================================================================
--
-- F-SG-11 (planeación) y F-SG-12 (informe) abren **los dos** con «Objetivo», y
-- hasta hoy el objetivo sólo vivía en `programa_auditorias`. Eso no alcanza por
-- dos motivos:
--
--   1. `auditorias.programa_id` es NULLABLE. Una auditoría de seguimiento, una
--      preauditoría o la primera de un cliente nuevo no cuelgan de ningún
--      programa anual — y se quedaban sin objetivo que imprimir.
--   2. El objetivo del programa es del **año entero** («mantener la
--      certificación»); el de la auditoría es de **esta visita** («evaluar el
--      grado de cumplimiento contra lo establecido en el SGC»). Son cosas
--      distintas y el informe las lee por separado.
--
-- ⚠️ **Por qué una columna y no reusar `alcance`.** El objetivo dice *para qué
-- se audita* y el alcance *qué se audita* —«evaluar el cumplimiento» contra «las
-- tres plantas del grupo»—. Metidos en un mismo campo, la plantilla tendría que
-- partir un texto libre por la mitad para imprimirlos bajo sus dos subtítulos, y
-- eso no se puede hacer bien. El formato original los junta bajo un solo título
-- («Objetivo y Alcance de la auditoría») pero escribe los dos párrafos.
alter table public.auditorias
  add column objetivo text;

comment on column public.auditorias.objetivo is
  'Para qué se hace ESTA auditoría. Distinto del objetivo del programa anual, que es del año entero, y del alcance, que dice qué se audita. Se imprime en F-SG-11 y en F-SG-12.';


-- ============================================================================
-- §2 · El sello de emisión del informe
-- ============================================================================
--
-- `informe_emitido_en` existe desde `20260824120000` y **nunca lo ha escrito
-- nadie**: no tenía trigger y ninguna consulta lo tocaba, así que la pestaña
-- Plan lleva desde entonces diciendo «Sin emitir» sin manera de cambiarlo. B5 es
-- quien lo llena, y por la regla de las fechas de la Fase 03 lo tiene que sellar
-- **el servidor**:
--
--   · Una acción de CAMPO —`auditoria_items.evaluado_en`,
--     `hallazgos.detectado_en`— la manda el reloj del teléfono, porque el
--     auditor evaluó a las 10:15 en modo avión.
--   · Una acción de OFICINA —aprobar el programa, cerrar la auditoría, **emitir
--     el informe**— la sella el servidor.
--
-- ⚠️ **Y emitir es de oficina aunque el informe se imprima en la planta.** Son
-- dos cosas distintas y conviene no confundirlas: en la reunión de cierre se
-- *enseña* un preliminar —eso no toca esta columna, no escribe nada y se hace
-- desde la caché—; emitir es el acto formal por el que la firma entrega el
-- documento, y el procedimiento de la firma le da **una semana** de plazo
-- (P-SG-03 §5.4.5). Una fecha de emisión que viaja desde el navegador es una
-- fecha que se puede escribir a mano, y es justo la que un organismo
-- certificador contrasta contra ese plazo.
--
-- ⚠️ **Reemitir vuelve a sellar.** Si el auditor corrige el informe y lo emite
-- otra vez, la fecha que vale es la de la última entrega, no la de la primera:
-- por eso la condición es «cambió el valor», no «estaba en null». Y poner la
-- columna en null la deja en null — retractar una emisión es legítimo y no se
-- convierte en un sello nuevo.
create or replace function public.sellar_emision_informe()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.informe_emitido_en is not null
     and (tg_op = 'INSERT'
          or old.informe_emitido_en is distinct from new.informe_emitido_en) then
    new.informe_emitido_en := now();
  end if;

  return new;
end
$$;

comment on function public.sellar_emision_informe() is
  'El CUÁNDO de la emisión del informe lo pone el servidor: es una acción de oficina, y el plazo de una semana de P-SG-03 se mide contra ella.';

-- ⚠️ El nombre importa: los triggers de una tabla corren en **orden
-- alfabético**, y éste tiene que ir después de `auditorias_folio` (que sólo es
-- de INSERT) y no estorbar a `auditorias_sellar_cierre`. `auditorias_sellar_*`
-- los deja juntos y en orden estable: `sellar_cierre` antes que
-- `sellar_emision`, y ninguno lee lo que escribe el otro.
create trigger auditorias_sellar_emision
  before insert or update on public.auditorias
  for each row execute function public.sellar_emision_informe();
