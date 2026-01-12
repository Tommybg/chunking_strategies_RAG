// Estrategia de Fragmentación basada en la Estructura del Documento
import type { Chunk, ChunkingResult, ChunkingStatistics, DocumentStructure, DocumentSection } from '@/types';

interface DocumentStructureConfig {
    maxChunkSize: number;
    preserveHeadings: boolean;
    [key: string]: unknown;
}

export function documentStructureChunking(
    text: string,
    structure: DocumentStructure | undefined,
    config: DocumentStructureConfig = { maxChunkSize: 1000, preserveHeadings: true }
): ChunkingResult {
    const startTime = performance.now();

    // Si no se proporciona estructura, extraerla del texto
    const docStructure = structure || extractStructure(text);

    const { maxChunkSize, preserveHeadings } = config;
    const chunks: Chunk[] = [];
    let chunkIndex = 0;

    function processSection(section: DocumentSection): void {
        const sectionContent = preserveHeadings
            ? `${section.title}\n\n${section.content}`
            : section.content;

        if (sectionContent.length <= maxChunkSize) {
            // La sección cabe en un solo fragmento
            if (sectionContent.trim().length > 0) {
                chunks.push({
                    id: `structure-${chunkIndex}`,
                    text: sectionContent.trim(),
                    startIndex: section.startIndex,
                    endIndex: section.endIndex,
                    metadata: {
                        strategy: 'document-structure',
                        sectionTitle: section.title,
                        level: section.level,
                    },
                });
                chunkIndex++;
            }
        } else {
            // Sección demasiado grande, dividir por párrafos y luego por oraciones
            const paragraphs = sectionContent.split(/\n\n+/);
            let currentChunk = '';
            let currentStart = section.startIndex;

            for (const paragraph of paragraphs) {
                if (currentChunk.length + paragraph.length + 2 <= maxChunkSize) {
                    currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
                } else {
                    // Guardar fragmento actual
                    if (currentChunk.trim().length > 0) {
                        chunks.push({
                            id: `structure-${chunkIndex}`,
                            text: currentChunk.trim(),
                            startIndex: currentStart,
                            endIndex: currentStart + currentChunk.length,
                            metadata: {
                                strategy: 'document-structure',
                                sectionTitle: section.title,
                                level: section.level,
                            },
                        });
                        chunkIndex++;
                    }

                    // Iniciar nuevo fragmento
                    if (paragraph.length <= maxChunkSize) {
                        currentChunk = paragraph;
                        currentStart = currentStart + currentChunk.length + 2;
                    } else {
                        // Párrafo demasiado grande, dividir por oraciones
                        const sentences = paragraph.split(/(?<=[.!?])\s+/);
                        currentChunk = '';

                        for (const sentence of sentences) {
                            if (currentChunk.length + sentence.length + 1 <= maxChunkSize) {
                                currentChunk += (currentChunk ? ' ' : '') + sentence;
                            } else {
                                if (currentChunk.trim().length > 0) {
                                    chunks.push({
                                        id: `structure-${chunkIndex}`,
                                        text: currentChunk.trim(),
                                        startIndex: currentStart,
                                        endIndex: currentStart + currentChunk.length,
                                        metadata: {
                                            strategy: 'document-structure',
                                            sectionTitle: section.title,
                                            level: section.level,
                                        },
                                    });
                                    chunkIndex++;
                                }
                                currentChunk = sentence;
                                currentStart = currentStart + currentChunk.length + 1;
                            }
                        }
                    }
                }
            }

            // Guardar el fragmento restante
            if (currentChunk.trim().length > 0) {
                chunks.push({
                    id: `structure-${chunkIndex}`,
                    text: currentChunk.trim(),
                    startIndex: currentStart,
                    endIndex: section.endIndex,
                    metadata: {
                        strategy: 'document-structure',
                        sectionTitle: section.title,
                        level: section.level,
                    },
                });
                chunkIndex++;
            }
        }

        // Procesar hijos recursivamente
        if (section.children) {
            for (const child of section.children) {
                processSection(child);
            }
        }
    }

    // Procesar todas las secciones
    for (const section of docStructure.sections) {
        processSection(section);
    }

    const processingTime = performance.now() - startTime;
    const statistics = calculateStatistics(chunks);

    return {
        strategy: 'document-structure',
        chunks,
        processingTime,
        config,
        statistics,
    };
}

// Extraer estructura de texto plano
function extractStructure(text: string): DocumentStructure {
    const sections: DocumentSection[] = [];
    const lines = text.split('\n');

    let currentSection: DocumentSection | null = null;
    let currentContent: string[] = [];
    let charIndex = 0;
    let sectionStart = 0;

    const headingPatterns = [
        { pattern: /^#{1,6}\s+(.+)$/, getLevel: (line: string) => (line.match(/^#+/)?.[0].length || 1) },
        { pattern: /^([A-Z][A-Z\s]{3,})$/, getLevel: () => 1 },
        { pattern: /^(\d+\.?\s+.{3,})$/, getLevel: () => 2 },
        { pattern: /^(Chapter\s+\d+.*)$/i, getLevel: () => 1 },
        { pattern: /^(Section\s+\d+.*)$/i, getLevel: () => 2 },
    ];

    for (const line of lines) {
        let isHeading = false;
        let headingText = '';
        let headingLevel = 1;

        for (const { pattern, getLevel } of headingPatterns) {
            const match = line.match(pattern);
            if (match) {
                isHeading = true;
                headingText = match[1] || line;
                headingLevel = getLevel(line);
                break;
            }
        }

        if (isHeading) {
            // Guardar sección anterior
            if (currentSection || currentContent.length > 0) {
                const content = currentContent.join('\n').trim();
                if (currentSection) {
                    currentSection.content = content;
                    currentSection.endIndex = charIndex;
                    sections.push(currentSection);
                } else if (content) {
                    sections.push({
                        title: 'Introduction',
                        content,
                        level: 1,
                        startIndex: sectionStart,
                        endIndex: charIndex,
                    });
                }
            }

            // Iniciar nueva sección
            sectionStart = charIndex;
            currentSection = {
                title: headingText.trim(),
                content: '',
                level: headingLevel,
                startIndex: charIndex,
                endIndex: charIndex,
            };
            currentContent = [];
        } else {
            currentContent.push(line);
        }

        charIndex += line.length + 1; // +1 for newline
    }

    // Guardar la última sección
    const finalContent = currentContent.join('\n').trim();
    if (currentSection) {
        currentSection.content = finalContent;
        currentSection.endIndex = text.length;
        sections.push(currentSection);
    } else if (finalContent) {
        sections.push({
            title: 'Document',
            content: finalContent,
            level: 1,
            startIndex: sectionStart,
            endIndex: text.length,
        });
    }

    return {
        title: sections[0]?.title || 'Untitled',
        sections,
    };
}

function calculateStatistics(chunks: Chunk[]): ChunkingStatistics {
    if (chunks.length === 0) {
        return {
            totalChunks: 0,
            averageChunkSize: 0,
            minChunkSize: 0,
            maxChunkSize: 0,
        };
    }

    const sizes = chunks.map((c) => c.text.length);
    const totalSize = sizes.reduce((a, b) => a + b, 0);

    return {
        totalChunks: chunks.length,
        averageChunkSize: Math.round(totalSize / chunks.length),
        minChunkSize: Math.min(...sizes),
        maxChunkSize: Math.max(...sizes),
    };
}
