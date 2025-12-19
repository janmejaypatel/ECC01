import { useState } from 'react'
import { useAuth } from '../hooks/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { LogOut, Settings, Shield, Sun, Moon, Bell, Check, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { Link, Outlet } from 'react-router-dom'
import { useStockPrices } from '../hooks/useStockPrices'
import BottomNavigation from './BottomNavigation'
import clsx from 'clsx'

export default function DashboardLayout() {
    const { signOut, profile } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
    const queryClient = useQueryClient()

    // Fetch Notifications
    const { data: notifications } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', profile?.id)
                .order('created_at', { ascending: false })
            if (error) throw error
            return data
        },
        enabled: !!profile?.id,
        refetchInterval: 30000 // Poll every 30 seconds
    })

    // Fetch Holdings to get symbols for global price updates
    const { data: holdings } = useQuery({
        queryKey: ['holdings'],
        queryFn: async () => {
            const { data, error } = await supabase.from('holdings').select('*')
            if (error) throw error
            return data
        }
    })

    // Global Price Sync
    // This hook will run in the background and update the stock_prices table
    // It doesn't need to return data here, just ensure it's active
    useStockPrices(holdings)

    const unreadCount = notifications?.filter(n => !n.is_read).length || 0

    // Mark as Read Mutation
    const markReadMutation = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications'])
        }
    })

    return (
        <div className="h-[100dvh] bg-background text-text-main flex flex-col overflow-hidden transition-colors duration-300 font-body">
            {/* Floating Glass Header */}
            <div className="p-4 pb-0 z-30 flex-shrink-0">
                <header className="h-16 md:h-20 bg-surface/90 backdrop-blur-lg border border-border rounded-2xl flex items-center justify-between px-4 md:px-8 shadow-luxury">
                    <Link to="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                        {theme === 'light' ? (
                            <div
                                className="h-8 w-8 md:h-10 md:w-10 bg-primary"
                                style={{
                                    maskImage: 'url("/images/logo.png")',
                                    maskSize: 'contain',
                                    maskRepeat: 'no-repeat',
                                    maskPosition: 'center',
                                    WebkitMaskImage: 'url("/images/logo.png")',
                                    WebkitMaskSize: 'contain',
                                    WebkitMaskRepeat: 'no-repeat',
                                    WebkitMaskPosition: 'center'
                                }}
                            />
                        ) : (
                            <img src="/images/logo.png" alt="ECC Logo" className="h-8 w-8 md:h-10 md:w-10 object-contain" />
                        )}
                        <h1 className="text-lg md:text-xl font-bold text-primary tracking-wide hidden md:block font-heading">Elevate Capital Collective</h1>
                        <h1 className="text-lg font-bold text-primary tracking-wide md:hidden font-heading">ECC</h1>
                    </Link>

                    <div className="flex items-center gap-3 md:gap-6">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-xl bg-background border border-border text-text-muted hover:text-primary hover:border-primary transition-all duration-300 shadow-sm hover:shadow-gold-glow"
                            title="Toggle Theme"
                        >
                            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>

                        {/* Notification Bell */}
                        <div className="relative">
                            <button
                                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                className="p-2 rounded-xl bg-background border border-border text-text-muted hover:text-primary hover:border-primary transition-all duration-300 shadow-sm hover:shadow-gold-glow relative"
                            >
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-error text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-sm">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notifications Dropdown */}
                            {isNotificationsOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setIsNotificationsOpen(false)}
                                    ></div>
                                    <div className="absolute top-full right-0 mt-3 w-80 md:w-96 bg-surface/95 backdrop-blur-xl border border-border rounded-2xl shadow-luxury overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="p-4 border-b border-border flex justify-between items-center">
                                            <h3 className="font-bold text-text-main font-heading">Notifications</h3>
                                            <button onClick={() => setIsNotificationsOpen(false)} className="text-text-muted hover:text-text-main">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="max-h-[400px] overflow-y-auto">
                                            {notifications?.length === 0 ? (
                                                <div className="p-8 text-center text-text-muted text-sm">
                                                    No notifications yet.
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-border/50">
                                                    {notifications?.map((notification) => (
                                                        <div
                                                            key={notification.id}
                                                            className={`p-4 hover:bg-surface-hover transition-colors ${!notification.is_read ? 'bg-primary/5' : ''}`}
                                                        >
                                                            <div className="flex justify-between items-start gap-3">
                                                                <div className="flex-1">
                                                                    <h4 className={`text-sm font-bold mb-1 ${!notification.is_read ? 'text-primary' : 'text-text-main'}`}>
                                                                        {notification.subject}
                                                                    </h4>
                                                                    <p className="text-xs text-text-muted leading-relaxed">
                                                                        {notification.message}
                                                                    </p>
                                                                    <p className="text-[10px] text-text-muted mt-2 opacity-70">
                                                                        {new Date(notification.created_at).toLocaleDateString()}
                                                                    </p>
                                                                </div>
                                                                {!notification.is_read && (
                                                                    <button
                                                                        onClick={() => markReadMutation.mutate(notification.id)}
                                                                        className="p-1 hover:bg-primary/10 rounded-full text-primary transition-colors"
                                                                        title="Mark as read"
                                                                    >
                                                                        <Check className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Profile Section */}
                        <div className="relative">
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center gap-2 md:gap-3 rounded-xl transition-colors hover:bg-surface-hover p-1 md:p-2"
                            >
                                <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-primary flex items-center justify-center text-background font-bold text-sm md:text-lg border-2 border-surface shadow-gold-glow">
                                    {profile?.full_name?.charAt(0) || 'U'}
                                </div>
                                <div className="hidden md:block text-left">
                                    <p className="text-sm font-medium text-text-main">{profile?.full_name}</p>
                                    <p className="text-xs text-text-muted capitalize">{profile?.role}</p>
                                </div>
                            </button>

                            {/* Profile Dropdown */}
                            {isProfileOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setIsProfileOpen(false)}
                                    ></div>
                                    <div className="absolute top-full right-0 mt-3 w-64 bg-surface/95 backdrop-blur-xl border border-border rounded-2xl shadow-luxury overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="p-2 space-y-1">
                                            <div className="md:hidden px-4 py-3 border-b border-border mb-1">
                                                <p className="text-sm font-medium text-text-main">{profile?.full_name}</p>
                                                <p className="text-xs text-text-muted capitalize">{profile?.role}</p>
                                            </div>
                                            <Link
                                                to="/settings"
                                                onClick={() => setIsProfileOpen(false)}
                                                className="flex items-center px-4 py-3 text-sm text-text-muted hover:bg-surface-hover hover:text-primary rounded-xl transition-colors"
                                            >
                                                <Settings className="w-4 h-4 mr-3" />
                                                Account Settings
                                            </Link>

                                            {profile?.role === 'admin' && (
                                                <Link
                                                    to="/admin"
                                                    onClick={() => setIsProfileOpen(false)}
                                                    className="flex items-center px-4 py-3 text-sm text-text-muted hover:bg-surface-hover hover:text-primary rounded-xl transition-colors"
                                                >
                                                    <Shield className="w-4 h-4 mr-3" />
                                                    Admin Panel
                                                </Link>
                                            )}

                                            <div className="h-px bg-border my-1"></div>

                                            <button
                                                onClick={signOut}
                                                className="flex items-center w-full px-4 py-3 text-sm text-error hover:bg-error/10 rounded-xl transition-colors"
                                            >
                                                <LogOut className="w-4 h-4 mr-3" />
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>
            </div>

            {/* Content Wrapper */}
            <div className="flex flex-1 overflow-hidden relative">
                {/* Main Content Area */}
                <main className="flex-1 overflow-auto bg-background p-4 md:p-8 w-full">
                    <Outlet />
                    <div className="h-20 shrink-0 w-full" aria-hidden="true" />
                </main>
            </div>

            <BottomNavigation />
        </div>
    )
}
