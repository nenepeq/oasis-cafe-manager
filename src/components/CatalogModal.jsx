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
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        category: categories[1] || '', // Evitamos 'Todos'
        sale_price: 0,
        cost_price: 0
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
            cost_price: 0
        });
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            category: product.category,
            sale_price: product.sale_price,
            cost_price: product.cost_price || 0
        });
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

                <h2 style={{ color: '#4a3728', fontWeight: '900', marginTop: 0, marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '22px' }}>
                    <ClipboardList size={28} /> Gestión de Catálogo
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>

                    {/* FORMULARIO */}
                    <div style={{ background: '#fdfbf9', padding: '20px', borderRadius: '20px', border: '1px solid #f1ece6' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#4a3728', marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {editingProduct ? <><Edit2 size={18} /> Editar Producto</> : <><Plus size={18} /> Nuevo Producto</>}
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
                                    {/* Opción temporal para categoría nueva no guardada aún */}
                                    {!formCategories.includes(formData.category) && formData.category && (
                                        <option value={formData.category}>{formData.category}</option>
                                    )}

                                    {formCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    <option value="__NEW__" style={{ fontWeight: 'bold', color: '#27ae60' }}>+ Nueva Categoría...</option>
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#8b5a2b', marginBottom: '5px' }}>$ COSTO (PROMEDIO)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.cost_price || ''}
                                        onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '14px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#8b5a2b', marginBottom: '5px' }}>$ PRECIO VENTA</label>
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
                                    {editingProduct ? 'GUARDAR CAMBIOS' : 'CREAR PRODUCTO'}
                                </button>
                                {editingProduct && (
                                    <button
                                        type="button"
                                        onClick={handleOpenCreate}
                                        style={{
                                            flex: 1, padding: '15px', borderRadius: '12px', border: '1px solid #ddd',
                                            backgroundColor: '#fff', color: '#666', fontWeight: 'bold', cursor: 'pointer'
                                        }}
                                    >
                                        CANCELAR
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* LISTADO */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#4a3728', marginTop: 0, marginBottom: '20px' }}>PRODUCTOS ACTUALES ({products.length})</h3>
                        <div style={{ flex: 1, overflowY: 'auto', maxHeight: '400px', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '5px' }} className="custom-scrollbar">
                            {products.map(p => (
                                <div key={p.id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '12px 15px', borderRadius: '15px', border: '1px solid #eee', background: editingProduct?.id === p.id ? '#fff9c4' : '#fff'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#4a3728' }}>{p.name}</div>
                                        <div style={{ fontSize: '11px', color: '#8b5a2b' }}>{p.category} • <span style={{ color: '#27ae60', fontWeight: 'bold' }}>${parseFloat(p.sale_price).toFixed(2)}</span></div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        <button
                                            onClick={() => handleEdit(p)}
                                            style={{ padding: '8px', borderRadius: '8px', border: 'none', background: '#f0f0f0', cursor: 'pointer', color: '#3498db' }}
                                            title="Editar"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(p.id, p.name)}
                                            style={{ padding: '8px', borderRadius: '8px', border: 'none', background: '#fff0f0', cursor: 'pointer', color: '#e74c3c' }}
                                            title="Eliminar"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
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
