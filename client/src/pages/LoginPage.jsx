import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
            <div className="glass-card max-w-md w-full p-8">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        RMS Pro
                    </h1>
                    <p className="text-slate-400 text-sm mt-2">Work Order Management System</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Email or Username</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="admin@rms.local or username"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="label">Password</label>
                        <input
                            type="password"
                            className="input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary w-full mt-6"
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                {/* Demo Credentials */}
                <div className="mt-6 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                    <p className="text-xs text-slate-400 font-medium mb-2">Demo Credentials:</p>
                    <p className="text-xs text-slate-500">Email: admin@rms.local</p>
                    <p className="text-xs text-slate-500">Password: admin123</p>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
