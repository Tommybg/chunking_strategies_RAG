# RAG Chunking Visualizer - Complete Developer Guide

This comprehensive guide explains the entire architecture, implementation details, and best practices for understanding and extending the RAG Chunking Visualizer.

---

## Table of Contents

1. [Application Architecture](#application-architecture)
2. [Technology Stack](#technology-stack)
3. [State Management](#state-management)
4. [Chunking Strategies Deep Dive](#chunking-strategies-deep-dive)
5. [Vector Database Integration](#vector-database-integration)
6. [Embedding Pipeline](#embedding-pipeline)
7. [API Layer](#api-layer)
8. [UI/UX Patterns](#uiux-patterns)
9. [Deployment Guide](#deployment-guide)
10. [How to Explain This to Developers](#how-to-explain-this-to-developers)

---

## Application Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 15 App Router                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Sidebar    │    │  Comparison  │    │  Comparison  │  │
│  │  (Controls)  │───▶│   Panel A    │    │   Panel B    │  │
│  │              │    │  (Strategy)  │    │  (Strategy)  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                             │                    │           │
│                             ▼                    ▼           │
│                      ┌─────────────────────────────┐        │
│                      │    Chunking Algorithms      │        │
│                      │  (5 Different Strategies)   │        │
│                      └─────────────────────────────┘        │
│                             │                                │
│                             ▼                                │
│                      ┌─────────────────────────────┐        │
│                      │    Embedding Services       │        │
│                      │  (Ollama / OpenAI)          │        │
│                      └─────────────────────────────┘        │
│                             │                                │
│                             ▼                                │
│                      ┌─────────────────────────────┐        │
│                      │    Vector Database          │        │
│                      │    (Qdrant)                 │        │
│                      └─────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── app/                      # Next.js App Router
│   ├── api/                 # API Routes (Server-side)
│   │   ├── parse-document/  # Document parsing endpoint
│   │   ├── load-documents/  # Load sample documents
│   │   └── status/          # Service health checks
│   │       ├── ollama/      # Ollama connection status
│   │       └── qdrant/      # Qdrant connection status
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Main page
│   └── globals.css          # Global styles
│
├── chunkers/                # Chunking Algorithm Implementations
│   ├── index.ts             # Central export
│   ├── fixed-size.ts        # Character-based chunking
│   ├── semantic.ts          # Embedding-based chunking
│   ├── recursive.ts         # Hierarchical splitting
│   ├── document-structure.ts# Section-based chunking
│   └── llm-based.ts         # AI-powered chunking
│
├── services/                # External Service Integration
│   ├── ollama.ts            # Local LLM client
│   ├── openai.ts            # OpenAI API client
│   ├── qdrant.ts            # Vector database client
│   ├── indexer.ts           # Document indexing pipeline
│   └── document-parser.ts   # File parsing (PDF, DOCX, TXT)
│
├── components/              # React Components
│   ├── layout/              # Page layout components
│   │   ├── Sidebar.tsx      # Settings sidebar
│   │   └── ComparisonPanel.tsx # Dual-pane comparison view
│   ├── visualization/       # Data visualization components
│   │   └── ChunkHighlighter.tsx # Chunk rendering
│   └── ui/                  # Reusable UI components
│       ├── strategy-config-panel.tsx
│       └── StrategyInfoModal.tsx
│
├── store/                   # State Management
│   └── app-store.ts         # Zustand store with persistence
│
├── types/                   # TypeScript Type Definitions
│   └── index.ts             # All shared types
│
└── config/                  # Configuration
    └── services.ts          # Centralized service URLs
```

---

## Technology Stack

### Core Framework
- **Next.js 15**: React framework with App Router
- **React 19**: UI library
- **TypeScript 5**: Type safety

### Styling & Animation
- **Tailwind CSS 4**: Utility-first CSS
- **Framer Motion 12**: Smooth animations
- **Phosphor Icons**: Icon library

### State Management
- **Zustand 5**: Lightweight state management with persistence

### External Services
- **Qdrant**: Vector database (Docker)
- **Ollama**: Local LLM runtime (Docker)
- **OpenAI API**: Cloud LLM/embeddings (optional)

### Document Processing
- **pdf-parse**: PDF text extraction
- **mammoth**: DOCX parsing

---

## State Management

### Zustand Store Architecture

The entire app state is managed in `src/store/app-store.ts` with the following structure:

```typescript
interface AppState {
    // Document being analyzed
    document: Document | null;

    // Left panel (Strategy A)
    leftStrategy: ChunkingStrategyType;
    leftResult: ChunkingResult | null;
    leftConfig: Record<string, unknown>;
    leftLoading: boolean;

    // Right panel (Strategy B)
    rightStrategy: ChunkingStrategyType;
    rightResult: ChunkingResult | null;
    rightConfig: Record<string, unknown>;
    rightLoading: boolean;

    // Embedding configuration (shared)
    embeddingConfig: EmbeddingConfig;

    // Service status monitoring
    ollamaStatus: OllamaStatus;
    qdrantStatus: QdrantStatus;

    // UI state
    sidebarOpen: boolean;
    selectedChunkId: string | null;
    hoveredChunkId: string | null;
}
```

### Persistence Strategy

Using Zustand's `persist` middleware, the following state is saved to `localStorage`:

- Embedding configuration (provider, model, API key)
- Strategy selections (left & right)
- Strategy configs (parameters)
- UI preferences (sidebar open/closed)

**Not persisted** (resets on refresh):
- Document content
- Chunking results
- Service status
- Loading states

---

## Chunking Strategies Deep Dive

### 1. Fixed-Size Chunking (`src/chunkers/fixed-size.ts`)

**TypeScript Signature:**
```typescript
export function fixedSizeChunking(
    text: string,
    config: { chunkSize: number; overlap: number }
): ChunkingResult
```

**Algorithm:**
```typescript
// Pseudocode
function fixedSizeChunking(text, { chunkSize, overlap }) {
    const chunks = [];
    let position = 0;
    let chunkId = 1;

    while (position < text.length) {
        // Extract chunk
        const end = Math.min(position + chunkSize, text.length);
        const chunkText = text.substring(position, end);

        chunks.push({
            id: `chunk-${chunkId}`,
            text: chunkText,
            startIndex: position,
            endIndex: end,
            metadata: { strategy: 'fixed-size', overlap }
        });

        // Move position forward (minus overlap)
        position += chunkSize - overlap;
        chunkId++;
    }

    return { strategy: 'fixed-size', chunks, statistics: {...} };
}
```

**When to Use:** Simple caching, very large datasets where precision doesn't matter.

---

### 2. Semantic Chunking (`src/chunkers/semantic.ts`)

**TypeScript Signature:**
```typescript
export async function semanticChunking(
    text: string,
    config: { similarityThreshold: number; minChunkSize: number },
    embeddingFn: (text: string) => Promise<number[]>
): Promise<ChunkingResult>
```

**Algorithm:**
```typescript
// Pseudocode
async function semanticChunking(text, config, embeddingFn) {
    // Step 1: Split into sentences
    const sentences = splitIntoSentences(text);

    // Step 2: Generate embeddings for each sentence
    const sentencesWithEmbeddings = await Promise.all(
        sentences.map(async (s) => ({
            ...s,
            embedding: await embeddingFn(s.text)
        }))
    );

    // Step 3: Group by similarity
    const chunks = [];
    let currentChunk = [sentencesWithEmbeddings[0]];

    for (let i = 1; i < sentencesWithEmbeddings.length; i++) {
        const prevEmbedding = sentencesWithEmbeddings[i - 1].embedding;
        const currEmbedding = sentencesWithEmbeddings[i].embedding;

        const similarity = cosineSimilarity(prevEmbedding, currEmbedding);

        if (similarity >= config.similarityThreshold) {
            // Topic continues - merge into current chunk
            currentChunk.push(sentencesWithEmbeddings[i]);
        } else {
            // Topic changed - start new chunk
            chunks.push(mergeIntoChunk(currentChunk));
            currentChunk = [sentencesWithEmbeddings[i]];
        }
    }

    // Don't forget the last chunk
    chunks.push(mergeIntoChunk(currentChunk));

    return { strategy: 'semantic', chunks, statistics: {...} };
}
```

**Embedding Integration:**

In `ComparisonPanel.tsx`, the embedding function is created dynamically:

```typescript
const embeddingFn = async (text: string): Promise<number[]> => {
    if (provider === 'ollama') {
        const { generateEmbedding } = await import('@/services/ollama');
        return generateEmbedding(text, model);
    } else {
        const { generateOpenAIEmbedding } = await import('@/services/openai');
        return generateOpenAIEmbedding(text, apiKey!, model);
    }
};
```

**When to Use:** High-quality RAG where topic drift hurts performance.

---

### 3. Recursive Chunking (`src/chunkers/recursive.ts`)

**TypeScript Signature:**
```typescript
export function recursiveChunking(
    text: string,
    config: { chunkSize: number; chunkOverlap: number }
): ChunkingResult
```

**Algorithm:**
```typescript
// Pseudocode
function recursiveChunking(text, config) {
    const separators = ['\n\n', '\n', '. ', ' ']; // Priority order

    function recursiveSplit(text, separators) {
        if (text.length <= config.chunkSize) {
            return [text]; // Base case: fits in one chunk
        }

        const separator = separators[0]; // Try highest priority
        const parts = text.split(separator);

        const chunks = [];
        for (const part of parts) {
            if (part.length <= config.chunkSize) {
                chunks.push(part);
            } else {
                // Recurse with next separator
                const subChunks = recursiveSplit(part, separators.slice(1));
                chunks.push(...subChunks);
            }
        }

        // Merge small adjacent chunks
        return mergeSmallChunks(chunks, config.chunkSize);
    }

    const rawChunks = recursiveSplit(text, separators);
    return formatAsChunkingResult(rawChunks);
}
```

**When to Use:** General purpose text - blog posts, articles (Default Choice).

---

### 4. Document Structure Chunking (`src/chunkers/document-structure.ts`)

**TypeScript Signature:**
```typescript
export function documentStructureChunking(
    text: string,
    structure: DocumentStructure | undefined,
    config: { maxChunkSize: number; preserveHeadings: boolean }
): ChunkingResult
```

**Algorithm:**
```typescript
// Pseudocode
function documentStructureChunking(text, structure, config) {
    if (!structure || !structure.sections.length) {
        // No structure detected - fall back to recursive
        return recursiveChunking(text, { chunkSize: config.maxChunkSize });
    }

    const chunks = [];

    for (const section of structure.sections) {
        let chunkText = section.content;

        if (config.preserveHeadings) {
            chunkText = `${section.title}\n\n${section.content}`;
        }

        if (chunkText.length <= config.maxChunkSize) {
            // Section fits - keep as one chunk
            chunks.push({
                text: chunkText,
                metadata: {
                    strategy: 'document-structure',
                    sectionTitle: section.title,
                    level: section.level
                }
            });
        } else {
            // Section too large - split recursively
            const subChunks = recursiveChunking(chunkText, {
                chunkSize: config.maxChunkSize
            });
            chunks.push(...subChunks.chunks);
        }
    }

    return { strategy: 'document-structure', chunks, statistics: {...} };
}
```

**When to Use:** Technical manuals, legal contracts, API documentation.

---

### 5. LLM-Based Chunking (`src/chunkers/llm-based.ts`)

**TypeScript Signature:**
```typescript
export async function llmBasedChunking(
    text: string,
    apiKey: string,
    config: { model: 'gpt-4o-mini' | 'gpt-4o'; targetChunks: number }
): Promise<ChunkingResult>
```

**Algorithm:**
```typescript
// Pseudocode
async function llmBasedChunking(text, apiKey, config) {
    const prompt = `
        You are a text segmentation expert.
        Divide the following text into ${config.targetChunks} semantically coherent chunks.

        Rules:
        1. Each chunk should contain a complete thought or topic
        2. Preserve natural flow and meaning
        3. Return only the text segments as JSON array

        Text: ${text}
    `;

    const response = await openai.chat.completions.create({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
    });

    const segments = JSON.parse(response.choices[0].message.content).chunks;

    // Align LLM output with original text indices
    const chunks = segments.map((segmentText, i) => {
        const startIndex = text.indexOf(segmentText);
        return {
            id: `chunk-${i + 1}`,
            text: segmentText,
            startIndex,
            endIndex: startIndex + segmentText.length,
            metadata: { strategy: 'llm-based', model: config.model }
        };
    });

    return { strategy: 'llm-based', chunks, statistics: {...} };
}
```

**When to Use:** Complex, messy unstructured text where rules fail.

---

## Vector Database Integration

### Qdrant Client Setup (`src/services/qdrant.ts`)

```typescript
import { QdrantClient } from '@qdrant/js-client-rest';
import { SERVICE_CONFIG } from '@/config/services';

const qdrantClient = new QdrantClient({
    url: SERVICE_CONFIG.QDRANT_URL // http://localhost:6333
});

export async function createCollection(
    name: string,
    vectorSize: number = 1024
) {
    await qdrantClient.recreateCollection(name, {
        vectors: {
            size: vectorSize,
            distance: 'Cosine' // For semantic similarity
        }
    });
}

export async function upsertChunks(
    collectionName: string,
    chunks: Chunk[]
) {
    const points = chunks.map((chunk, idx) => ({
        id: idx,
        vector: chunk.embedding!,
        payload: {
            text: chunk.text,
            strategy: chunk.metadata.strategy,
            startIndex: chunk.startIndex,
            endIndex: chunk.endIndex
        }
    }));

    await qdrantClient.upsert(collectionName, { points });
}
```

### Indexing Pipeline (`src/services/indexer.ts`)

```typescript
export class DocumentIndexer {
    async indexChunks(chunkingResult: ChunkingResult): Promise<IndexResult> {
        // Step 1: Create/recreate collection
        await createCollection(this.collectionName, this.vectorSize);

        // Step 2: Extract chunk texts
        const texts = chunkingResult.chunks.map(c => c.text);

        // Step 3: Generate embeddings
        const embeddings = await this.generateEmbeddings(texts);

        // Step 4: Add embeddings to chunks
        const chunksWithEmbeddings = chunkingResult.chunks.map((chunk, i) => ({
            ...chunk,
            embedding: embeddings[i]
        }));

        // Step 5: Upsert to Qdrant
        await upsertChunks(this.collectionName, chunksWithEmbeddings);

        return { success: true, chunksIndexed: chunksWithEmbeddings.length };
    }
}
```

---

## Embedding Pipeline

### Ollama Integration (`src/services/ollama.ts`)

```typescript
const OLLAMA_URL = SERVICE_CONFIG.OLLAMA_URL; // http://localhost:11434

export async function generateEmbedding(
    text: string,
    model: string = 'mxbai-embed-large:latest'
): Promise<number[]> {
    const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: text })
    });

    const data = await response.json();
    return data.embedding; // Returns 1024-dim vector
}

// Batch processing (sequential)
export async function generateEmbeddings(
    texts: string[],
    model: string
): Promise<number[][]> {
    const embeddings = [];
    for (const text of texts) {
        embeddings.push(await generateEmbedding(text, model));
    }
    return embeddings;
}
```

### OpenAI Integration (`src/services/openai.ts`)

```typescript
import OpenAI from 'openai';

export async function generateOpenAIEmbedding(
    text: string,
    apiKey: string,
    model: string = 'text-embedding-3-small'
): Promise<number[]> {
    const client = new OpenAI({ apiKey });

    const response = await client.embeddings.create({
        model,
        input: text
    });

    return response.data[0].embedding;
}

// Batch processing (native support)
export async function generateOpenAIEmbeddings(
    texts: string[],
    apiKey: string,
    model: string
): Promise<number[][]> {
    const client = new OpenAI({ apiKey });

    const response = await client.embeddings.create({
        model,
        input: texts // Can send array
    });

    return response.data.map(d => d.embedding);
}
```

---

## API Layer

### Document Parsing (`/api/parse-document`)

```typescript
export async function POST(request: NextRequest) {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    const buffer = Buffer.from(await file.arrayBuffer());
    let content = '';

    if (filename.endsWith('.pdf')) {
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(buffer);
        content = data.text;
    } else if (filename.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ buffer });
        content = result.value;
    } else {
        content = buffer.toString('utf-8');
    }

    return NextResponse.json({ content, filename, size: file.size });
}
```

### Service Status Checks

**Ollama Status** (`/api/status/ollama`):
```typescript
export async function GET() {
    try {
        const response = await fetch(`${OLLAMA_URL}/api/tags`, {
            signal: AbortSignal.timeout(5000) // 5-second timeout
        });

        const data = await response.json();
        return NextResponse.json({
            connected: true,
            models: data.models.map(m => ({
                name: m.name,
                size: formatBytes(m.size),
                modified: new Date(m.modified_at).toLocaleDateString()
            }))
        });
    } catch (error) {
        return NextResponse.json({
            connected: false,
            models: [],
            error: error.message
        });
    }
}
```

---

## UI/UX Patterns

### Glassmorphism Design System

Defined in `globals.css`:

```css
.glass {
  background: rgba(54, 57, 70, 0.95);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 2px 8px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
```

### Animation Patterns

**Sidebar animation** (smooth spring):
```typescript
<motion.aside
    initial={{ x: -320 }}
    animate={{ x: 0 }}
    exit={{ x: -320 }}
    transition={{
        type: "spring",
        damping: 30,
        stiffness: 250,
        mass: 0.8
    }}
>
```

**Panel entry** (staggered):
```typescript
<motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{
        duration: 0.4,
        delay: side === "left" ? 0 : 0.15, // Stagger right panel
        ease: [0.25, 0.1, 0.25, 1] // Custom cubic bezier
    }}
>
```

---

## Deployment Guide

### Docker Services Setup

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  qdrant:
    image: qdrant/qdrant:latest
    ports: ["6333:6333", "6334:6334"]
    volumes: [qdrant_storage:/qdrant/storage]

  ollama:
    image: ollama/ollama:latest
    ports: ["11434:11434"]
    volumes: [ollama_models:/root/.ollama]
```

### One-Command Setup

```bash
./setup.sh  # Starts Docker, pulls models, configures everything
npm install
npm run dev
```

### Environment Variables

Create `.env.local`:
```env
QDRANT_URL=http://localhost:6333
OLLAMA_URL=http://localhost:11434
OPENAI_API_KEY=sk-...  # Optional
```

---

## How to Explain This to Developers

### **Elevator Pitch (30 seconds)**

> "This is an interactive tool that lets you compare 5 different text chunking strategies for RAG systems side-by-side. Upload a document, select two strategies, and see exactly how they split your text differently. It uses local Ollama for embeddings or cloud OpenAI, stores chunks in Qdrant vector DB, and shows you real-time statistics."

### **Technical Overview (2 minutes)**

> "We built this with Next.js 15 and TypeScript. The core is 5 chunking algorithms:
>
> 1. **Fixed-size** - dumb character slicing with overlap
> 2. **Recursive** - smart splitting respecting paragraphs/sentences
> 3. **Document structure** - uses headings from DOCX/Markdown
> 4. **Semantic** - embeds every sentence, groups by cosine similarity
> 5. **LLM-based** - feeds text to GPT-4o to identify natural boundaries
>
> The UI is a dual-pane comparison view with Zustand state management. Users can upload PDF/DOCX/TXT, configure each strategy's parameters, and see chunks highlighted in the original text.
>
> For embeddings, we support Ollama (runs locally via Docker) or OpenAI API. Chunks can be indexed into Qdrant vector database for similarity search. Everything runs on your machine except OpenAI calls."

### **Architecture Walkthrough (5 minutes)**

> **Flow:**
> 1. User uploads document → API route parses it (pdf-parse/mammoth)
> 2. Zustand store holds document + panel states
> 3. User selects strategy in panel → `useEffect` triggers chunking
> 4. Chunking algorithm runs (sync for simple, async for semantic/LLM)
> 5. Results stored in store, visualized with syntax highlighting
> 6. (Optional) User clicks "Index" → `DocumentIndexer` generates embeddings → stores in Qdrant
>
> **Key Patterns:**
> - Strategy pattern for chunkers (same interface, different implementations)
> - Dynamic imports for embedding functions (avoid bundling both Ollama + OpenAI)
> - Error boundaries with helpful user messages (e.g., "Start Ollama with: ollama serve")
> - Framer Motion for smooth animations (spring physics on sidebar)
> - Glassmorphism design with Tailwind CSS (backdrop blur + shadows)"

### **Code Walkthrough Example (Semantic Chunking)**

```typescript
// "Let me show you how semantic chunking works in code..."

// 1. User selects "Semantic" strategy
// 2. ComparisonPanel detects it in useEffect
case "semantic": {
    // 3. Check if embedding service is available
    const { provider, model, apiKey } = embeddingConfig;
    if (provider === 'ollama' && !ollamaStatus.connected) {
        throw new Error('Ollama not connected');
    }

    // 4. Create embedding function (dynamic based on provider)
    const embeddingFn = async (text: string) => {
        if (provider === 'ollama') {
            return generateEmbedding(text, model); // Ollama
        } else {
            return generateOpenAIEmbedding(text, apiKey!, model); // OpenAI
        }
    };

    // 5. Run semantic chunking algorithm
    const { semanticChunking } = await import('@/chunkers/semantic');
    const result = await semanticChunking(text, {
        similarityThreshold: 0.7,  // User-configurable
        minChunkSize: 100
    }, embeddingFn);

    // 6. Store result in Zustand → triggers UI re-render
    setResult(result);
}
```

### **Common Developer Questions**

**Q: Why Zustand instead of Redux?**
> "Zustand is 10x simpler, has built-in persistence, and perfect for this use case. We don't need time-travel debugging or middleware complexity."

**Q: Why both Ollama and OpenAI?**
> "Ollama is free and runs locally (great for dev/demos), but OpenAI has higher quality embeddings and is required for LLM-based chunking. Giving users choice."

**Q: Why Qdrant instead of Pinecone/Weaviate?**
> "Qdrant runs in Docker with zero config. No API keys, no cloud vendor lock-in. Perfect for local dev."

**Q: How do you handle large documents?**
> "Chunking is synchronous for simple strategies (fast), async for semantic/LLM. For huge docs (10k+ sentences), semantic chunking will be slow due to O(N) embedding calls. We show loading state and could add progress bar."

**Q: Can this be production-ready?**
> "It's a visualization tool, not a production RAG system. But the chunking algorithms are production-quality. You'd extract the `src/chunkers/` folder, add proper error handling, batching, and use in your pipeline."

---

## Best Practices for Extension

### Adding a New Chunking Strategy

1. Create `src/chunkers/your-strategy.ts`:
```typescript
export async function yourStrategyChunking(
    text: string,
    config: YourConfig
): Promise<ChunkingResult> {
    // Implementation
}
```

2. Add to `src/chunkers/index.ts`:
```typescript
export { yourStrategyChunking } from './your-strategy';
```

3. Update `src/types/index.ts`:
```typescript
export type ChunkingStrategyType =
    | 'fixed-size'
    | 'semantic'
    | 'your-strategy';  // Add here

export const CHUNKING_STRATEGIES: ChunkingStrategy[] = [
    // ... existing strategies
    {
        id: 'your-strategy',
        name: 'Your Strategy Name',
        description: 'What it does',
        color: '#HEX',
        icon: 'IconName',
        configOptions: [...]
    }
];
```

4. Add case in `ComparisonPanel.tsx`:
```typescript
case "your-strategy":
    chunkingResult = await yourStrategyChunking(doc.content, config);
    break;
```

5. Add strategy info to `StrategyInfoModal.tsx`

### Performance Optimization

**For large documents:**
- Use Web Workers for chunking (avoids UI blocking)
- Implement streaming/pagination for chunk display
- Batch embedding generation (OpenAI supports native batching)

**For semantic chunking:**
- Cache embeddings with hash of sentence text
- Use approximate nearest neighbor for similarity (FAISS)

---

## Conclusion

This visualizer demonstrates advanced RAG chunking techniques with a focus on:
- **Education**: Clear side-by-side comparison with real-time statistics
- **Flexibility**: Multiple strategies, configurable parameters, local + cloud options
- **Developer Experience**: Clean architecture, TypeScript safety, easy setup

Use this as a reference implementation for your own RAG pipelines, or extend it into a full document processing tool.

**Questions? Check:**
- `docs/chunking-strategies.md` - Strategy theory
- `CLAUDE.md` - Quick reference for working in this codebase
- `README.md` - User-facing setup guide
