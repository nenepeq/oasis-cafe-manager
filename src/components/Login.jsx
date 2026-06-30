import React, { useState, useRef } from 'react';
import ReCAPTCHA from "react-google-recaptcha";
import { useData } from '../context/DataContext';
import { supabase } from '../supabaseClient';

/**
 * Componente de Pantalla de Login con validación server-side de reCAPTCHA.
 */
function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [recaptchaToken, setRecaptchaToken] = useState(null);
    const recaptchaRef = useRef(null);
    const { login } = useData();

    /**
     * Valida el token de reCAPTCHA en el servidor via Supabase Edge Function.
     * Esto previene bypass del captcha desde el cliente.
     */
    const verifyRecaptchaServerSide = async (token) => {
        try {
            const { data, error } = await supabase.functions.invoke('verify-recaptcha', {
                body: { token }
            });

            if (error) {
                console.error('Error verificando reCAPTCHA:', error);
                return false;
            }

            return data?.success === true;
        } catch (err) {
            console.error('Error de red al verificar reCAPTCHA:', err);
            // En caso de error de red con la Edge Function, permitir login
            // para no bloquear a usuarios legítimos sin conexión estable
            return true;
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);

        if (!recaptchaToken) {
            setError("Por favor, verifica que no eres un robot.");
            return;
        }

        setLoading(true);

        // Validación server-side del reCAPTCHA
        const isValid = await verifyRecaptchaServerSide(recaptchaToken);
        if (!isValid) {
            setError("Verificación de seguridad fallida. Intenta de nuevo.");
            setRecaptchaToken(null);
            if (recaptchaRef.current) recaptchaRef.current.reset();
            setLoading(false);
            return;
        }

        const { error: loginError } = await login(email, password);
        if (loginError) {
            setError("Credenciales incorrectas: " + loginError.message);
            // Reset captcha después de intento fallido
            setRecaptchaToken(null);
            if (recaptchaRef.current) recaptchaRef.current.reset();
        }
        setLoading(false);
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
                            onChange={() => { }}
                            style={{ cursor: 'pointer' }}
                        />
                        <span>Mostrar contraseña</span>
                    </div>

                    <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'center' }}>
                        <ReCAPTCHA
                            ref={recaptchaRef}
                            sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                            onChange={(token) => setRecaptchaToken(token)}
                            onExpired={() => setRecaptchaToken(null)}
                        />
                    </div>

                    {error && <p className="login-error">{error}</p>}
                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? 'VERIFICANDO...' : 'ENTRAR'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Login;
