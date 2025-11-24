import { useState } from 'react'
import { useAuth } from '../hooks/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { ShieldCheck, Mail, Lock } from 'lucide-react'

export default function AccountSettings() {
  const { user, profile } = useAuth()
  const [isVerified, setIsVerified] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')

  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  // 1. Send OTP
  const handleSendOtp = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: user.email,
        options: { shouldCreateUser: false }
      })
      if (error) throw error
      setOtpSent(true)
      setMessage({ type: 'success', text: 'Verification code sent to your email!' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  // 2. Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: user.email,
        token: otp,
        type: 'email'
      }) // Note: This logs the user in (refreshes session)

      if (error) throw error

      setIsVerified(true)
      setMessage({ type: 'success', text: 'Identity verified! You can now edit your details.' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Invalid code or expired. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  // 3. Update Profile
  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      // Update Profile Data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Update Password (if provided)
      if (password) {
        const { error: authError } = await supabase.auth.updateUser({ password })
        if (authError) throw authError
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      setPassword('') // Clear password field
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">Account Settings</h1>

      {/* Verification Section */}
      {!isVerified ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
          <ShieldCheck className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Identity Verification Required</h2>
          <p className="text-gray-400 mb-6">
            To ensure security, please verify your identity via email before making changes.
          </p>

          {message && (
            <div className={`mb-6 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {message.text}
            </div>
          )}

          {!otpSent ? (
            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center mx-auto"
            >
              <Mail className="w-4 h-4 mr-2" />
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          ) : (
            <form onSubmit={handleVerifyOtp} className="max-w-xs mx-auto space-y-4">
              <input
                type="text"
                placeholder="Enter your One Time Password"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-center tracking-widest text-lg focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
              <button
                type="button"
                onClick={() => setOtpSent(false)}
                className="text-sm text-gray-400 hover:text-white underline"
              >
                Resend Code
              </button>
            </form>
          )}
        </div>
      ) : (
        /* Edit Form (Only shown after verification) */
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center mb-6 text-green-400 bg-green-500/10 p-3 rounded-lg">
            <ShieldCheck className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Identity Verified. You can now edit your details.</span>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {message && (
              <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {message.text}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-gray-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">New Password</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Leave blank to keep current password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
                <Lock className="absolute right-3 top-2.5 w-4 h-4 text-gray-500" />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
