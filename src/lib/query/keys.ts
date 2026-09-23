/**
 * **Todas** las claves de caché de la aplicación.
 *
 * ⚠️ Una clave inventada dentro de un componente es un dato que no se invalida
 * cuando debe: se guarda un cambio, la pantalla de al lado sigue enseñando lo
 * viejo, y el usuario aprende a no confiar en lo que ve. Si hace falta una
 * clave nueva, se agrega aquí primero (docs/03_ARQUITECTURA.md §8.10).
 *
 * La forma es jerárquica a propósito: `['tablero']` invalida todo el tablero,
 * `['tablero','preferencias', id]` sólo esa fila.
 */

export const queryKeys = {
  usuario: {
    /** El perfil de quien tiene la sesión abierta: su nombre y su rol. */
    actual: () => ['usuario', 'actual'] as const,
  },
  /**
   * La identidad de la firma: el membrete de todo lo imprimible [F03·B5].
   *
   * ⚠️ Fuera de `cartera` porque no es de ningún cliente, y **sin la partición
   * dentro de la clave** al revés que las dos plantillas de `config_firma`:
   * aquéllas leen un jsonb partido por espacio de nombres, y esto es la misma
   * razón social para las dos particiones. Ver `src/lib/queries/firma.ts`.
   */
  firma: {
    identidad: () => ['firma', 'identidad'] as const,
  },
  tablero: {
    todo: () => ['tablero'] as const,
    /** El orden en que esta persona acomodó sus widgets. */
    preferencias: (usuarioId: string) => ['tablero', 'preferencias', usuarioId] as const,
  },
  cartera: {
    todo: () => ['cartera'] as const,
    /**
     * Toda la cartera visible, **sin filtrar**.
     *
     * ⚠️ El texto del buscador NO entra en la clave, y es una decisión de
     * offline, no de comodidad: si cada búsqueda fuera su propia consulta al
     * servidor, en una planta sin señal la lista se vaciaría en cuanto se
     * teclea la primera letra —esa clave no está en la caché— y el consultor
     * concluiría que la app perdió a sus clientes. Se descarga la cartera una
     * vez y **el filtro se aplica en memoria**. Son decenas de organizaciones,
     * no millones de filas.
     */
    organizaciones: () => ['cartera', 'organizaciones'] as const,
    organizacion: (id: string) => ['cartera', 'organizacion', id] as const,
    sitios: (orgId: string) => ['cartera', 'sitios', orgId] as const,
    contactos: (orgId: string) => ['cartera', 'contactos', orgId] as const,
    /** El directorio completo: todos los contactos de la cartera. */
    contactosTodos: () => ['cartera', 'contactos', 'todos'] as const,
    /** Quién de la firma tiene asignada esta organización. */
    equipo: (orgId: string) => ['cartera', 'equipo', orgId] as const,
    /** La gente de la firma que se puede asignar a un expediente. */
    usuariosFirma: () => ['cartera', 'usuarios-firma'] as const,
    /** Todos los proyectos visibles, para la pestaña de la cartera. */
    proyectos: () => ['cartera', 'proyectos'] as const,
    /** Los proyectos de una organización, dentro de su expediente. */
    proyectosDe: (orgId: string) => ['cartera', 'proyectos', orgId] as const,
    /** El checklist de la metodología de un proyecto, todas sus etapas. */
    tareas: (proyectoId: string) => ['cartera', 'tareas', proyectoId] as const,
    /** La línea de tiempo de un proyecto. */
    bitacora: (proyectoId: string) => ['cartera', 'bitacora', proyectoId] as const,
    /**
     * La plantilla de tareas de la firma, por tipo de proyecto.
     *
     * ⚠️ **La partición va DENTRO de la clave.** Es la única de `config_firma`
     * que la lleva, y hace falta: esa fila es una sola para las dos particiones
     * y se separan por espacio de nombres dentro del jsonb
     * (`src/lib/auth/particion.ts`). Con una clave común, la caché persistida
     * serviría la plantilla de la otra partición al cambiar de cuenta en el
     * mismo navegador — y el usuario la instanciaría en un proyecto sin
     * enterarse.
     */
    plantillaTareas: (esDev: boolean) => ['cartera', 'plantilla-tareas', esDev] as const,
    /** El alcance: qué normas y qué sitios cubre un proyecto. */
    alcanceNormas: (proyectoId: string) => ['cartera', 'alcance', 'normas', proyectoId] as const,
    alcanceSitios: (proyectoId: string) => ['cartera', 'alcance', 'sitios', proyectoId] as const,
  },
  /**
   * Los sistemas de gestión [Fase 02]: la biblioteca documental, la matriz de
   * requisitos y el mapa de procesos de cada cliente.
   *
   * ⚠️ Casi todo cuelga de una organización y **no de un filtro**. El buscador,
   * el tipo de documento y el estado de un requisito NO entran en la clave: se
   * descarga la lista del cliente una vez y se filtra en memoria (CLAUDE.md ·
   * reglas del offline, 7). Con una clave por filtro, en la planta la lista se
   * vacía al teclear la primera letra.
   */
  sistemas: {
    todo: () => ['sistemas'] as const,
    /** El mapa de procesos de un cliente. */
    procesos: (orgId: string) => ['sistemas', 'procesos', orgId] as const,
    /** La biblioteca documental de un cliente, entera. */
    documentos: (orgId: string) => ['sistemas', 'documentos', orgId] as const,
    /**
     * Lo que espera una firma en **toda** la cartera visible: el widget
     * «Documentos por aprobar» del tablero.
     *
     * ⚠️ La única clave de la Fase 02 sin `orgId`, y tiene que serlo: la
     * pregunta de la mañana es «qué tengo que firmar», no «qué tengo que firmar
     * de este cliente». El RLS ya la recorta a las organizaciones asignadas.
     */
    porAprobar: () => ['sistemas', 'documentos', 'por-aprobar'] as const,
    /** Un documento con todas sus versiones y las cláusulas que cubre. */
    documento: (documentoId: string) => ['sistemas', 'documento', documentoId] as const,
    /**
     * Qué documento cubre cada cláusula, para todo el cliente. Es lo que le da
     * respaldo a la matriz de requisitos: sin esto, «documentado» es una
     * afirmación sin nada detrás.
     */
    cobertura: (orgId: string) => ['sistemas', 'cobertura', orgId] as const,
    /** La matriz de requisitos de un proyecto. */
    requisitos: (proyectoId: string) => ['sistemas', 'requisitos', proyectoId] as const,
    /**
     * Las cláusulas auditables del alcance de un proyecto: las filas que la
     * matriz tiene que enseñar, existan o no todavía en `requisitos`.
     */
    clausulasDelAlcance: (proyectoId: string) =>
      ['sistemas', 'clausulas-alcance', proyectoId] as const,
    riesgos: (orgId: string) => ['sistemas', 'riesgos', orgId] as const,
    indicadores: (orgId: string) => ['sistemas', 'indicadores', orgId] as const,
    /** Las mediciones de un indicador, para su semáforo y su serie. */
    mediciones: (indicadorId: string) => ['sistemas', 'mediciones', indicadorId] as const,
  },
  /**
   * Los adjuntos [F02·B2b].
   *
   * ⚠️ La clave lleva el **campo dominante**, no un OR: `campoDominante()`
   * decide de quién cuelga el adjunto y esta clave lo refleja. Un adjunto que
   * apareciera bajo dos claves se invalidaría en una y no en la otra.
   */
  adjuntos: {
    todo: () => ['adjuntos'] as const,
    de: (campo: string, id: string) => ['adjuntos', campo, id] as const,
  },
  /**
   * Las auditorías [Fase 03] — el núcleo.
   *
   * ⚠️ **No hay clave por cliente en los listados, y es deliberado.** A
   * diferencia de `/sistemas`, la semana de un auditor cruza clientes: el lunes
   * abre «qué auditorías tengo» de toda la cartera, no de una organización. Se
   * descarga la lista visible una vez y el filtro por cliente, por año y por
   * estado se aplica **en memoria** (CLAUDE.md · reglas del offline, 7).
   *
   * ⚠️ Y lo de una auditoría concreta SÍ cuelga de su id, porque es lo que la
   * precarga de campo mete en la caché antes de entrar a planta (§8.11).
   */
  auditorias: {
    todo: () => ['auditorias'] as const,
    /** El programa anual, de toda la cartera visible. */
    programas: () => ['auditorias', 'programas'] as const,
    /**
     * Los renglones por proceso de UN programa [F03·B6b]: su valor, las NC del
     * año anterior y en qué meses se audita.
     *
     * ⚠️ Cuelga del programa y no de la cartera, al revés que `programas()`: la
     * parrilla del F-SG-09 es de un cliente y un año, y son once o doce filas.
     * Bajar las de toda la cartera para pintar una sería traer el trabajo de
     * cinco clientes para enseñar el de uno.
     */
    programaProcesos: (programaId: string) =>
      ['auditorias', 'programa-procesos', programaId] as const,
    /** Todas las auditorías visibles, para el listado del dominio. */
    lista: () => ['auditorias', 'lista'] as const,
    /** Una auditoría concreta, con su cliente y su auditor líder. */
    auditoria: (id: string) => ['auditorias', 'auditoria', id] as const,
    /** El alcance: qué normas, qué sitios y qué procesos cubre. */
    alcanceNormas: (auditoriaId: string) => ['auditorias', 'alcance', 'normas', auditoriaId] as const,
    alcanceSitios: (auditoriaId: string) => ['auditorias', 'alcance', 'sitios', auditoriaId] as const,
    alcanceProcesos: (auditoriaId: string) => ['auditorias', 'alcance', 'procesos', auditoriaId] as const,
    /** El equipo auditor, con sus certificaciones para el informe. */
    equipo: (auditoriaId: string) => ['auditorias', 'equipo', auditoriaId] as const,
    /** El plan hora por hora que se le manda al cliente. */
    agenda: (auditoriaId: string) => ['auditorias', 'agenda', auditoriaId] as const,
    /**
     * La lista de verificación de una auditoría [F03·B2].
     *
     * ⚠️ **El veredicto NO entra en la clave.** El filtro «sólo lo que me falta»
     * de la pantalla de recorrido se aplica en memoria: con una clave por
     * filtro, en la planta la lista se vaciaría al tocarlo —esa clave no está en
     * la caché— y el auditor concluiría que perdió su trabajo.
     */
    items: (auditoriaId: string) => ['auditorias', 'items', auditoriaId] as const,
    /**
     * La plantilla de listas de verificación de la firma. Fuera de una auditoría
     * concreta porque es de todas: vive en `config_firma.plantillas`, igual que
     * la plantilla de tareas — y como ella, lleva la partición dentro de la
     * clave. Ver `cartera.plantillaTareas`.
     */
    plantillaVerificacion: (esDev: boolean) =>
      ['auditorias', 'plantilla-verificacion', esDev] as const,
    /**
     * Los hallazgos de una auditoría [F03·B4]. Es lo que se precarga antes de
     * entrar a planta: sin los previos, el auditor no puede comprobar si lo del
     * año pasado se cerró.
     */
    hallazgos: (auditoriaId: string) => ['auditorias', 'hallazgos', auditoriaId] as const,
    /**
     * **El tablero del lunes**: todos los hallazgos visibles de la cartera.
     *
     * ⚠️ Ni el estado, ni el cliente, ni la norma, ni la antigüedad entran en la
     * clave. Se descarga la lista una vez y se agrupa y filtra **en memoria** —
     * es la misma decisión que la de `cartera.organizaciones()` y la que evita
     * que la pantalla se vacíe al tocar un filtro sin señal.
     */
    hallazgosDeLaCartera: () => ['auditorias', 'hallazgos', 'cartera'] as const,
    /** El historial de un hallazgo: lo que un certificador viene a revisar. */
    historial: (hallazgoId: string) => ['auditorias', 'historial', hallazgoId] as const,
  },
  /**
   * El ciclo de acciones [F04·B1]: lo que cierra una no conformidad.
   *
   * ⚠️ **Vive fuera de `auditorias` a propósito.** Una acción nace igual de una
   * queja, de un indicador bajo meta o de una mejora suelta —desde `B0` una NC
   * ya no necesita auditoría—, así que colgarla del dominio de auditorías haría
   * que invalidar una lista de auditorías tirara acciones que no tienen nada que
   * ver, y al revés.
   */
  acciones: {
    todo: () => ['acciones'] as const,
    /**
     * **Todas las acciones visibles de la cartera**, que es como se trabaja: el
     * Coordinador del SGC abre «qué vence esta semana», no «qué tiene Planta
     * Norte».
     *
     * ⚠️ Ni el estado, ni el cliente, ni el tipo, ni el texto del buscador entran
     * en la clave: se descarga la lista una vez y se filtra **en memoria**. Es la
     * misma decisión que `hallazgosDeLaCartera()` y la que evita que la pantalla
     * se vacíe al teclear la primera letra sin señal.
     */
    lista: () => ['acciones', 'lista'] as const,
    /**
     * Las acciones de un hallazgo. Es lo que la ficha del hallazgo pinta debajo
     * del análisis de causa, y lo que necesita el promedio de avance del
     * `F-SG-17`.
     */
    delHallazgo: (hallazgoId: string) => ['acciones', 'hallazgo', hallazgoId] as const,
    /** Las acciones de un plan de mejora, con su calendario P/R (F-SG-16). */
    delPlan: (planId: string) => ['acciones', 'plan', planId] as const,
    /**
     * Los planes de mejora (F-SG-16), los cambios de SGC (F-SG-24) y las quejas
     * (F-SG-08) de **toda la cartera**.
     *
     * ⚠️ **Sin `orgId` en la clave, y a propósito.** Es la misma decisión que
     * `acciones.lista()` y que el tablero del lunes: quien abre esta pantalla
     * trabaja la semana entera, no un cliente; y una clave por organización
     * significa una lista que puede faltar en la caché por cada cliente. Se baja
     * una vez y se filtra en memoria.
     */
    planes: () => ['acciones', 'planes'] as const,
    cambios: () => ['acciones', 'cambios'] as const,
    quejas: () => ['acciones', 'quejas'] as const,
  },
  /**
   * El buscador global de la Navbar [F06·B4].
   *
   * ⚠️ **Es la ÚNICA clave con el texto tecleado dentro, y NO se persiste**
   * (`src/lib/offline/persistencia.ts` la salta). La regla 7 del offline dice
   * que un filtro no es una consulta, y aquí sí lo es a propósito: buscar en
   * toda la cartera es justo lo que no cabe en memoria. Lo que la regla protege
   * —que sin señal la lista no se vacíe— lo cubre `buscarEnCache()`, que busca
   * en las listas ya bajadas cuando esta consulta no puede salir.
   */
  busqueda: {
    todo: () => ['busqueda'] as const,
    global: (texto: string) => ['busqueda', 'global', texto] as const,
  },
  /**
   * La administración de la firma [F06·B3].
   *
   * ⚠️ **`usuarios` es la lista COMPLETA, activas y dadas de baja**, y no es la
   * misma que `cartera.usuariosFirma()`: aquélla es el desplegable de un
   * expediente y sólo trae la gente activa de la firma. Cambiar un rol o dar
   * de baja invalida **las dos**.
   */
  admin: {
    usuarios: () => ['admin', 'usuarios'] as const,
  },
  /**
   * Los avisos al teléfono [F04·B3].
   *
   * ⚠️ **Ninguna lleva `usuarioId` en la clave, y es a propósito**: las dos son
   * de quien está dentro y la política sólo le deja ver lo suyo. Meter el id
   * duplicaría la entrada al cambiar de cuenta en el mismo navegador, y la
   * persistida de la sesión anterior se quedaría ahí colgando.
   */
  avisos: {
    todo: () => ['avisos'] as const,
    /** Los aparatos suscritos de quien está dentro. */
    suscripciones: () => ['avisos', 'suscripciones'] as const,
    /** Qué categorías tiene apagadas. */
    preferencias: () => ['avisos', 'preferencias'] as const,
  },
  /**
   * El cumplimiento normativo [F05·B1].
   *
   * ⚠️ **Lo del cliente cuelga de la ORGANIZACIÓN, no del sitio ni del área.** El
   * recorrido se camina por sitio y por área, pero esos dos son filtros **en
   * memoria** (CLAUDE.md · reglas del offline, 7): con una clave por sitio, en la
   * planta cambiar de sitio vaciaría la lista —esa clave no está en la caché— y
   * el consultor concluiría que perdió su trabajo. Un cliente son decenas o
   * cientos de obligaciones, no millones.
   *
   * ⚠️ **Y la biblioteca no lleva `orgId`**: es de la firma, como `normas`. El
   * RLS ya la recorta a la partición de quien pregunta.
   */
  cumplimiento: {
    todo: () => ['cumplimiento'] as const,
    /** La biblioteca de NOMs con sus elementos verificables. */
    noms: () => ['cumplimiento', 'noms'] as const,
    /** Los tipos de obligación de la firma (decisión 3: catálogo editable). */
    tipos: () => ['cumplimiento', 'tipos'] as const,
    /** La matriz entera de un cliente, todos sus sitios. */
    obligaciones: (orgId: string) => ['cumplimiento', 'obligaciones', orgId] as const,
    /** Las áreas de todos los sitios de un cliente. */
    areas: (orgId: string) => ['cumplimiento', 'areas', orgId] as const,
    /**
     * La evidencia de todas las obligaciones de un cliente, **en una sola
     * consulta**.
     *
     * ⚠️ Al revés que `adjuntos.de(campo, id)`, que es una clave por fila. Aquí
     * la precarga tiene que bajar la evidencia de un sitio entero antes de
     * entrar, y una consulta por obligación serían cien viajes con media barra de
     * señal en la puerta de la planta. La fila del recorrido filtra en memoria.
     */
    adjuntos: (orgId: string) => ['cumplimiento', 'adjuntos', orgId] as const,
    /**
     * **Los vencimientos de TODA la cartera** [F05·B2].
     *
     * ⚠️ Al revés que las obligaciones, **sin `orgId`**: la comparten la pestaña
     * Vencimientos —que filtra el cliente en memoria— y el widget «Vencimientos
     * críticos», que cruza la cartera. Así el tablero no estrena clave (§8.10) y
     * abrir una deja lista la otra. Son decenas por cliente, no miles.
     */
    vencimientos: () => ['cumplimiento', 'vencimientos'] as const,
  },
  /**
   * Capacitación [F05·B3].
   *
   * ⚠️ La biblioteca —cursos y proveedores— sin `orgId`, como `noms`: es de la
   * firma y el RLS la recorta a la partición. Lo del cliente, **una lista plana
   * por organización**: la sesión, el año y el estado del DC-3 se filtran en
   * memoria (reglas del offline, 7).
   */
  capacitacion: {
    todo: () => ['capacitacion'] as const,
    cursos: () => ['capacitacion', 'cursos'] as const,
    proveedores: () => ['capacitacion', 'proveedores'] as const,
    dnc: (orgId: string) => ['capacitacion', 'dnc', orgId] as const,
    sesiones: (orgId: string) => ['capacitacion', 'sesiones', orgId] as const,
    /** Los de TODAS las sesiones del cliente; la ficha filtra los suyos. */
    asistentes: (orgId: string) => ['capacitacion', 'asistentes', orgId] as const,
  },
  /**
   * El catálogo de normas. Fuera de `cartera` porque no es de nadie: lo usan
   * también los sistemas de gestión [Fase 02] y las auditorías [Fase 03].
   */
  normas: {
    catalogo: () => ['normas', 'catalogo'] as const,
    /** El catálogo con su árbol de cláusulas, para la pantalla de Sistemas. */
    arbol: () => ['normas', 'arbol'] as const,
  },
} as const
