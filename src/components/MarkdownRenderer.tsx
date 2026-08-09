"use client";

import React from "react";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  // Procesador limpio de Markdown a React Elements (Elimina asteriscos crudos)
  const lines = content.split("\n");

  return (
    <div className="space-y-2 font-sans text-slate-200 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // 1. Títulos Principales (# o ## o **Título**)
        if (trimmed.startsWith("###")) {
          return (
            <h3 key={idx} className="text-sm font-bold text-cyan-300 mt-3 mb-1 tracking-wide uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              {parseInlineFormatting(trimmed.replace(/^###\s*/, ""))}
            </h3>
          );
        }

        if (trimmed.startsWith("##") || trimmed.startsWith("#")) {
          return (
            <h2 key={idx} className="text-base font-extrabold text-slate-100 mt-4 mb-2 border-b border-cyan-900/60 pb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {parseInlineFormatting(trimmed.replace(/^#+\s*/, ""))}
            </h2>
          );
        }

        // 2. Elementos de Lista (* o -)
        if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.match(/^\d+\.\s/)) {
          const itemText = trimmed.replace(/^[\*\-\d\.]+\s*/, "");
          return (
            <div key={idx} className="flex items-start gap-2.5 my-1 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5 shadow-sm shadow-cyan-400/50" />
              <div className="text-xs sm:text-sm text-slate-200 leading-normal">
                {parseInlineFormatting(itemText)}
              </div>
            </div>
          );
        }

        // 3. Línea Vacía (Espaciado)
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // 4. Parrafo Normal
        return (
          <p key={idx} className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            {parseInlineFormatting(line)}
          </p>
        );
      })}
    </div>
  );
}

// Función auxiliar para formatear **negrita**, `código` y eliminar asteriscos sueltos
function parseInlineFormatting(text: string): React.ReactNode {
  // Reemplazar marcadores sueltos [Fecha actual] o [Hora actual] si se colaron
  let cleaned = text
    .replace(/\[Fecha actual\]/gi, new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }))
    .replace(/\[Hora actual\]/gi, new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }));

  // Partir por **negrita**
  const parts = cleaned.split(/(\*\*.*?\*\*|`.*?`)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-cyan-300">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono text-[11px] border border-slate-700">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
