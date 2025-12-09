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

export const batchProcessProducts = async (
    toAdd: Product[],
    toUpdate: Product[],
    onProgress?: (current: number, total: number) => void,
    onError?: (error: string) => void
) => {
    const allOps = [
        ...toAdd.map(p => ({ type: 'add', data: p })),
        ...toUpdate.map(p => ({ type: 'update', data: p }))
    ];

    // Use small concurrency to ensure stability and progress feedback
    const CONCURRENCY = 5;
    const TIMEOUT_MS = 5000; // 5 seconds timeout per doc
    let processedCount = 0;
    let errorCount = 0;

    console.log(`Iniciando processamento sequencial. Total: ${allOps.length}`);

    for (let i = 0; i < allOps.length; i += CONCURRENCY) {
        const chunk = allOps.slice(i, i + CONCURRENCY);
        console.log(`Processando chunk ${Math.floor(i / CONCURRENCY) + 1}...`);

        const promises = chunk.map(async (op) => {
            try {
                if (!op.data.id) {
                    throw new Error(`Produto sem ID: ${op.data.sku}`);
                }

                const ref = doc(db, "products", op.data.id);
                // Ensure data is clean (no undefined)
                const cleanData = sanitizeData(op.data);

                // Create a promise for the Firestore op
                const firestoreOp = op.type === 'add'
                    ? setDoc(ref, cleanData)
                    : setDoc(ref, cleanData, { merge: true });

                // Create a timeout promise
                const timeoutOp = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Timeout saving document")), TIMEOUT_MS)
                );

                // Race them
                await Promise.race([firestoreOp, timeoutOp]);

            } catch (err: any) {
                console.error(`Erro ao salvar item ${op.data.sku}:`, err);
                errorCount++;
                // Check if likely a permissions issue
                if (err.code === 'permission-denied') {
                    console.error("CRITICAL: Permission denied. Check Firestore Rules!");
                }
                if (onError) onError(`Erro no SKU ${op.data.sku}: ${err.message}`);
            }
        });

        // Ensure all promises in chunk resolve (caught inside map)
        await Promise.all(promises);

        processedCount += chunk.length;
        if (onProgress) {
            onProgress(Math.min(processedCount, allOps.length), allOps.length);
        }
    }

    if (errorCount > 0) {
        console.warn(`Processamento concluído com ${errorCount} erros.`);
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
