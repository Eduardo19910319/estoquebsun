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
    // We use setDoc with product.id to keep the ID consistent if it's already generated
    // Or we can let Firestore generate it. The current app generates UUIDs.
    // Let's use the existing ID as the document ID for simplicity.
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

export const batchProcessProducts = async (
    toAdd: Product[],
    toUpdate: Product[],
    onProgress?: (current: number, total: number) => void
) => {
    // Firestore batch limit is 500 operations
    const allOps = [
        ...toAdd.map(p => ({ type: 'add', data: p })),
        ...toUpdate.map(p => ({ type: 'update', data: p }))
    ];

    const chunkSize = 50; // Reduced to 50 to prevent timeouts and show progress
    let processedCount = 0;

    for (let i = 0; i < allOps.length; i += chunkSize) {
        const chunk = allOps.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        chunk.forEach(op => {
            const ref = doc(db, "products", op.data.id);
            if (op.type === 'add') {
                batch.set(ref, op.data);
            } else {
                batch.set(ref, op.data, { merge: true });
            }
        });

        await batch.commit();
        processedCount += chunk.length;

        if (onProgress) {
            onProgress(processedCount, allOps.length);
        }
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
