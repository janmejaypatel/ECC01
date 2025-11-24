import { useState } from 'react'
import { useAuth } from '../hooks/AuthContext'
import { LogOut, LayoutDashboard, Wallet, TrendingUp, Users, Settings, Shield, User } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import clsx from 'clsx'

export default function DashboardLayout() {
    const { signOut, profile } = useAuth()
    const location = useLocation()
    const [isSidebarHovered, setIsSidebarHovered] = useState(false)
    const [isProfileOpen, setIsProfileOpen] = useState(false)

    const navigation = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Portfolio', href: '/portfolio', icon: TrendingUp },
        { name: 'Group Stats', href: '/group', icon: Users },
        { name: 'Users', href: '/users', icon: User },
    ]

    // Only show Members link in sidebar if NOT admin (admins access via profile menu)
    // OR keep it? User said "admin tools... when i click on profile log".
    // Let's keep common nav items here.

    return (
        <div className="h-screen bg-gray-900 text-white flex flex-col">
            {/* Header (Full Width) */}
            <header className="h-20 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-8 z-30 shadow-md">
                <div className="flex items-center gap-4">
                    <img src="/images/logo.png" alt="ECC Logo" className="h-10 w-10 object-contain" />
                    <h1 className="text-xl font-bold text-white tracking-wide hidden md:block">Elevate Capital Collective</h1>
                </div>

                {/* Profile Section */}
                <div className="relative">
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center gap-3 rounded-lg transition-colors hover:bg-gray-700 p-2"
                    >
                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg border-2 border-gray-600">
                            {profile?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="hidden md:block text-left">
                            <p className="text-sm font-medium text-white">{profile?.full_name}</p>
                            <p className="text-xs text-gray-400 capitalize">{profile?.role}</p>
                        </div>
                    </button>

                    {/* Profile Dropdown */}
                    {isProfileOpen && (
                        <div className="absolute top-full right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
                            <div className="p-2 space-y-1">
                                <Link
                                    to="/settings"
                                    onClick={() => setIsProfileOpen(false)}
                                    className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg"
                                >
                                    <Settings className="w-4 h-4 mr-3" />
                                    Account Settings
                                </Link>

                                {profile?.role === 'admin' && (
                                    <Link
                                        to="/admin"
                                        onClick={() => setIsProfileOpen(false)}
                                        className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg"
                                    >
                                        <Shield className="w-4 h-4 mr-3" />
                                        Admin Panel
                                    </Link>
                                )}

                                <div className="h-px bg-gray-700 my-1"></div>

                                <button
                                    onClick={signOut}
                                    className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-700 rounded-lg"
                                >
                                    <LogOut className="w-4 h-4 mr-3" />
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Content Wrapper */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div
                    className={clsx(
                        "bg-gray-800 border-r border-gray-700 flex flex-col transition-all duration-300 ease-in-out z-20 relative",
                        isSidebarHovered ? "w-64" : "w-20"
                    )}
                    onMouseEnter={() => setIsSidebarHovered(true)}
                    onMouseLeave={() => setIsSidebarHovered(false)}
                >
                    <nav className="flex-1 px-4 space-y-2 py-4 overflow-y-auto overflow-x-hidden">
                        {navigation.map((item) => {
                            const Icon = item.icon
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={clsx(
                                        'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap',
                                        location.pathname === item.href
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                    )}
                                >
                                    <Icon className="h-6 w-6 min-w-[24px]" />
                                    <span
                                        className={clsx(
                                            "ml-3 transition-all duration-300 ease-in-out overflow-hidden",
                                            isSidebarHovered ? "opacity-100 max-w-[150px]" : "opacity-0 max-w-0"
                                        )}
                                    >
                                        {item.name}
                                    </span>
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Bottom Branding */}
                    <div className="p-4 border-t border-gray-700 flex items-center justify-start h-16 gap-3 overflow-hidden">
                        <img src="/images/logo.png" alt="ECC" className="h-8 w-8 min-w-[32px] object-contain" />
                        <h2
                            className={clsx(
                                "text-xl font-bold text-blue-500 tracking-widest transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap",
                                isSidebarHovered ? "opacity-100 max-w-[100px]" : "opacity-0 max-w-0"
                            )}
                        >
                            ECC
                        </h2>
                    </div>
                </div>

                {/* Main Content Area */}
                <main className="flex-1 overflow-auto bg-gray-900 p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
