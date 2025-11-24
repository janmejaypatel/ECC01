import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/AuthContext'

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>
    }

    if (!user) {
        return <Navigate to="/login" />
    }

    return children
}
