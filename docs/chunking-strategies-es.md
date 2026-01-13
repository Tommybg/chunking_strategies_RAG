# 📚 Estrategias de Fragmentación (Chunking) RAG: Un Análisis Profundo

Esta guía explica el funcionamiento interno de las estrategias de fragmentación implementadas en este proyecto. Úsela para comprender las compensaciones (trade-offs) y explicar los conceptos a otros.

---

## 1. Fragmentación de Tamaño Fijo (Fixed-Size Chunking)
**"El Enfoque del Cortador de Galletas"**

### 🔍 Cómo Funciona
Este es el método más simple. Trata el texto como una cadena larga y lo corta en piezas de igual tamaño, independientemente del contenido.
*   **Algoritmo**: 
    1.  Cuenta caracteres (o tokens).
    2.  Corta el texto en el límite de `chunkSize` (por ejemplo, 500 caracteres).
    3.  Retrocede la cantidad de `overlap` (superposición, por ejemplo, 50 caracteres) para asegurar que no se pierda el contexto en el corte.
    4.  Repite hasta el final.
*   **Código**: `src/chunkers/fixed-size.ts`

### ⚙️ Controles (Knobs)
*   **Chunk Size (Tamaño del Fragmento)**: Qué tan grande es cada pieza. Más grande = más contexto, pero menos precisión.
*   **Overlap (Superposición)**: Cuánto "sangra" el fragmento anterior en el siguiente. Evita cortar oraciones por la mitad sin contexto.

### ✅ Pros y ❌ Contras
*   **Pros**: Rápido, predecible, fácil de implementar.
*   **Contras**: Rompe oraciones a mitad de idea. Ignora los límites semánticos. El contexto puede dividirse de forma extraña.

---

## 2. Fragmentación Recursiva (Recursive Chunking)
**"El Cortador Inteligente"**

### 🔍 Cómo Funciona
Este método respeta la estructura natural del lenguaje. Intenta dividir el texto en el límite lógico más grande primero, y solo profundiza si el fragmento sigue siendo demasiado grande.
*   **Algoritmo**:
    1.  Comienza con una lista de separadores en orden de prioridad: `\n\n` (párrafos), `\n` (líneas), `.` (oraciones), ` ` (palabras).
    2.  Intenta dividir el texto por el primer separador (párrafos).
    3.  Si un párrafo es más pequeño que `chunkSize`, consérvalo.
    4.  Si un párrafo es *más grande* que `chunkSize`, cambia al siguiente separador (oraciones) y divide *solo ese párrafo*.
    5.  Fusiona fragmentos pequeños adyacentes hasta alcanzar el límite de tamaño.
*   **Código**: `src/chunkers/recursive.ts`

### ⚙️ Controles (Knobs)
*   **Chunk Size (Tamaño del Fragmento)**: El tamaño objetivo "suave" para un fragmento.
*   **Chunk Overlap (Superposición)**: Asegura la continuidad entre fragmentos fusionados.

### ✅ Pros y ❌ Contras
*   **Pros**: Mantiene intactos párrafos y oraciones. Mucho mejor coherencia que el tamaño fijo.
*   **Contras**: Ligeramente más costoso computacionalmente. Aún puede resultar en fragmentos muy pequeños o muy grandes si la puntuación es extraña.

---

## 3. Fragmentación por Estructura del Documento (Document Structure Chunking)
**"El Arquitecto"**

### 🔍 Cómo Funciona
Esta estrategia aprovecha el formato inherente de los documentos (Markdown, DOCX, etc.) para agrupar contenido por secciones.
*   **Algoritmo**:
    1.  Analiza la jerarquía del documento (Encabezados `H1`, `H2`, `H3`).
    2.  Agrupa todo el contenido bajo un encabezado en un bloque lógico.
    3.  Si una sección es más grande que `maxChunkSize`, recurre a la Fragmentación Recursiva para esa sección específica.
    4.  Puede verificar que los encabezados "Padre" se incluyan en los metadatos de los fragmentos "Hijo" (preservando la "ruta" de la información).
*   **Código**: `src/chunkers/document-structure.ts`

### ⚙️ Controles (Knobs)
*   **Max Chunk Size (Tamaño Máximo)**: Cuándo forzar una división dentro de una sección.
*   **Preserve Headings (Preservar Encabezados)**: Si se debe anteponer el texto del encabezado al contenido del fragmento (esencial para el contexto RAG).

### ✅ Pros y ❌ Contras
*   **Pros**: Excelente para documentos estructurados (manuales, documentos legales). Preserva el "contexto global" (saber que la "Sección 5" pertenece al "Capítulo 1").
*   **Contras**: Falla en archivos de texto plano sin encabezados. Requiere un buen formato del documento fuente.

---

## 4. Fragmentación Semántica (Semantic Chunking)
**"El Creador de Significado"**

### 🔍 Cómo Funciona
En lugar de dividir por conteo de caracteres o puntuación, divide por *significado*. Utiliza un modelo de embeddings para juzgar el tema de cada oración.
*   **Algoritmo**:
    1.  Divide el texto en oraciones.
    2.  Genera un vector embedding para cada oración individual.
    3.  Compara la similitud coseno de la oración $N$ con la oración $N+1$.
    4.  Si la similitud es **alta** (por encima de `similarityThreshold`), pertenecen al mismo tema -> Fusiónalas.
    5.  Si la similitud **cae** (por debajo del umbral), el tema ha cambiado -> Comienza un nuevo fragmento.
*   **Código**: `src/chunkers/semantic.ts`

### ⚙️ Controles (Knobs)
*   **Similarity Threshold (Umbral de Similitud)**: (0.0 - 1.0). Más alto significa "más estricto" (las oraciones deben ser muy similares para fusionarse). Más bajo significa "más relajado" (agrupa todo junto).
*   **Min Chunk Size (Tamaño Mínimo)**: Evita crear fragmentos diminutos de 5 palabras solo porque una oración fue única.

### ✅ Pros y ❌ Contras
*   **Pros**: Crea los fragmentos más coherentes. Asegura que un fragmento contenga exactamente una idea/tema. Lo mejor para la calidad de recuperación.
*   **Contras**: **Lento** y **Costoso** (requiere muchas llamadas de embedding). La latencia es alta.

---

## 5. Fragmentación Basada en LLM (LLM-Based Chunking)
**"El Agente Inteligente"**

### 🔍 Cómo Funciona
Utiliza un modelo de IA inteligente (como GPT-5) para leer el texto y decidir exactamente dónde deben ocurrir los cortes basándose en el flujo y la lógica.
*   **Algoritmo**:
    1.  Alimenta el texto a un LLM con un prompt: "Identifica fragmentos independientes y autónomos en este texto".
    2.  El LLM devuelve los segmentos de texto exactos que cree que deberían ser fragmentos.
    3.  Dado que los LLM pueden alucinar ligeramente, el código realiza una verificación de "Alineación de Texto" para mapear la salida del LLM de vuelta a los índices del texto fuente original exactamente.
*   **Código**: `src/chunkers/llm-based.ts`

### ⚙️ Controles (Knobs)
*   **Target Chunks (Fragmentos Objetivo)**: Una sugerencia al LLM sobre qué tan granular ser.
*   **Model (Modelo)**: Nano (más rápido) vs Mini (más inteligente).

### ✅ Pros y ❌ Contras
*   **Pros**: Límites de la más alta calidad. Puede entender matices complejos (sarcasmo, formato extraño) que los algoritmos pierden.
*   **Contras**: **El más Costoso** y **El más Lento**. Depende de la disponibilidad de la API externa.

---

## Resumen Comparativo

| Estrategia | Velocidad | Costo | Coherencia | Mejor Caso de Uso |
| :--- | :--- | :--- | :--- | :--- |
| **Tamaño Fijo** | ⚡️ Instantáneo | 🆓 Gratis | ⭐️ Baja | Caché simple, conjuntos de datos muy grandes donde la precisión importa menos. |
| **Recursiva** | 🚀 Rápido | 🆓 Gratis | ⭐️⭐️ Media | Texto de propósito general, blogs, artículos. **(Opción Predeterminada)** |
| **Estructura Doc** | 🚀 Rápido | 🆓 Gratis | ⭐️⭐️⭐️ Alta | Manuales técnicos, contratos legales, documentación de API. |
| **Semántica** | 🐢 Lento | 💸 Medio | ⭐️⭐️⭐️⭐️ Muy Alta | RAG de alta calidad donde la "deriva del tema" perjudica el rendimiento. |
| **Basada en LLM** | 🐢 Lento | 💰 Alto | ⭐️⭐️⭐️⭐️⭐️ Perfecta | Texto no estructurado complejo y desordenado donde las reglas fallan. |
