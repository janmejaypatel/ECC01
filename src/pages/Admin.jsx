import { useState } from 'react'
import { useAuth } from '../hooks/AuthContext'
import Members from './Members'
import Installments from './Installments'
import Portfolio from './Portfolio'
import AdminNotifications from '../components/AdminNotifications'
import { Users, Wallet, PieChart, Bell } from 'lucide-react'

export default function Admin() {
    const { profile } = useAuth()
    const [activeTab, setActiveTab] = useState('members')

    if (profile?.role !== 'admin') {
        return <div className="text-white">Access Denied. Admin only.</div>
    }

    const tabs = [
        { id: 'members', label: 'User Management', icon: Users },
        { id: 'installments', label: 'Manage Installments', icon: Wallet },
        { id: 'holdings', label: 'Edit Holdings', icon: PieChart },
        { id: 'notifications', label: 'Notifications', icon: Bell },
    ]

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-8">Admin Panel</h1>

            {/* Tabs */}
            <div className="flex space-x-4 mb-8 border-b border-gray-700 pb-4 overflow-x-auto">
                {tabs.map((tab) => {
                    const Icon = tab.icon
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                        >
                            <Icon className="w-4 h-4 mr-2" />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* Content */}
            <div className="bg-gray-900 rounded-xl">
                {activeTab === 'members' && <Members />}
                {activeTab === 'installments' && <Installments />}
                {activeTab === 'holdings' && <Portfolio />}
                {activeTab === 'notifications' && <AdminNotifications />}
            </div>
        </div>
    )
}
