// lib/pathSafe.js
export function pathSafe(filename) {
  return String(filename || 'file')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // sin acentos
    .replace(/\s+/g, '-')                             // espacios -> guiones
    .replace(/[^a-zA-Z0-9._-]/g, '')                  // solo seguro
    .toLowerCase()
    .slice(0, 120);
}
