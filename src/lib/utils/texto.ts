/**
 * Comparar texto como lo escribe una persona.
 *
 * ⚠️ Quita los acentos a propósito. En una cartera mexicana, medio catálogo
 * lleva tilde —*Aceros de México*, *Construcción Peninsular*— y nadie los
 * teclea al buscar con prisa, ni con el teclado del teléfono. Sin esto,
 * escribir "mexico" no encuentra "México" y el buscador parece roto.
 *
 * `NFD` separa la letra de su tilde y `\u0300-\u036f` es el rango de los
 * diacríticos combinados; lo que queda es la letra sola. Van escapados y no
 * literales para que el archivo se lea igual en cualquier editor.
 */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}
