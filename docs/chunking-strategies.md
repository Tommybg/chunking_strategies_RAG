# 📚 RAG Chunking Strategies: A Deep Dive

This guide explains the inner workings of the chunking strategies implemented in this project. Use this to understand the trade-offs and explain the concepts to others.

---

## 1. Fixed-Size Chunking
**"The Cookie Cutter Approach"**

### 🔍 How it Works
This is the simplest method. It treats text as a long string and cuts it into equal-sized pieces, regardless of the content.
*   **Algorithm**: 
    1.  Count characters (or tokens).
    2.  Slice text at the `chunkSize` limit (e.g., 500 chars).
    3.  Backtrack by the `overlap` amount (e.g., 50 chars) to ensure context isn't lost at the cut.
    4.  Repeat until the end.
*   **Code**: `src/chunkers/fixed-size.ts`

### ⚙️ Knobs
*   **Chunk Size**: How big each piece is. Larger = more context, but less precision.
*   **Overlap**: How much the previous chunk bleeds into the next. Prevents cutting sentences in half without context.

### ✅ Pros & ❌ Cons
*   **Pros**: Fast, predictable, easy to implement.
*   **Cons**: Breaks sentences mid-thought. Ignores semantic boundaries. Context can be split awkwardly.

---

## 2. Recursive Chunking
**"The Smart Slicer"**

### 🔍 How it Works
This method respects the natural structure of language. It tries to split text at the largest logical boundary first, and only goes deeper if the chunk is still too big.
*   **Algorithm**:
    1.  Start with a list of separators in priority order: `\n\n` (paragraphs), `\n` (lines), `.` (sentences), ` ` (words).
    2.  Try to split the text by the first separator (paragraphs).
    3.  If a paragraph is smaller than `chunkSize`, keep it.
    4.  If a paragraph is *larger* than `chunkSize`, switch to the next separator (sentences) and split *just that paragraph*.
    5.  Merge adjacent small chunks until they hit the size limit.
*   **Code**: `src/chunkers/recursive.ts`

### ⚙️ Knobs
*   **Chunk Size**: The soft target size for a chunk.
*   **Chunk Overlap**: Ensures continuity between merged chunks.

### ✅ Pros & ❌ Cons
*   **Pros**: Keeps paragraphs and sentences intact. much better coherence than fixed-size.
*   **Cons**: Slightly computationally more expensive. Can still result in very small or very large chunks if punctuation is weird.

---

## 3. Document Structure Chunking
**"The Architect"**

### 🔍 How it Works
This strategy leverages the inherent formatting of documents (Markdown, DOCX, etc.) to group content by sections.
*   **Algorithm**:
    1.  Parses the document hierarchy (Headers `H1`, `H2`, `H3`).
    2.  Groups all content under a header into one logical block.
    3.  If a section is larger than `maxChunkSize`, it falls back to Recursive Chunking for that specific section.
    4.  Can verify that "Parent" headers are included in the metadata of "Child" chunks (preserving the "path" of the information).
*   **Code**: `src/chunkers/document-structure.ts`

### ⚙️ Knobs
*   **Max Chunk Size**: When to force a split within a section.
*   **Preserve Headings**: Whether to prepend the header text to the chunk content (essential for RAG context).

### ✅ Pros & ❌ Cons
*   **Pros**: Excellent for structured docs (manuals, legal docs). Preserves "global context" (knowing that "Section 5" belongs to "Chapter 1").
*   **Cons**: Fails on flat text files without headers. Requires good source document formatting.

---

## 4. Semantic Chunking
**"The Meaning Maker"**

### 🔍 How it Works
Instead of splitting by character count or punctuation, this splits by *meaning*. It uses an embedding model to judge the topic of every sentence.
*   **Algorithm**:
    1.  Split text into sentences.
    2.  Generate a vector embedding for every single sentence.
    3.  Compare the cosine similarity of sentence $N$ with sentence $N+1$.
    4.  If the similarity is **high** (above `similarityThreshold`), they belong to the same topic -> Merge them.
    5.  If the similarity **drops** (below threshold), the topic has changed -> Start a new chunk.
*   **Code**: `src/chunkers/semantic.ts`

### ⚙️ Knobs
*   **Similarity Threshold**: (0.0 - 1.0). Higher means "stricter" (sentences must be very similar to merge). Lower means "looser" (chunk everything together).
*   **Min Chunk Size**: Prevents creating tiny 5-word chunks just because a sentence was unique.

### ✅ Pros & ❌ Cons
*   **Pros**: Creates the most coherent chunks. Ensures a chunk contains exactly one idea/topic. Best for retrieval quality.
*   **Cons**: **Slow** and **Expensive** (requires many embedding calls). Latency is high.

---

## 5. LLM-Based Chunking
**"The Intelligent Agent"**

### 🔍 How it Works
Uses a smart AI model (like GPT-5) to read the text and decide exactly where the breaks should happen based on flow and logic.
*   **Algorithm**:
    1.  Feed the text to an LLM with a prompt: "Identify independent, standalone chunks in this text".
    2.  The LLM returns the exact text segments it thinks should be chunks.
    3.  Since LLMs can hallucinate slightly, the code performs a "Text Alignment" check to map the LLM's output back to the original source text indices exactly.
*   **Code**: `src/chunkers/llm-based.ts`

### ⚙️ Knobs
*   **Target Chunks**: A suggestion to the LLM on how granular to be.
*   **Model**: Nano (faster) vs Mini (smarter).

### ✅ Pros & ❌ Cons
*   **Pros**: Highest quality boundaries. Can understand complex nuances (sarcasm, weird formatting) that algorithms miss.
*   **Cons**: **Most Expensive** and **Slowest**. Depends on external API availability.

---

## Summary Comparison

| Strategy | Speed | Cost | Coherence | Best Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **Fixed-Size** | ⚡️ Instant | 🆓 Free | ⭐️ Low | Simple caching, very large datasets where precision matters less. |
| **Recursive** | 🚀 Fast | 🆓 Free | ⭐️⭐️ Medium | General purpose text, blog posts, articles. **(Default Choice)** |
| **Doc Structure** | 🚀 Fast | 🆓 Free | ⭐️⭐️⭐️ High | Technical manuals, legal contracts, API docs. |
| **Semantic** | 🐢 Slow | 💸 Med | ⭐️⭐️⭐️⭐️ Very High | High-quality RAG where "topic drift" hurts performance. |
| **LLM-Based** | 🐢 Slow | 💰 High | ⭐️⭐️⭐️⭐️⭐️ Perfect | Complex, messy unstructured text where rules fail. |
