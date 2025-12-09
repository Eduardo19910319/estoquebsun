// Fixed version - timestamp: 2
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    setDoc,
    getDocs,
    query,
    orderBy,
    writeBatch
} from "firebase/firestore";
import { db } from "./firebase";
import { Product, Customer, Sale } from "../types";

// Collection References
const productsRef = collection(db, "products");
const customersRef = collection(db, "customers");
const salesRef = collection(db, "sales");

// --- Products ---
export const addProduct = async (product: Product) => {
    await setDoc(doc(db, "products", product.id), product);
};

export const updateProduct = async (product: Product) => {
    await setDoc(doc(db, "products", product.id), product, { merge: true });
};

export const deleteProduct = async (id: string) => {
    await deleteDoc(doc(db, "products", id));
};

export const bulkAddProducts = async (products: Product[]) => {
    const batchPromises = products.map(p => setDoc(doc(db, "products", p.id), p));
    await Promise.all(batchPromises);
};

const sanitizeData = (data: any) => {
    const sanitized: any = {};
    Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
            sanitized[key] = data[key];
        }
    });
    return sanitized;
};

// Adicione essa função auxiliar antes da batchProcessProducts, ou logo após os imports
const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout: ${label} demorou mais de ${ms}ms`)), ms)
        )
    ]);
};

// Substitua a função batchProcessProducts inteira por esta versão blindada:
export const batchProcessProducts = async (
    toAdd: Product[],
    toUpdate: Product[],
    onProgress?: (current: number, total: number) => void
) => {
    // Mesclamos tudo para processar
    const allOps = [
        ...toAdd.map(p => ({ type: 'add', data: p })),
        ...toUpdate.map(p => ({ type: 'update', data: p }))
    ];

    const CONCURRENCY = 5; // Mantemos baixo para não saturar
    let processedCount = 0;
    let errorCount = 0;

    console.log(`🚀 Shinso Log: Iniciando processamento de ${allOps.length} itens...`);

    for (let i = 0; i < allOps.length; i += CONCURRENCY) {
        const chunk = allOps.slice(i, i + CONCURRENCY);

        // Mapeamos o chunk para Promises que NUNCA rejeitam (elas retornam o erro para contarmos)
        const promises = chunk.map(async (op) => {
            const itemId = op.data.sku || op.data.id;
            try {
                const ref = doc(db, "products", op.data.id);
                const cleanData = sanitizeData(op.data);

                // Timeout de 5s para cada operação individual
                await withTimeout(
                    op.type === 'add'
                        ? setDoc(ref, cleanData)
                        : setDoc(ref, cleanData, { merge: true }),
                    5000,
                    `Item ${itemId}`
                );

                return { success: true };
            } catch (err: any) {
                console.error(`❌ Erro no item ${itemId}:`, err.message);
                errorCount++;
                return { success: false, error: err };
            }
        });

        // Agora o Promise.all espera todos, mesmo os que deram erro
        await Promise.all(promises);

        processedCount += chunk.length;
        if (onProgress) {
            onProgress(Math.min(processedCount, allOps.length), allOps.length);
        }
    }

    if (errorCount > 0) {
        console.warn(`⚠️ Processamento finalizado com ${errorCount} erros.`);
        alert(`Processo finalizado, mas ${errorCount} itens falharam. Verifique o console.`);
    } else {
        console.log("✨ Tudo limpo! Importação 100% sucesso.");
    }
};

// --- Customers ---
export const addCustomer = async (customer: Customer) => {
    await setDoc(doc(db, "customers", customer.id), customer);
};

export const updateCustomer = async (customer: Customer) => {
    await setDoc(doc(db, "customers", customer.id), customer, { merge: true });
};

export const deleteCustomer = async (id: string) => {
    await deleteDoc(doc(db, "customers", id));
};

// --- Sales ---
export const addSale = async (sale: Sale) => {
    await setDoc(doc(db, "sales", sale.id), sale);
};

export const updateSale = async (sale: Sale) => {
    await setDoc(doc(db, "sales", sale.id), sale, { merge: true });
};

export const deleteSale = async (id: string) => {
    await deleteDoc(doc(db, "sales", id));
};
