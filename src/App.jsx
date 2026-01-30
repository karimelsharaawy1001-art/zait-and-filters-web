import React from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { safeLocalStorage } from './utils/safeStorage';
import { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Navbar from './components/Navbar';
import GarageActiveIndicator from './components/GarageActiveIndicator';
import ScrollToTop from './components/ScrollToTop';
import Hero from './components/Hero';
import ProductGrid from './components/ProductGrid';
import CartPage from './pages/CartPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Checkout from './pages/Checkout';
import AdminOrders from './pages/AdminOrders';
import ManageCategories from './pages/admin/ManageCategories';
import AbandonedCarts from './pages/admin/AbandonedCarts';
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
import AdminManagement from './pages/admin/AdminManagement';
import AdminAffiliateDetails from './pages/admin/AdminAffiliateDetails';
import ManagePolicies from './pages/admin/ManagePolicies';
import Integrations from './pages/admin/Integrations';
import GoogleSearchConsole from './pages/admin/GoogleSearchConsole';
import FacebookPixel from './pages/admin/FacebookPixel';
import GoogleAnalytics from './pages/admin/GoogleAnalytics';
import Mailchimp from './pages/admin/Mailchimp';
import GoogleMerchantCenter from './pages/admin/GoogleMerchantCenter';
import FacebookInstagramShopping from './pages/admin/FacebookInstagramShopping';
import InstallmentPartners from './pages/admin/InstallmentPartners';
import CloudinarySettings from './pages/admin/CloudinarySettings';
import SendGridSettings from './pages/admin/SendGridSettings';
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
import RecoverCart from './pages/RecoverCart';
import CategoryPage from './pages/CategoryPage';
import BrandPage from './pages/BrandPage';
import BlogListPage from './pages/BlogListPage';
import BlogPostPage from './pages/BlogPostPage';
import ManageBlog from './pages/admin/ManageBlog';
import AddEditBlog from './pages/admin/AddEditBlog';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import UserProtectedRoute from './components/UserProtectedRoute';
import AffiliateProtectedRoute from './components/AffiliateProtectedRoute';
import { SettingsProvider } from './context/SettingsContext';
import { Outlet, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import ErrorBoundary from './components/ErrorBoundary';

const SafeModeUI = ({ error }) => (
  <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-center">
    <h1 className="text-2xl font-black text-red-600 mb-4">SAFE MODE ACTIVE</h1>
    <p className="text-gray-600 mb-6 max-w-md">
      We've detected a browser security restriction. The app is running in restricted mode to protect your data.
    </p>
    <button
      onClick={() => window.location.reload()}
      className="bg-[#28B463] text-white px-8 py-3 rounded-lg font-bold"
    >
      Retry Connection
    </button>
  </div>
);

const PublicLayout = () => {
  const { i18n } = useTranslation();
  const location = useLocation();

  try {
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
        <div className="sticky top-0 z-[100] bg-white">
          <Navbar />
          <GarageActiveIndicator />
        </div>
        <main key={location.pathname} className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    );
  } catch (error) {
    console.error("Critical Render Error:", error);
    return <SafeModeUI error={error} />;
  }
};

const ReferralTracker = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    try {
      const ref = searchParams.get('ref');
      if (ref) {
        console.log("Referral Code Detected:", ref);
        safeLocalStorage.setItem('affiliate_ref', ref);
      }
    } catch (e) {
      console.warn("Referral tracking failed in restricted environment");
    }
  }, [searchParams]);

  return null;
};

import { StaticDataProvider } from './context/StaticDataContext';

function App() {
  return (
    <Router>
      <ReferralTracker />
      <ScrollToTop />
      <StaticDataProvider>
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
          <ErrorBoundary>
            <Routes>
              {/* Public Routes */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/category/:id" element={<CategoryPage />} />
                <Route path="/brand/:brandName" element={<BrandPage />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/contact" element={<ContactUs />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/returns" element={<PolicyPage pageId="returns-policy" />} />
                <Route path="/shipping" element={<PolicyPage pageId="shipping-info" />} />
                <Route path="/my-orders" element={<OrderHistory />} />
                <Route path="/oil-advisor" element={<OilAdvisor />} />
                <Route path="/order-success" element={<OrderSuccess />} />
                <Route path="/recover-cart" element={<RecoverCart />} />
                <Route path="/blog" element={<BlogListPage />} />
                <Route path="/blog/:id" element={<BlogPostPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/marketers" element={<AffiliateRegister />} />
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
                <Route path="abandoned-carts" element={<AbandonedCarts />} />
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
                <Route path="management" element={<AdminManagement />} />
                <Route path="affiliates/:id" element={<AdminAffiliateDetails />} />
                <Route path="integrations" element={<Integrations />} />
                <Route path="integrations/google-search-console" element={<GoogleSearchConsole />} />
                <Route path="integrations/facebook-pixel" element={<FacebookPixel />} />
                <Route path="integrations/google-analytics" element={<GoogleAnalytics />} />
                <Route path="integrations/mailchimp" element={<Mailchimp />} />
                <Route path="integrations/google-merchant-center" element={<GoogleMerchantCenter />} />
                <Route path="integrations/facebook-instagram-shopping" element={<FacebookInstagramShopping />} />
                <Route path="integrations/installment-partners" element={<InstallmentPartners />} />
                <Route path="integrations/cloudinary" element={<CloudinarySettings />} />
                <Route path="integrations/sendgrid" element={<SendGridSettings />} />
                <Route path="/admin/blog" element={<ManageBlog />} />
                <Route path="/admin/blog/new" element={<AddEditBlog />} />
                <Route path="/admin/blog/edit/:id" element={<AddEditBlog />} />
                <Route path="settings" element={<ManageSettings />} />
                <Route path="policies" element={<ManagePolicies />} />
              </Route>

              {/* Catch-all 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </SettingsProvider>
      </StaticDataProvider>
    </Router>
  )
}

export default App
