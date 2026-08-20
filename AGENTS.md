<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all
differ from your training data. Read the relevant guide in
`node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# SummitApp

La guía completa del proyecto está en [`CLAUDE.md`](CLAUDE.md). Es obligatoria y
manda sobre cualquier costumbre. El orden de trabajo lo decide
[`docs/02_PLAN_DE_FASES.md`](docs/02_PLAN_DE_FASES.md).

Dos cosas que un agente rompe el primer día si nadie se las dice:

1. El middleware es `src/proxy.ts` con función `proxy`, no `middleware.ts`.
2. Toda tabla de dominio lleva `org_id` y RLS cerrado. Sin eso, los datos de una
   organización cliente se le aparecen a otra.
