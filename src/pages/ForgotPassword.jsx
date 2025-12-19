import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Link } from 'react-router-dom'

export default function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState(null)
    const [error, setError] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
            })

            if (error) throw error

            setMessage('Check your email for the password reset link')
        } catch (error) {
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 font-body">
            <div className="max-w-md w-full space-y-8 bg-surface p-8 rounded-2xl shadow-luxury border border-border">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-primary font-heading">
                        Reset Password
                    </h2>
                    <p className="mt-2 text-center text-sm text-text-muted">
                        Enter your email to receive a password reset link
                    </p>
                </div>
                {error && <div className="bg-error/10 border border-error text-error p-3 rounded-xl">{error}</div>}
                {message && <div className="bg-primary/10 border border-primary text-primary p-3 rounded-xl">{message}</div>}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <input
                            type="email"
                            required
                            className="appearance-none rounded-xl relative block w-full px-3 py-3 border border-border placeholder-text-muted text-text-main bg-background focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm transition-colors"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-background bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-all shadow-gold-glow hover:shadow-gold-glow-hover"
                        >
                            {loading ? 'Sending link...' : 'Send Reset Link'}
                        </button>
                    </div>

                    <div className="text-center mt-4">
                        <Link to="/login" className="text-sm text-primary hover:text-primary-hover transition-colors">
                            Back to Login
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    )
}
