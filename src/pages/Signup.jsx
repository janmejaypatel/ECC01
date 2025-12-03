import { useState } from 'react'
import { useAuth } from '../hooks/AuthContext'
import { Link, useNavigate } from 'react-router-dom'

export default function Signup() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { signUp } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            setError('')
            setLoading(true)
            await signUp(email, password, fullName)
            navigate('/') // Or to a 'check email' page if email confirmation is on
        } catch (err) {
            setError('Failed to create account: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 font-body">
            <div className="max-w-md w-full space-y-8 bg-surface p-8 rounded-2xl shadow-luxury border border-border">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-primary font-heading">
                        Create your account
                    </h2>
                    <p className="mt-2 text-center text-sm text-text-muted">
                        Or{' '}
                        <Link to="/login" className="font-medium text-primary hover:text-primary-hover transition-colors">
                            sign in to existing account
                        </Link>
                    </p>
                </div>
                {error && <div className="bg-error/10 border border-error text-error p-3 rounded-xl">{error}</div>}
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <input
                                type="text"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-border placeholder-text-muted text-text-main bg-background rounded-t-xl focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm transition-colors"
                                placeholder="Full Name"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                            />
                        </div>
                        <div>
                            <input
                                type="email"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-border placeholder-text-muted text-text-main bg-background focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm transition-colors"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-border placeholder-text-muted text-text-main bg-background rounded-b-xl focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm transition-colors"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-background bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-all shadow-gold-glow hover:shadow-gold-glow-hover"
                        >
                            {loading ? 'Creating account...' : 'Sign up'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
