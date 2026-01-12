// Índice de Chunkers - Exporta todas las estrategias de fragmentación
export { fixedSizeChunking } from './fixed-size';
export { semanticChunking, semanticChunkingSync } from './semantic';
export { recursiveChunking } from './recursive';
export { documentStructureChunking } from './document-structure';
export { llmBasedChunking, fallbackChunking } from './llm-based';
