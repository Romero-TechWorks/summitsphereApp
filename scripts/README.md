# `scripts/` — utilidades fuera de la aplicación

Utilidades que se corren a mano o desde GitHub Actions, nunca en tiempo de
ejecución de la aplicación.

## Escritos

| Script | Para qué |
|---|---|
| `backup.sh` | Volcado cifrado de la base a R2, con rotación. Lo llama `.github/workflows/backup.yml`, pero corre igual desde cualquier máquina con psql 17, gpg y aws-cli |

⚠️ **`backup.sh` produce un archivo con datos personales de todos los clientes de
la firma.** La passphrase de GPG es el control técnico que exige la LFPDPPP sobre
ese archivo, y se guarda en un lugar distinto del bucket. Ver
`docs/08_SEGURIDAD_Y_RLS.md` §7 y §8.

## Previstos

| Script | Fase | Para qué |
|---|---|---|
| `sembrar_normas.mjs` | 02 | Carga el árbol de cláusulas de las siete normas |
| `sembrar_noms.mjs` | 05 | Carga el catálogo de NOMs y sus requisitos |
| `condensar_clausulas.mjs` | 07 | Genera la forma *Token Diet* de cada cláusula |
| `verificar_aislamiento.mjs` | continuo | ⚠️ Prueba que un consultor no ve organizaciones que no le tocan |
| `generar_catalogos_sat.mjs` | 06 | Sólo si se enciende facturación |

⚠️ **La salida de `sembrar_normas.mjs` y `sembrar_noms.mjs` la revisa un auditor
líder antes de aplicarse** (tareas del dueño `C01` y `F01`). Es el criterio técnico
de la firma, y va a aparecer en cada informe que Summit entregue.
