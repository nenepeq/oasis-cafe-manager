import React, { useState } from 'react';
import { X, Save, Plus, Trash2, Edit2, ClipboardList, AlertCircle, RefreshCw } from 'lucide-react';
import { createProduct, updateProduct, deleteProduct } from '../api';

/**
 * Modal para la Gestión del Catálogo de Productos
 */
const CatalogModal = ({
    showCatalog,
    setShowCatalog,
    userRole,
    products,
    fetchProducts,
    fetchInventory,
    categories
}) => {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('form'); // 'form' como pestaña por defecto
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        category: categories[1] || '', // Evitamos 'Todos'
        sale_price: 0,
        cost_price: 0,
        is_visible: true
    });

    if (!showCatalog || userRole !== 'admin') return null;

    // Filtrar 'Todos' de las categorías para el formulario
    const formCategories = categories.filter(c => c !== 'Todos');

    const handleOpenCreate = () => {
        setEditingProduct(null);
        setFormData({
            name: '',
            category: formCategories[0] || '',
            sale_price: 0,
            cost_price: 0,
            is_visible: true
        });
        setActiveTab('form');
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            category: product.category,
            sale_price: product.sale_price,
            cost_price: product.cost_price || 0,
            is_visible: product.is_visible !== false // Manejo de NULLs
        });
        setActiveTab('form');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || formData.sale_price <= 0) {
            alert("Por favor completa el nombre y un precio de venta válido.");
            return;
        }

        setLoading(true);
        try {
            if (editingProduct) {
                const { error } = await updateProduct(editingProduct.id, formData);
                if (error) throw error;
                alert("✅ Producto actualizado con éxito");
            } else {
                const { error } = await createProduct(formData);
                if (error) throw error;
                alert("✅ Producto creado con éxito");
            }
            await fetchProducts();
            handleOpenCreate();
            setActiveTab('list');
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`¿Estás seguro de eliminar "${name}"? Esta acción puede fallar si el producto ya tiene ventas registradas.`)) return;

        setLoading(true);
        try {
            const { error } = await deleteProduct(id);
            if (error) throw error;
            alert("✅ Producto eliminado");
            await fetchProducts();
            if (fetchInventory) await fetchInventory();
        } catch (err) {
            alert("No se pudo eliminar: " + (err.message.includes("violates foreign key constraint") ? "El producto tiene registros asociados (ventas o inventario)." : err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            onClick={() => setShowCatalog(false)}
            style={{
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', zIndex: 1200, backdropFilter: 'blur(5px)'
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: 'relative', backgroundColor: '#fff', padding: '25px',
                    borderRadius: '25px', width: '95%', maxWidth: '800px',
                    maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                }}
            >
                <button
                    onClick={() => setShowCatalog(false)}
                    style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'none', cursor: 'pointer', color: '#666' }}
                >
                    <X size={24} />
                </button>

                <h2 style={{ color: '#4a3728', fontWeight: '900', marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '20px' }}>
                    <ClipboardList size={26} /> Gestión de Catálogo
                </h2>

                {/* SELECTOR DE PESTAÑAS */}
                <div style={{ display: 'flex', background: '#f8f4f0', padding: '5px', borderRadius: '15px', marginBottom: '20px' }}>
                    <button
                        onClick={handleOpenCreate}
                        style={{
                            flex: 1, padding: '12px', borderRadius: '12px', border: 'none', fontSize: '14px', fontWeight: 'bold',
                            backgroundColor: activeTab === 'form' ? '#fff' : 'transparent',
                            color: activeTab === 'form' ? '#27ae60' : '#8b5a2b',
                            boxShadow: activeTab === 'form' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer', transition: 'all 0.3s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                        }}
                    >
                        {editingProduct ? <Edit2 size={16} /> : <Plus size={16} />}
                        {editingProduct ? 'EDITANDO' : 'NUEVO'}
                    </button>
                    <button
                        onClick={() => {
                            handleOpenCreate(); // Limpiamos edición
                            setActiveTab('list'); // Pero nos quedamos en la lista
                        }}
                        style={{
                            flex: 1, padding: '12px', borderRadius: '12px', border: 'none', fontSize: '14px', fontWeight: 'bold',
                            backgroundColor: activeTab === 'list' ? '#fff' : 'transparent',
                            color: activeTab === 'list' ? '#4a3728' : '#8b5a2b',
                            boxShadow: activeTab === 'list' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer', transition: 'all 0.3s'
                        }}
                    >
                        LISTADO ({products.length})
                    </button>
                </div>

                <div>
                    {/* FORMULARIO */}
                    {activeTab === 'form' && (
                        <div style={{ background: '#fdfbf9', padding: '20px', borderRadius: '20px', border: '1px solid #f1ece6' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#4a3728', marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {editingProduct ? <><Edit2 size={18} /> Editar: {editingProduct.name}</> : <><Plus size={18} /> Nuevo Producto</>}
                            </h3>
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#8b5a2b', marginBottom: '5px' }}>NOMBRE DEL PRODUCTO</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ej. Café Americano 16oz"
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '14px' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#8b5a2b', marginBottom: '5px' }}>CATEGORÍA</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => {
                                            if (e.target.value === '__NEW__') {
                                                const newCat = prompt("Escribe el nombre de la nueva categoría:");
                                                if (newCat && newCat.trim()) {
                                                    setFormData({ ...formData, category: newCat.trim() });
                                                }
                                            } else {
                                                setFormData({ ...formData, category: e.target.value });
                                            }
                                        }}
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '14px', backgroundColor: '#fff' }}
                                    >
                                        {!formCategories.includes(formData.category) && formData.category && (
                                            <option value={formData.category}>{formData.category}</option>
                                        )}
                                        {formCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                        <option value="__NEW__" style={{ fontWeight: 'bold', color: '#27ae60' }}>+ Nueva Categoría...</option>
                                    </select>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#8b5a2b', marginBottom: '5px' }}>$ COSTO</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.cost_price || ''}
                                            onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '14px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#8b5a2b', marginBottom: '5px' }}>$ PRECIO</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.sale_price || ''}
                                            onChange={(e) => setFormData({ ...formData, sale_price: parseFloat(e.target.value) || 0 })}
                                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '14px', fontWeight: 'bold', color: '#27ae60' }}
                                            required
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8f9fa', padding: '12px', borderRadius: '12px', border: '1px solid #eee' }}>
                                    <input
                                        type="checkbox"
                                        id="is_visible"
                                        checked={formData.is_visible}
                                        onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
                                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="is_visible" style={{ fontSize: '14px', fontWeight: 'bold', color: '#4a3728', cursor: 'pointer' }}>
                                        PRODUCTO VISIBLE EN TIENDA
                                    </label>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        style={{
                                            flex: 2, padding: '15px', borderRadius: '12px', border: 'none',
                                            backgroundColor: '#27ae60', color: '#fff', fontWeight: 'bold',
                                            cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }}
                                    >
                                        {loading ? <RefreshCw size={18} className="spin" /> : <Save size={18} />}
                                        {editingProduct ? 'GUARDAR' : 'CREAR'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleOpenCreate();
                                            setActiveTab('list');
                                        }}
                                        style={{
                                            flex: 1, padding: '15px', borderRadius: '12px', border: '1px solid #ddd',
                                            backgroundColor: '#fff', color: '#666', fontWeight: 'bold', cursor: 'pointer'
                                        }}
                                    >
                                        VOLVER
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* LISTADO */}
                    {activeTab === 'list' && (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{
                                flex: 1,
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '10px'
                            }}>
                                {products.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '30px', color: '#999' }}>No hay productos registrados</div>
                                ) : products.map(p => (
                                    <div key={p.id} style={{
                                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                                        padding: '12px', borderRadius: '18px', border: '1px solid #eee', background: '#fff',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.02)', position: 'relative'
                                    }}>
                                        <div style={{ marginBottom: '10px' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#4a3728', lineHeight: '1.2', marginBottom: '4px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical' }}>
                                                {p.name}
                                            </div>
                                            <div style={{ fontSize: '10px', color: '#8b5a2b', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <div>{p.category}</div>
                                                <div style={{ color: '#27ae60', fontWeight: 'bold', fontSize: '12px' }}>${parseFloat(p.sale_price).toFixed(2)}</div>
                                                {p.is_visible === false && <span style={{ color: '#e74c3c', fontSize: '9px', fontWeight: 'bold' }}>• OCULTO</span>}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '5px', width: '100%', marginTop: 'auto' }}>
                                            <button
                                                onClick={() => handleEdit(p)}
                                                style={{ flex: 1, padding: '8px', borderRadius: '10px', border: 'none', background: '#f0fff4', cursor: 'pointer', color: '#27ae60', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(p.id, p.name)}
                                                style={{ flex: 1, padding: '8px', borderRadius: '10px', border: 'none', background: '#fff0f0', cursor: 'pointer', color: '#e74c3c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '25px', padding: '15px', borderRadius: '15px', background: '#fff3cd', color: '#856404', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <AlertCircle size={20} />
                    <p style={{ margin: 0, fontSize: '12px' }}>
                        <b>Nota:</b> Al crear un producto nuevo, se habilitará automáticamente en el inventario con <b>stock cero</b>. No olvides registrar su entrada de mercancía para poder venderlo.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CatalogModal;
