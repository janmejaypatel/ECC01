import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { Send, CheckCircle, AlertCircle, Mail } from 'lucide-react'

export default function AdminNotifications() {
    const [selectedUser, setSelectedUser] = useState('')
    const [subject, setSubject] = useState('')
    const [description, setDescription] = useState('')
    const [status, setStatus] = useState('idle') // idle, sending, success, error

    // Health Check: Verify table exists
    const { error: healthCheckError } = useQuery({
        queryKey: ['notificationsHealthCheck'],
        queryFn: async () => {
            const { error } = await supabase.from('notifications').select('count').limit(1)
            if (error) return error
            return null
        },
        retry: false
    })

    // Fetch Users
    const { data: users, isLoading } = useQuery({
        queryKey: ['adminUsersList'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .order('full_name')
            if (error) throw error
            return data
        }
    })

    const [errorMessage, setErrorMessage] = useState('')

    const handleSend = async (e) => {
        e.preventDefault()
        setStatus('sending')
        setErrorMessage('')

        try {
            console.log('Sending notification to:', selectedUser)
            const { error } = await supabase
                .from('notifications')
                .insert([
                    {
                        user_id: selectedUser,
                        subject: subject,
                        message: description,
                        is_read: false
                    }
                ])

            if (error) throw error

            setStatus('success')
            // Reset form after 2 seconds
            setTimeout(() => {
                setStatus('idle')
                setSelectedUser('')
                setSubject('')
                setDescription('')
            }, 2000)
        } catch (error) {
            console.error('Error sending notification:', error)
            setStatus('error')
            setErrorMessage(error.message || 'Unknown error occurred')
        }
    }

    if (isLoading) return <div className="text-text-muted">Loading users...</div>

    return (
        <div className="max-w-2xl mx-auto p-6 font-body">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 rounded-full">
                    <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-text-main font-heading">Send Notification</h2>
                    <p className="text-sm text-text-muted">Send an in-app notification to a specific user.</p>
                </div>
            </div>

            {healthCheckError && (
                <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-xl flex items-start gap-3 text-error">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-bold text-sm">System Error: Table Missing</h3>
                        <p className="text-xs mt-1">
                            The 'notifications' table does not exist in your database.
                            Please run the SQL migration script provided in the chat.
                        </p>
                        <p className="text-xs mt-2 font-mono bg-black/10 p-2 rounded">
                            {healthCheckError.message}
                        </p>
                    </div>
                </div>
            )}

            <form onSubmit={handleSend} className="space-y-6">
                {/* User Selection */}
                <div>
                    <label className="block text-sm font-medium text-text-muted mb-2">
                        Select User
                    </label>
                    <select
                        required
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    >
                        <option value="">Choose a recipient...</option>
                        {users?.map((user) => (
                            <option key={user.id} value={user.id}>
                                {user.full_name} ({user.email})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Subject */}
                <div>
                    <label className="block text-sm font-medium text-text-muted mb-2">
                        Subject
                    </label>
                    <input
                        type="text"
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g., Important Update Regarding Your Investment"
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-text-muted mb-2">
                        Description
                    </label>
                    <textarea
                        required
                        rows={6}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Type your message here..."
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none"
                    />
                </div>

                {/* Status Messages */}
                {status === 'success' && (
                    <div className="flex items-center gap-2 text-success bg-success/10 p-4 rounded-xl">
                        <CheckCircle className="w-5 h-5" />
                        <span>Notification sent successfully!</span>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex items-center gap-2 text-error bg-error/10 p-4 rounded-xl">
                        <AlertCircle className="w-5 h-5" />
                        <span>{errorMessage || 'Failed to send notification. Please try again.'}</span>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={status === 'sending' || status === 'success'}
                    className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${status === 'sending'
                        ? 'bg-primary/50 cursor-not-allowed'
                        : 'bg-primary hover:bg-primary-hover text-background shadow-gold-glow hover:shadow-gold-glow-hover'
                        }`}
                >
                    {status === 'sending' ? (
                        <>
                            <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                            Sending...
                        </>
                    ) : (
                        <>
                            <Send className="w-5 h-5" />
                            Send Notification
                        </>
                    )}
                </button>
            </form>
        </div>
    )
}
