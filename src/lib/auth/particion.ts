/**
 * La partición de pruebas, del lado del navegador.
 *
 * En la base es **una sola igualdad** —`organizaciones.es_demo = soy_dev()`— y
 * la impone el RLS, no esta capa (`supabase/migrations/20260825120000_…`,
 * CLAUDE.md · regla 1). Aquí no hay ningún candado: el código de esta carpeta
 * existe para lo único que la base no puede partir sola, que es
 * `config_firma.plantillas`.
 *
 * ⚠️ **Por qué las plantillas son el caso raro.** `config_firma` es una tabla de
 * **una fila** —lo impone su `check (id = 1)`— y las dos plantillas de la firma,
 * la de tareas por etapa y la de listas de verificación, viven dentro de su
 * `jsonb`. No hay `org_id` del que colgarlas ni fila que duplicar, así que un
 * RLS por partición tendría que partir columnas y eso Postgres no lo hace. Se
 * separan por **espacio de nombres** dentro del propio jsonb:
 *
 *     {
 *       "tareas":       { … },     ← la firma
 *       "verificacion": { … },     ← la firma
 *       "dev": {
 *         "tareas":       { … },   ← la partición de pruebas
 *         "verificacion": { … }
 *       }
 *     }
 *
 * Sin esto, una prueba de «Guardar como plantilla» reemplazaría la metodología
 * de la firma — y la plantilla de tareas es justo lo que se instancia en cada
 * proyecto nuevo, así que el estropicio aparecería semanas después y en el
 * expediente de un cliente.
 *
 * ⚠️ **Lo demás de `config_firma` SÍ se comparte, y es a propósito**: los datos
 * de la firma, el logotipo y los módulos encendidos son de la firma. Un módulo
 * se enciende y se apaga desde `/admin?tab=config`, y hacerlo por partición
 * significaría que la cuenta de pruebas nunca prueba lo que el cliente usa.
 */

/** La llave del espacio de nombres de pruebas dentro de `config_firma.plantillas`. */
export const RAIZ_DEV = 'dev'

function objeto(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === 'object' && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {}
}

/**
 * El contenedor de plantillas que le toca a quien pregunta.
 *
 * Se le pasa el `plantillas` crudo de `config_firma` y devuelve el objeto del
 * que hay que sacar `tareas` o `verificacion`. Los normalizadores de cada
 * consulta siguen leyendo a la defensiva desde ahí: este jsonb lo puede haber
 * escrito una versión vieja de la app o una mano en el SQL Editor.
 */
export function ramaDePlantillas(crudo: unknown, esDev: boolean): unknown {
  return esDev ? objeto(crudo)[RAIZ_DEV] : crudo
}

/**
 * El `plantillas` entero con una plantilla reemplazada, **sin tocar la del otro
 * lado**.
 *
 * Las dos pantallas que guardan plantilla leen y reescriben el jsonb completo
 * —lo hace un socio, de uno en uno—, así que lo que no se copie aquí se pierde.
 */
export function conPlantilla(
  previo: unknown,
  esDev: boolean,
  llave: 'tareas' | 'verificacion',
  valor: unknown,
): Record<string, unknown> {
  const raiz = objeto(previo)
  if (!esDev) return { ...raiz, [llave]: valor }
  return { ...raiz, [RAIZ_DEV]: { ...objeto(raiz[RAIZ_DEV]), [llave]: valor } }
}
