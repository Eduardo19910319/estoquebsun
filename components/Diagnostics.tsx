import React, { useState } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Activity, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const Diagnostics: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

    const runDiagnostics = async () => {
        setStatus('running');
        setLogs([]);
        addLog("Iniciando diagnóstico...");

        try {
            // 1. Check Network/Auth (Implicit)
            addLog("Verificando conexão com Firebase...");

            // 2. Write Test
            addLog("Tentando escrever documento de teste...");
            const testCollection = collection(db, "diagnostics");
            const docRef = await addDoc(testCollection, {
                timestamp: new Date(),
                test: "connectivity_check"
            });
            addLog(`Escrita OK! ID do documento: ${docRef.id}`);

            // 3. Read Test
            addLog("Tentando ler documentos...");
            const querySnapshot = await getDocs(testCollection);
            addLog(`Leitura OK! Documentos encontrados: ${querySnapshot.size}`);

            // 4. Delete Test
            addLog("Tentando apagar documento de teste...");
            await deleteDoc(doc(db, "diagnostics", docRef.id));
            addLog("Exclusão OK!");

            addLog("DIAGNÓSTICO CONCLUÍDO COM SUCESSO!");
            setStatus('success');
        } catch (error: any) {
            console.error(error);
            addLog(`ERRO FATAL: ${error.message}`);
            if (error.code === 'permission-denied') {
                addLog("Causa provável: Regras de segurança do Firebase bloqueando acesso.");
            } else if (error.code === 'unavailable') {
                addLog("Causa provável: Sem conexão com a internet ou Firebase fora do ar.");
            }
            setStatus('error');
        }
    };

    return (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    <Activity size={18} />
                    Diagnóstico de Conexão
                </h3>
                <button
                    onClick={runDiagnostics}
                    disabled={status === 'running'}
                    className="text-xs bg-slate-800 text-white px-3 py-1 rounded hover:bg-slate-700 disabled:opacity-50"
                >
                    {status === 'running' ? 'Rodando...' : 'Testar Conexão'}
                </button>
            </div>

            <div className="bg-black text-green-400 font-mono text-xs p-3 rounded h-40 overflow-y-auto">
                {logs.length === 0 ? (
                    <span className="text-slate-500 italic">Clique em "Testar Conexão" para iniciar...</span>
                ) : (
                    logs.map((log, i) => <div key={i}>{log}</div>)
                )}
            </div>

            {status === 'success' && (
                <div className="mt-2 text-xs text-green-600 flex items-center gap-1 font-medium">
                    <CheckCircle size={14} />
                    Conexão com Banco de Dados: OPERACIONAL
                </div>
            )}

            {status === 'error' && (
                <div className="mt-2 text-xs text-red-600 flex items-center gap-1 font-medium">
                    <XCircle size={14} />
                    Conexão com Banco de Dados: FALHA
                </div>
            )}
        </div>
    );
};

export default Diagnostics;
