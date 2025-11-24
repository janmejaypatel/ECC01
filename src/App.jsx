
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Login from './pages/Login'
import Signup from './pages/Signup'
import DashboardLayout from './components/DashboardLayout'
import DashboardHome from './pages/DashboardHome'
import Installments from './pages/Installments'
import Portfolio from './pages/Portfolio'
import Members from './pages/Members'
import AccountSettings from './pages/AccountSettings'
import PersonalStats from './pages/PersonalStats'
import Admin from './pages/Admin'
import Group from './pages/Group'
import ProtectedRoute from './components/ProtectedRoute'
import UpdatePassword from './pages/UpdatePassword'

const queryClient = new QueryClient()

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/update-password" element={<UpdatePassword />} />

                        <Route path="/" element={
                            <ProtectedRoute>
                                <DashboardLayout />
                            </ProtectedRoute>
                        }>
                            <Route index element={<DashboardHome />} />
                            <Route path="users" element={<Installments />} />
                            <Route path="portfolio" element={<Portfolio />} />
                            <Route path="members" element={<Members />} />
                            <Route path="settings" element={<AccountSettings />} />
                            <Route path="my-stats" element={<PersonalStats />} />
                            <Route path="admin" element={<Admin />} />
                            <Route path="group" element={<Group />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </QueryClientProvider>
    )
}

export default App
