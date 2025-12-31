
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  ArrowLeftRight, 
  BarChart3, 
  Plus, 
  Trash2, 
  Search, 
  Calendar,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  BrainCircuit
} from 'lucide-react';
import { Product, Movement, ActiveSheet, StockSummary } from './types';
import { GoogleGenAI } from '@google/genai';

const App: React.FC = () => {
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>('MOVIMIENTOS');
  
  // State: Products (Hoja 1)
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('products_v2');
    return saved ? JSON.parse(saved) : [
      { id: '1', sku: 'LAP-001', name: 'Laptop Pro 14"' },
      { id: '2', sku: 'MOU-002', name: 'Mouse Inalámbrico' }
    ];
  });

  // State: Movements (Hoja 2)
  const [movements, setMovements] = useState<Movement[]>(() => {
    const saved = localStorage.getItem('movements_v2');
    return saved ? JSON.parse(saved) : [
      { id: '101', date: new Date().toISOString().split('T')[0], productId: '1', in: 10, out: 0, notes: 'Stock inicial' },
      { id: '102', date: new Date().toISOString().split('T')[0], productId: '2', in: 50, out: 0, notes: 'Pedido proveedor' }
    ];
  });

  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem('products_v2', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('movements_v2', JSON.stringify(movements));
  }, [movements]);

  // Derived State: Stock Calculation (Hoja 3)
  const stockSummaries = useMemo<StockSummary[]>(() => {
    return products.map(p => {
      const pMovements = movements.filter(m => m.productId === p.id);
      const totalIn = pMovements.reduce((sum, m) => sum + m.in, 0);
      const totalOut = pMovements.reduce((sum, m) => sum + m.out, 0);
      return {
        sku: p.sku,
        name: p.name,
        totalIn,
        totalOut,
        currentStock: totalIn - totalOut
      };
    });
  }, [products, movements]);

  // --- Actions ---
  const addProduct = () => {
    const newP: Product = {
      id: Date.now().toString(),
      sku: `SKU-${Math.floor(Math.random() * 1000)}`,
      name: 'Nuevo Producto'
    };
    setProducts([...products, newP]);
  };

  const addMovement = () => {
    if (products.length === 0) {
      alert("Primero debes crear al menos un producto en la pestaña de Productos.");
      return;
    }
    const newM: Movement = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      productId: products[0].id,
      in: 0,
      out: 0,
      notes: ''
    };
    setMovements([newM, ...movements]);
  };

  const updateProduct = (id: string, field: keyof Product, value: string) => {
    setProducts(products.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const updateMovement = (id: string, field: keyof Movement, value: any) => {
    setMovements(movements.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const deleteProduct = (id: string) => {
    if (confirm("¿Eliminar producto? Se borrarán sus movimientos asociados.")) {
      setProducts(products.filter(p => p.id !== id));
      setMovements(movements.filter(m => m.productId !== id));
    }
  };

  const deleteMovement = (id: string) => {
    setMovements(movements.filter(m => m.id !== id));
  };

  const runAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const prompt = `Actúa como un experto en logística. Analiza estos datos de inventario real:
      Productos: ${JSON.stringify(stockSummaries)}.
      Movimientos recientes: ${JSON.stringify(movements.slice(0, 10))}.
      Dime en español:
      1. ¿Qué productos están en riesgo de agotarse?
      2. ¿Cuál tiene más rotación?
      3. Una recomendación estratégica.
      Usa un tono profesional y directo.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setAiAnalysis(response.text || 'Error al generar análisis.');
    } catch (e) {
      setAiAnalysis("No se pudo conectar con la IA.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Navbar Superior */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-100">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">BITÁCORA DE STOCK</h1>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Sistema de Gestión de Inventario</p>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl">
            <TabButton 
              active={activeSheet === 'PRODUCTOS'} 
              onClick={() => setActiveSheet('PRODUCTOS')}
              icon={<Package className="w-4 h-4" />}
              label="Productos"
            />
            <TabButton 
              active={activeSheet === 'MOVIMIENTOS'} 
              onClick={() => setActiveSheet('MOVIMIENTOS')}
              icon={<ArrowLeftRight className="w-4 h-4" />}
              label="Movimientos"
            />
            <TabButton 
              active={activeSheet === 'STOCK'} 
              onClick={() => setActiveSheet('STOCK')}
              icon={<BarChart3 className="w-4 h-4" />}
              label="Stock Actual"
            />
          </div>
        </div>
      </nav>

      {/* Contenido Principal */}
      <main className="flex-grow p-6">
        <div className="max-w-7xl mx-auto">
          
          {/* HOJA 1: PRODUCTOS */}
          {activeSheet === 'PRODUCTOS' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Catálogo de Productos</h2>
                  <p className="text-sm text-slate-500">Define tus SKUs aquí para usarlos en el registro.</p>
                </div>
                <button 
                  onClick={addProduct}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all hover:shadow-lg active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Nuevo Producto
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                      <th className="px-6 py-4">SKU / Referencia</th>
                      <th className="px-6 py-4">Descripción del Producto</th>
                      <th className="px-6 py-4 w-24 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="px-6 py-3">
                          <input 
                            value={p.sku} 
                            onChange={(e) => updateProduct(p.id, 'sku', e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 text-slate-700 font-mono font-bold"
                            placeholder="CÓDIGO-01"
                          />
                        </td>
                        <td className="px-6 py-3">
                          <input 
                            value={p.name} 
                            onChange={(e) => updateProduct(p.id, 'name', e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 text-slate-600"
                            placeholder="Nombre descriptivo"
                          />
                        </td>
                        <td className="px-6 py-3 text-center">
                          <button onClick={() => deleteProduct(p.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* HOJA 2: MOVIMIENTOS */}
          {activeSheet === 'MOVIMIENTOS' && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                 <div>
                    <h2 className="text-2xl font-black text-slate-900">Registro de Actividad</h2>
                    <p className="text-slate-500 font-medium">Historial cronológico de entradas y salidas.</p>
                 </div>
                 <button 
                  onClick={addMovement}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-indigo-100 transition-all hover:-translate-y-1 active:scale-95"
                >
                  <Plus className="w-5 h-5" /> Registrar Movimiento
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                        <th className="px-6 py-4 w-40">Fecha</th>
                        <th className="px-6 py-4 min-w-[200px]">Producto</th>
                        <th className="px-6 py-4 w-32 text-center text-green-600">Entrada (+)</th>
                        <th className="px-6 py-4 w-32 text-center text-rose-600">Salida (-)</th>
                        <th className="px-6 py-4 min-w-[200px]">Notas / Comentarios</th>
                        <th className="px-6 py-4 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {movements.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center text-slate-400">
                              <ArrowLeftRight className="w-12 h-12 mb-3 opacity-20" />
                              <p className="text-lg">No hay movimientos registrados hoy.</p>
                              <p className="text-sm">Empieza añadiendo uno nuevo.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                      {movements.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2 text-slate-600">
                              <Calendar className="w-3.5 h-3.5" />
                              <input 
                                type="date"
                                value={m.date}
                                onChange={(e) => updateMovement(m.id, 'date', e.target.value)}
                                className="bg-transparent border-none focus:ring-0 p-0 text-sm"
                              />
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <select 
                              value={m.productId}
                              onChange={(e) => updateMovement(m.id, 'productId', e.target.value)}
                              className="w-full bg-white border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium text-slate-700"
                            >
                              {products.map(p => (
                                <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-3">
                            <input 
                              type="number"
                              value={m.in}
                              onChange={(e) => updateMovement(m.id, 'in', parseFloat(e.target.value) || 0)}
                              className="w-full text-center bg-green-50/50 border border-green-200 rounded-lg py-1.5 text-sm font-bold text-green-700 focus:ring-1 focus:ring-green-500 focus:outline-none"
                              min="0"
                            />
                          </td>
                          <td className="px-6 py-3">
                            <input 
                              type="number"
                              value={m.out}
                              onChange={(e) => updateMovement(m.id, 'out', parseFloat(e.target.value) || 0)}
                              className="w-full text-center bg-rose-50/50 border border-rose-200 rounded-lg py-1.5 text-sm font-bold text-rose-700 focus:ring-1 focus:ring-rose-500 focus:outline-none"
                              min="0"
                            />
                          </td>
                          <td className="px-6 py-3">
                            <input 
                              value={m.notes}
                              onChange={(e) => updateMovement(m.id, 'notes', e.target.value)}
                              placeholder="Ej. Devolución, Venta #102..."
                              className="w-full bg-transparent border-none focus:ring-0 text-sm text-slate-500 italic"
                            />
                          </td>
                          <td className="px-6 py-3 text-right">
                             <button onClick={() => deleteMovement(m.id)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* HOJA 3: STOCK */}
          {activeSheet === 'STOCK' && (
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Estado del Inventario</h2>
                  <p className="text-slate-500 font-medium">Resumen consolidado calculado automáticamente.</p>
                </div>
                <button 
                  onClick={runAiAnalysis}
                  disabled={isAnalyzing}
                  className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  <BrainCircuit className={`w-4 h-4 ${isAnalyzing ? 'animate-pulse' : ''}`} />
                  {isAnalyzing ? 'Analizando Stock...' : 'Análisis Inteligente'}
                </button>
              </div>

              {/* Panel de IA */}
              {aiAnalysis && (
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-6 rounded-3xl shadow-xl shadow-indigo-100 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                        <BrainCircuit className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold">Insights Estratégicos</h3>
                    </div>
                    <div className="prose prose-invert max-w-none text-indigo-50 font-medium whitespace-pre-line leading-relaxed">
                      {aiAnalysis}
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stockSummaries.map((item, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md mb-2 inline-block">
                          {item.sku}
                        </span>
                        <h4 className="text-lg font-bold text-slate-800 line-clamp-1">{item.name}</h4>
                      </div>
                      <div className={`p-2 rounded-2xl ${item.currentStock <= 5 ? 'bg-rose-100 text-rose-600' : 'bg-green-100 text-green-600'}`}>
                        {item.currentStock <= 5 ? <AlertCircle className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl mb-4">
                      <div className="text-center flex-1 border-r border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Entradas</p>
                        <p className="text-xl font-black text-slate-700">{item.totalIn}</p>
                      </div>
                      <div className="text-center flex-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Salidas</p>
                        <p className="text-xl font-black text-slate-700">{item.totalOut}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-500">Stock Disponible</p>
                      <p className={`text-3xl font-black ${item.currentStock <= 0 ? 'text-rose-600' : item.currentStock <= 5 ? 'text-orange-500' : 'text-indigo-600'}`}>
                        {item.currentStock}
                      </p>
                    </div>

                    {/* Barra de progreso visual (ejemplo de capacidad) */}
                    <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${item.currentStock <= 5 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                        style={{ width: `${Math.min(100, (item.currentStock / 50) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 p-8 text-center">
        <p className="text-sm text-slate-400 font-medium tracking-tight">
          Hecho para tu negocio &bull; {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })}
        </p>
      </footer>
    </div>
  );
};

// --- Subcomponents ---

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`
      flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
      ${active 
        ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' 
        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
      }
    `}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default App;
