import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import Toasts from './common/Toasts'
import { WishlistProvider } from '../store/wishlist-context'

export default function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <WishlistProvider>
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
        <Toasts />
      </WishlistProvider>
    </div>
  )
}