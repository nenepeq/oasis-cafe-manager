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
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);


    const handleLogin = async (e) => {
        e.preventDefault();
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError("Credenciales incorrectas: " + error.message);
        else onLogin(data.user);
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <img src="/logo.png" alt="Oasis" className="login-logo" />
                <h2 className="login-title">Oasis Café Manager</h2>
                <form onSubmit={handleLogin} className="login-form">
                    <input
                        type="email"
                        placeholder="Correo"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="login-input"
                        required
                    />
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="login-input"
                        required
                    />
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '15px',
                        fontSize: '14px',
                        color: '#4a3728',
                        cursor: 'pointer',
                        alignSelf: 'flex-start'
                    }} onClick={() => setShowPassword(!showPassword)}>
                        <input
                            type="checkbox"
                            checked={showPassword}
                            onChange={() => { }} // Manejado por el div para mejor área de toque
                            style={{ cursor: 'pointer' }}
                        />
                        <span>Mostrar contraseña</span>
                    </div>

                    {error && <p className="login-error">{error}</p>}
                    <button type="submit" className="login-button">
                        ENTRAR
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Login;
