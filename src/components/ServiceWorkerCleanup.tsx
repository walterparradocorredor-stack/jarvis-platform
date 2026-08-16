"use client";

import { useEffect } from "react";

// Esta app nunca registró un Service Worker, pero si el navegador del
// usuario tiene uno viejo de un deploy anterior (u otro proyecto en el mismo
// dominio) todavía activo, puede quedar interceptando fetch() y sirviendo
// respuestas cacheadas con esquema http:// viejo — explica errores de
// "Mixed Content" en botones que en el servidor funcionan perfecto (verificado
// con curl real). Se desregistra cualquier SW fantasma y se limpia su caché,
// una sola vez por carga, sin afectar nada si no hay ninguno.
export default function ServiceWorkerCleanup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) reg.unregister();
    });
    if ("caches" in window) {
      caches.keys().then((keys) => {
        for (const key of keys) caches.delete(key);
      });
    }
  }, []);

  return null;
}
