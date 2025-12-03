import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, TrendingUp, Users, User } from 'lucide-react'
import clsx from 'clsx'

export default function BottomNavigation() {
    const location = useLocation()

    const navigation = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Portfolio', href: '/portfolio', icon: TrendingUp },
        { name: 'Group Stats', href: '/group', icon: Users },
        { name: 'Users', href: '/users', icon: User },
    ]

    return (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 font-body">
            <nav className="flex items-center gap-2 px-4 py-2 bg-surface/90 backdrop-blur-lg border border-border/50 rounded-2xl shadow-luxury">
                {navigation.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.href

                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            className="group relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 hover:bg-surface-hover"
                        >
                            <div
                                className={clsx(
                                    "p-2 rounded-xl transition-all duration-300 group-hover:scale-110",
                                    isActive ? "bg-primary text-background shadow-gold-glow" : "text-text-muted group-hover:text-text-main"
                                )}
                            >
                                <Icon className="w-6 h-6" />
                            </div>

                            {/* Tooltip for Desktop */}
                            <span className="absolute -top-10 scale-0 transition-all duration-200 group-hover:scale-100 bg-surface text-text-main text-xs px-2 py-1 rounded-md whitespace-nowrap border border-border hidden md:block shadow-lg">
                                {item.name}
                            </span>

                            {/* Active Indicator Dot */}
                            {isActive && (
                                <span className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full shadow-gold-glow" />
                            )}
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}
