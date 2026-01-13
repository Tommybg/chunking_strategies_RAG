# 🚀 Guía de Despliegue: Next.js en Cloudflare Pages

## 📋 Requisitos
- Node.js 18+
- Cuenta de Cloudflare (gratuita)

---

## 1️⃣ Instalar Dependencias

```bash
bun add @cloudflare/next-on-pages --dev
```

## 2️⃣ Configurar `package.json`

```json
{
  "scripts": {
    "pages:build": "npx @cloudflare/next-on-pages"
  }
}
```

## 3️⃣ Edge Runtime en APIs

Añadir a cada archivo `src/app/api/*/route.ts`:

```typescript
export const runtime = 'edge';

// IMPORTANTE: Inicializar clientes DENTRO de la función, no afuera
export async function POST(request: NextRequest) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // ...
}
```

## 4️⃣ Crear `wrangler.toml`

```toml
name = "nombre-proyecto"
compatibility_date = "2024-04-03"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".vercel/output/static"
```

## 5️⃣ Build y Deploy

```bash
# Build
npm run pages:build

# Deploy (primera vez - creará el proyecto)
npx wrangler pages deploy .vercel/output/static --project-name=nombre-proyecto

# Configurar secrets
npx wrangler pages secret put OPENAI_API_KEY --project-name=nombre-proyecto
```

## 🔄 Actualizaciones Futuras

```bash
npm run pages:build
npx wrangler pages deploy .vercel/output/static --project-name=nombre-proyecto
```

---

## ⚠️ Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `No such module` | Se usó `wrangler deploy` en vez de `wrangler pages deploy` | Usar el comando correcto de Pages |
| `500 Internal Server Error` | OpenAI inicializado fuera de la función | Mover `new OpenAI()` dentro de la función |
| `API key no configurada` | Falta el secret | `npx wrangler pages secret put OPENAI_API_KEY --project-name=...` |

---

## 📝 Comandos Útiles

| Comando | Descripción |
|---------|-------------|
| `npm run pages:build` | Build para Cloudflare |
| `npx wrangler pages deploy .vercel/output/static --project-name=X` | Desplegar |
| `npx wrangler pages secret put KEY --project-name=X` | Añadir secret |
| `npx wrangler pages deployment tail --project-name=X` | Ver logs |
