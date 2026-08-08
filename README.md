# JARVIS AI Platform — Dashboard Dual

Plataforma de Inteligencia Artificial Corporativa para **JyM Tech Solutions** (`jarvis.hubcentral.tech`).

## 🤖 Arquitectura & Vistas

- 🧑 **Vista Cliente (`/chat`):** Interfaz inmersiva tipo ChatGPT, limpia y libre de distracciones para Walter.
- 🛠️ **Vista Operador (`/operator`):** Dashboard técnico split-view para Manuel con telemetría de VPS (31.97.145.8), conexión Supabase, gestión de Webhooks, Memoria RAG y selector híbrido de proveedores LLM.
- ⚡ **Multi-Provider Cascade:** Soporte dinámico para Groq (Llama 3.3 70B - 0% RAM VPS), OpenAI (GPT-4o), Google Gemini y Llama 3.1 Local (API Flask :5000).

## 🚀 Despliegue en Producción

```bash
docker compose up -d --build
```

- **Puerto Frontend:** `3080`
- **Backend API Local:** `http://31.97.145.8:5000`
