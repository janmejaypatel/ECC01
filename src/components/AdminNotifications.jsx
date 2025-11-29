import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { Send, CheckCircle, AlertCircle, Mail } from 'lucide-react'

export default function AdminNotifications() {
    const [selectedUser, setSelectedUser] = useState('')
    const [subject, setSubject] = useState('')
    const [description, setDescription] = useState('')
    const [status, setStatus] = useState('idle') // idle, sending, success, error

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

    const handleSend = async (e) => {
        e.preventDefault()
        setStatus('sending')

        // Simulate API call
        try {
            // In a real app, you would call a Supabase Edge Function here
            // await supabase.functions.invoke('send-email', { body: { userId: selectedUser, subject, description } })

            await new Promise(resolve => setTimeout(resolve, 1500)) // Fake delay

            setStatus('success')
            // Reset form after 2 seconds
            setTimeout(() => {
                setStatus('idle')
                setSelectedUser('')
                setSubject('')
                setDescription('')
            }, 2000)
        } catch (error) {
            console.error(error)
            setStatus('error')
        }
    }

    if (isLoading) return <div className="text-gray-400">Loading users...</div>

    return (
        <div className="max-w-2xl mx-auto p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-500/10 rounded-full">
                    <Mail className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Send Notification</h2>
                    <p className="text-sm text-gray-400">Send an email notification to a specific user.</p>
                </div>
            </div>

            <form onSubmit={handleSend} className="space-y-6">
                {/* User Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Select User
                    </label>
                    <select
                        required
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
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
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Subject
                    </label>
                    <input
                        type="text"
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g., Important Update Regarding Your Investment"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Description
                    </label>
                    <textarea
                        required
                        rows={6}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Type your message here..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
                    />
                </div>

                {/* Status Messages */}
                {status === 'success' && (
                    <div className="flex items-center gap-2 text-green-400 bg-green-400/10 p-4 rounded-lg">
                        <CheckCircle className="w-5 h-5" />
                        <span>Notification sent successfully!</span>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-4 rounded-lg">
                        <AlertCircle className="w-5 h-5" />
                        <span>Failed to send notification. Please try again.</span>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={status === 'sending' || status === 'success'}
                    className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${status === 'sending'
                            ? 'bg-blue-600/50 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/25'
                        }`}
                >
                    {status === 'sending' ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
