import React from 'react';

export default function SeoSchema() {
  return (
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
  );
}
