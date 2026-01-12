// Qdrant Service Stub
// Este archivo es un espacio reservado para la integración con Qdrant.
// Por ahora, se utiliza para permitir que el proyecto compile sin errores de importación.

export const DEFAULT_COLLECTION = 'chunks';

export async function createCollection(name: string, vectorSize?: number): Promise<boolean> {
    console.log(`[Qdrant Stub] Creando colección: ${name} con dimension: ${vectorSize}`);
    return true;
}

export async function upsertChunks(collectionName: string, chunks: any[]): Promise<boolean> {
    console.log(`[Qdrant Stub] Insertando ${chunks.length} fragmentos en la colección: ${collectionName}`);
    return true;
}
