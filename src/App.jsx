import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ProductGrid from './components/ProductGrid';
import CartPage from './pages/CartPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Checkout from './pages/Checkout';
import AdminOrders from './pages/AdminOrders';
import ManageCategories from './pages/admin/ManageCategories';
import ManageCars from './pages/admin/ManageCars';
import AdminCarSpecs from './pages/admin/AdminCarSpecs';
import ManageProducts from './pages/admin/ManageProducts';
import EditProduct from './pages/admin/EditProduct';
import EditCategory from './pages/admin/EditCategory';
import EditCar from './pages/admin/EditCar';
import OrderDetails from './pages/admin/OrderDetails';
import ManageHero from './pages/admin/ManageHero';
import ManageBrands from './pages/admin/ManageBrands';
import ManagePayments from './pages/admin/ManagePayments';
import ManageShipping from './pages/admin/ManageShipping';
import ManagePromoCodes from './pages/admin/ManagePromoCodes';
import PaymentManager from './pages/admin/PaymentManager';
import ManageSettings from './pages/admin/ManageSettings';
import ManageAffiliates from './pages/admin/ManageAffiliates';
import AdminAffiliateDetails from './pages/admin/AdminAffiliateDetails';
import ManagePolicies from './pages/admin/ManagePolicies';
import ShopPage from './pages/ShopPage';
import PolicyPage from './pages/PolicyPage';
import Footer from './components/Footer';
import AdminLayout from './components/AdminLayout';
import AddProduct from './pages/admin/AddProduct';
import AdminReviews from './pages/admin/AdminReviews';
import AdminMessages from './pages/admin/AdminMessages';
import ProductDetails from './pages/ProductDetails';
import Home from './pages/Home';
import OrderHistory from './pages/OrderHistory';
import OrderSuccess from './pages/OrderSuccess';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ContactUs from './pages/ContactUs';
import AffiliateDashboard from './pages/AffiliateDashboard';
import AffiliateRegister from './pages/AffiliateRegister';
import Profile from './pages/Profile';
import OilAdvisor from './pages/OilAdvisor';
import ProtectedRoute from './components/ProtectedRoute';
import UserProtectedRoute from './components/UserProtectedRoute';
import AffiliateProtectedRoute from './components/AffiliateProtectedRoute';
import { SettingsProvider } from './context/SettingsContext';
import { Outlet, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';

const PublicLayout = () => {
  const { i18n } = useTranslation();
  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col font-sans ${i18n.language === 'ar' ? 'font-arabic rtl' : 'ltr'}`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#000',
            fontWeight: '600',
            borderRadius: '16px',
            padding: '12px 24px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Navbar />
      <main className="flex-1 pt-16 md:pt-20">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

const ReferralTracker = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      console.log("Referral Code Detected:", ref);
      localStorage.setItem('affiliate_ref', ref);
    }
  }, [searchParams]);

  return null;
};

function App() {
  return (
    <Router>
      <ReferralTracker />
      <SettingsProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fff',
              color: '#000',
              fontWeight: '600',
              borderRadius: '16px',
              padding: '12px 24px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            },
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/returns" element={<PolicyPage pageId="returns-policy" />} />
            <Route path="/shipping" element={<PolicyPage pageId="shipping-info" />} />
            <Route path="/my-orders" element={<OrderHistory />} />
            <Route path="/oil-advisor" element={<OilAdvisor />} />
            <Route path="/order-success" element={<OrderSuccess />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/affiliate-register" element={<AffiliateRegister />} />
            <Route
              path="/profile"
              element={
                <UserProtectedRoute>
                  <Profile />
                </UserProtectedRoute>
              }
            />
            <Route
              path="/affiliate-dashboard"
              element={
                <AffiliateProtectedRoute>
                  <AffiliateDashboard />
                </AffiliateProtectedRoute>
              }
            />
          </Route>

          {/* Admin Login (Standalone) */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="categories" element={<ManageCategories />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="car-specs" element={<AdminCarSpecs />} />
            <Route path="cars" element={<ManageCars />} />
            <Route path="products" element={<ManageProducts />} />
            <Route path="products/new" element={<AddProduct />} />
            <Route path="edit-product/:id" element={<EditProduct />} />
            <Route path="edit-category/:id" element={<EditCategory />} />
            <Route path="edit-car/:id" element={<EditCar />} />
            <Route path="order/:id" element={<OrderDetails />} />
            <Route path="hero" element={<ManageHero />} />
            <Route path="brands" element={<ManageBrands />} />
            <Route path="payments" element={<ManagePayments />} />
            <Route path="payments-manager" element={<PaymentManager />} />
            <Route path="shipping" element={<ManageShipping />} />
            <Route path="promo-codes" element={<ManagePromoCodes />} />
            <Route path="affiliates" element={<ManageAffiliates />} />
            <Route path="affiliates/:id" element={<AdminAffiliateDetails />} />
            <Route path="settings" element={<ManageSettings />} />
            <Route path="policies" element={<ManagePolicies />} />
          </Route>
        </Routes>
      </SettingsProvider>
    </Router>
  )
}

export default App
