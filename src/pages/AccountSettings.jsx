import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../hooks/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { ShieldCheck, Mail, Lock } from 'lucide-react'

export default function AccountSettings() {
  const { user, profile, updateEmail } = useAuth()
  const [isVerified, setIsVerified] = useState(false)
  const [otpSent, setOtpSent] = useState(false)

  // OTP State: Array of 8 strings
  const [otp, setOtp] = useState(new Array(8).fill(''))
  const inputRefs = useRef([])

  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  // Email Change State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')

  // Focus first input when OTP is sent
  useEffect(() => {
    if (otpSent && inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [otpSent])

  // OTP Input Handlers
  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false

    const newOtp = [...otp]
    newOtp[index] = element.value
    setOtp(newOtp)

    // Focus next input
    if (element.value && index < 7) {
      inputRefs.current[index + 1].focus()
    }
  }

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1].focus()
      }
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 8).split('')
    if (pastedData.length > 0) {
      const newOtp = [...otp]
      pastedData.forEach((value, i) => {
        if (i < 8) newOtp[i] = value
      })
      setOtp(newOtp)
      // Focus the last filled input or the next empty one
      const nextIndex = Math.min(pastedData.length, 7)
      inputRefs.current[nextIndex].focus()
    }
  }

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
    const token = otp.join('')

    if (token.length !== 8) {
      setMessage({ type: 'error', text: 'Please enter the full 8-digit code.' })
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: user.email,
        token: token,
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

  // 4. Update Email
  const handleUpdateEmail = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      await updateEmail(newEmail)
      setIsEmailModalOpen(false)
      setMessage({ type: 'success', text: `Confirmation link sent to ${newEmail}. Please check your inbox.` })
      setNewEmail('')
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto font-body">
      <h1 className="text-3xl font-bold text-primary mb-8 font-heading">Account Settings</h1>

      {/* Verification Section */}
      {!isVerified ? (
        <div className="bg-surface rounded-2xl border border-border p-8 text-center shadow-luxury">
          <ShieldCheck className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-main mb-2 font-heading">Identity Verification Required</h2>
          <p className="text-text-muted mb-6">
            To ensure security, please verify your identity via email before making changes.
          </p>

          {message && (
            <div className={`mb-6 p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
              {message.text}
            </div>
          )}

          {!otpSent ? (
            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="px-6 py-3 bg-primary text-background font-bold rounded-xl hover:bg-primary-hover disabled:opacity-50 transition-all flex items-center justify-center mx-auto shadow-gold-glow hover:shadow-gold-glow-hover"
            >
              <Mail className="w-4 h-4 mr-2" />
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          ) : (
            <form onSubmit={handleVerifyOtp} className="max-w-md mx-auto space-y-6">
              <div className="flex justify-center gap-2">
                {otp.map((data, index) => {
                  return (
                    <input
                      key={index}
                      type="text"
                      maxLength="1"
                      ref={el => inputRefs.current[index] = el}
                      value={data}
                      onChange={e => handleChange(e.target, index)}
                      onKeyDown={e => handleKeyDown(e, index)}
                      onPaste={handlePaste}
                      className="w-10 h-12 md:w-12 md:h-14 bg-background border border-border rounded-lg text-center text-xl md:text-2xl text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                    />
                  )
                })}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-success text-background font-bold rounded-xl hover:bg-opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-success/20"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
              <button
                type="button"
                onClick={() => setOtpSent(false)}
                className="text-sm text-text-muted hover:text-text-main underline transition-colors"
              >
                Resend Code
              </button>
            </form>
          )}
        </div>
      ) : (
        /* Edit Form (Only shown after verification) */
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-luxury">
          <div className="flex items-center mb-6 text-success bg-success/10 p-3 rounded-xl">
            <ShieldCheck className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Identity Verified. You can now edit your details.</span>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {message && (
              <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                {message.text}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Email</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-text-muted cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(true)}
                  className="px-4 py-2 bg-surface-hover border border-border text-primary font-bold rounded-xl hover:bg-primary/10 transition-colors whitespace-nowrap"
                >
                  Change Email
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">New Password</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Leave blank to keep current password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary transition-colors"
                />
                <Lock className="absolute right-3 top-3.5 w-4 h-4 text-text-muted" />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-primary text-background font-bold rounded-xl hover:bg-primary-hover disabled:opacity-50 transition-all shadow-gold-glow hover:shadow-gold-glow-hover"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Email Change Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-md border border-border shadow-luxury">
            <h2 className="text-xl font-bold text-primary mb-4 font-heading">Change Email Address</h2>
            <p className="text-text-muted mb-6 text-sm">
              Enter your new email address. We will send a confirmation link to verify it.
            </p>
            <form onSubmit={handleUpdateEmail} className="space-y-4 font-body">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">New Email</label>
                <input
                  type="email"
                  required
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary transition-colors"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-4 py-2 text-text-muted hover:text-text-main transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-primary text-background font-bold rounded-xl hover:bg-primary-hover disabled:opacity-50 transition-all shadow-gold-glow"
                >
                  {loading ? 'Sending...' : 'Send Confirmation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
