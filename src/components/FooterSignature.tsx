import React from 'react';

export default function FooterSignature() {
  return (
    <>
      <footer className="w-full border-t border-cyan-950/40 bg-[#050811]/90 backdrop-blur-md py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-semibold text-slate-400">
              JARVIS AI Engine v3.1 — JyM Tech Solutions
            </span>
          </div>
          <div>
            <p className="text-[11px]">
              &copy; {new Date().getFullYear()} JyM Tech Solutions. Todos los derechos reservados. | Desarrollado y Automatizado con IA por{" "}
              <a
                href="https://www.jymtechsolutions.online/es"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 font-medium underline underline-offset-2 transition-colors"
              >
                J&M Tech Solutions
              </a>
            </p>
          </div>
        </div>
      </footer>

      {/* Schema JSON-LD (SEO) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "JARVIS AI Platform",
            "url": "https://jarvis.hubcentral.tech",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "creator": {
              "@type": "Organization",
              "name": "J&M Tech Solutions",
              "url": "https://www.jymtechsolutions.online/es",
              "description": "Agencia de automatización con IA y desarrollo de software enterprise"
            }
          })
        }}
      />
    </>
  );
}
