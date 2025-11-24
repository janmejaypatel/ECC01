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
        { name: 'Installments', href: '/installments', icon: Wallet },
    ]

    // Only show Members link in sidebar if NOT admin (admins access via profile menu)
    // OR keep it? User said "admin tools... when i click on profile log".
    // Let's keep common nav items here.

    return (
        <div className="min-h-screen bg-gray-900 text-white flex">
            {/* Sidebar */}
            <div
                className={clsx(
                    "bg-gray-800 border-r border-gray-700 flex flex-col transition-all duration-300 ease-in-out z-20 relative",
                    isSidebarHovered ? "w-64" : "w-20"
                )}
                onMouseEnter={() => setIsSidebarHovered(true)}
                onMouseLeave={() => setIsSidebarHovered(false)}
            >
                <div className="p-6 flex items-center justify-center h-20">
                    {isSidebarHovered ? (
                        <h1 className="text-2xl font-bold text-blue-500 whitespace-nowrap">ECC</h1>
                    ) : (
                        <h1 className="text-2xl font-bold text-blue-500">E</h1>
                    )}
                </div>

                <nav className="flex-1 px-4 space-y-2">
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
                                        : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                                    !isSidebarHovered && 'justify-center px-2'
                                )}
                            >
                                <Icon className={clsx("h-6 w-6", isSidebarHovered && "mr-3")} />
                                {isSidebarHovered && <span>{item.name}</span>}
                            </Link>
                        )
                    })}
                </nav>

                {/* Profile Section */}
                <div className="p-4 border-t border-gray-700 relative">
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className={clsx(
                            "flex items-center w-full rounded-lg transition-colors hover:bg-gray-700 p-2",
                            !isSidebarHovered && "justify-center"
                        )}
                    >
                        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                            {profile?.full_name?.charAt(0) || 'U'}
                        </div>
                        {isSidebarHovered && (
                            <div className="ml-3 text-left overflow-hidden">
                                <p className="text-sm font-medium text-white truncate">{profile?.full_name}</p>
                                <p className="text-xs text-gray-400 capitalize truncate">{profile?.role}</p>
                            </div>
                        )}
                    </button>

                    {/* Profile Dropdown */}
                    {isProfileOpen && (
                        <div className="absolute bottom-full left-4 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-xl mb-2 overflow-hidden z-50">
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
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}
