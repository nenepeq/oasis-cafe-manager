import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Componente de Pantalla de Login
 * @param {Object} props - Propiedades del componente
 * @param {Function} props.onLogin - Callback ejecutado tras un login exitoso
 */
function Login({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError("Credenciales incorrectas: " + error.message);
        else onLogin(data.user);
    };

    return (
        <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '30px', width: '380px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', border: '1px solid #f0f0f0' }}>
                <img src="/logo.png" alt="Oasis" style={{ height: '80px', marginBottom: '15px' }} />
                <h2 style={{ color: '#4a3728', marginBottom: '25px', fontSize: '24px', fontWeight: 'bold' }}>Oasis Café Manager</h2>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <input
                        type="email"
                        placeholder="Correo"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ padding: '15px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '16px' }}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ padding: '15px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '16px' }}
                        required
                    />
                    {error && <p style={{ color: 'red', fontSize: '14px' }}>{error}</p>}
                    <button
                        type="submit"
                        style={{ padding: '15px', backgroundColor: '#4a3728', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}
                    >
                        ENTRAR
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Login;
