import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Outlet, useSearchParams } from 'react-router-dom';
import { safeLocalStorage } from './utils/safeStorage';
import { Toaster, toast, resolveValue } from 'react-hot-toast';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
// Header components (Non-lazy)
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import GarageActiveIndicator from './components/GarageActiveIndicator';
import ScrollToTop from './components/ScrollToTop';
import ChatWidget from './components/ChatWidget';
import { StaticDataProvider } from './context/StaticDataContext';
import { SettingsProvider } from './context/SettingsContext';
import ErrorBoundary from './components/ErrorBoundary';
import PageLoader from './components/PageLoader';
import ProtectedRoute from './components/ProtectedRoute';
import UserProtectedRoute from './components/UserProtectedRoute';
import AffiliateProtectedRoute from './components/AffiliateProtectedRoute';

// Lazy Load Layouts
const AdminLayout = React.lazy(() => import('./components/AdminLayout'));

// Lazy Load Public Pages
const Home = React.lazy(() => import('./pages/Home'));
const ShopPage = React.lazy(() => import('./pages/ShopPage'));
const CategoryPage = React.lazy(() => import('./pages/CategoryPage'));
const BrandPage = React.lazy(() => import('./pages/BrandPage'));
const ProductDetails = React.lazy(() => import('./pages/ProductDetails'));
const CartPage = React.lazy(() => import('./pages/CartPage'));
const Checkout = React.lazy(() => import('./pages/Checkout'));
const ContactUs = React.lazy(() => import('./pages/ContactUs'));
const PolicyPage = React.lazy(() => import('./pages/PolicyPage'));
const OrderHistory = React.lazy(() => import('./pages/OrderHistory'));
const OilAdvisor = React.lazy(() => import('./pages/OilAdvisor'));
const OrderSuccess = React.lazy(() => import('./pages/OrderSuccess'));
const RecoverCart = React.lazy(() => import('./pages/RecoverCart'));
const BlogListPage = React.lazy(() => import('./pages/BlogListPage'));
const BlogPostPage = React.lazy(() => import('./pages/BlogPostPage'));
const Login = React.lazy(() => import('./pages/Login'));
const Signup = React.lazy(() => import('./pages/Signup'));
const Profile = React.lazy(() => import('./pages/Profile'));
const AffiliateDashboard = React.lazy(() => import('./pages/AffiliateDashboard'));
const AffiliateRegister = React.lazy(() => import('./pages/AffiliateRegister'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const InvoiceViewer = React.lazy(() => import('./pages/InvoiceViewer'));

// Lazy Load Admin Pages
const AdminLogin = React.lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const AdminOrders = React.lazy(() => import('./pages/AdminOrders'));
const ManageCategories = React.lazy(() => import('./pages/admin/ManageCategories'));
const ManageCustomers = React.lazy(() => import('./pages/admin/ManageCustomers'));
const AbandonedCarts = React.lazy(() => import('./pages/admin/AbandonedCarts'));
const ManageCars = React.lazy(() => import('./pages/admin/ManageCars'));
const AdminCarSpecs = React.lazy(() => import('./pages/admin/AdminCarSpecs'));
const ManageProducts = React.lazy(() => import('./pages/admin/ManageProducts'));
const AddProduct = React.lazy(() => import('./pages/admin/AddProduct'));
const EditProduct = React.lazy(() => import('./pages/admin/EditProduct'));
const EditCategory = React.lazy(() => import('./pages/admin/EditCategory'));
const EditCar = React.lazy(() => import('./pages/admin/EditCar'));
const OrderDetails = React.lazy(() => import('./pages/admin/OrderDetails'));
const ManageHero = React.lazy(() => import('./pages/admin/ManageHero'));
const ManageBrands = React.lazy(() => import('./pages/admin/ManageBrands'));
const PaymentMethods = React.lazy(() => import('./pages/admin/PaymentMethods'));
const ManageShipping = React.lazy(() => import('./pages/admin/ManageShipping'));
const ManagePromoCodes = React.lazy(() => import('./pages/admin/ManagePromoCodes'));
const PaymentManager = React.lazy(() => import('./pages/admin/PaymentManager'));
const ManageSettings = React.lazy(() => import('./pages/admin/ManageSettings'));
const ManageAffiliates = React.lazy(() => import('./pages/admin/ManageAffiliates'));
const AdminManagement = React.lazy(() => import('./pages/admin/AdminManagement'));
const AdminAffiliateDetails = React.lazy(() => import('./pages/admin/AdminAffiliateDetails'));
const ManagePolicies = React.lazy(() => import('./pages/admin/ManagePolicies'));
const AdminReviews = React.lazy(() => import('./pages/admin/AdminReviews'));
const AdminMessages = React.lazy(() => import('./pages/admin/AdminMessages'));
const ManageBlog = React.lazy(() => import('./pages/admin/ManageBlog'));
const AddEditBlog = React.lazy(() => import('./pages/admin/AddEditBlog'));

// Lazy Load Integration Pages
const Integrations = React.lazy(() => import('./pages/admin/Integrations'));
const GoogleSearchConsole = React.lazy(() => import('./pages/admin/GoogleSearchConsole'));
const FacebookPixel = React.lazy(() => import('./pages/admin/FacebookPixel'));
const GoogleAnalytics = React.lazy(() => import('./pages/admin/GoogleAnalytics'));
const Mailchimp = React.lazy(() => import('./pages/admin/Mailchimp'));
const GoogleMerchantCenter = React.lazy(() => import('./pages/admin/GoogleMerchantCenter'));
const FacebookInstagramShopping = React.lazy(() => import('./pages/admin/FacebookInstagramShopping'));
const InstallmentPartners = React.lazy(() => import('./pages/admin/InstallmentPartners'));
const CloudinarySettings = React.lazy(() => import('./pages/admin/CloudinarySettings'));
const SendGridSettings = React.lazy(() => import('./pages/admin/SendGridSettings'));

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
          reverseOrder={false}
          toastOptions={{
            duration: 5000,
          }}
          containerStyle={{
            top: 40,
            zIndex: 99999
          }}
        >
          {(t) => (
            <div
              className={`${t.visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                } max-w-md w-full backdrop-blur-xl bg-white/95 border border-white/20 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] rounded-[1.5rem] pointer-events-auto flex items-center p-3.5 transition-all duration-300 ease-out font-Cairo`}
              style={{
                direction: i18n.language === 'ar' ? 'rtl' : 'ltr'
              }}
            >
              <div className="flex-1 flex items-center gap-3.5 min-w-0">
                <div className="flex-shrink-0">
                  {t.type === 'loading' ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#28B463] border-t-transparent" />
                  ) : (
                    <div className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-transform hover:rotate-12 ${t.type === 'success' ? 'bg-[#28B463]/10 text-[#28B463]' : t.type === 'error' ? 'bg-[#EF4444]/10 text-[#EF4444]' : 'bg-gray-100 text-gray-400'}`}>
                      {t.type === 'success' ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : t.type === 'error' ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-current" />
                      )}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-black text-gray-900 leading-tight truncate-2-lines">
                    {resolveValue(t.message, t)}
                  </p>
                </div>
              </div>

              <div className={`flex items-center ${i18n.language === 'ar' ? 'mr-4 border-r pr-4' : 'ml-4 border-l pl-4'} border-gray-100/50`}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.dismiss(t.id);
                  }}
                  className="p-2.5 rounded-xl hover:bg-gray-50 text-gray-300 hover:text-red-500 transition-all duration-200 active:scale-90 group"
                  aria-label="Close"
                >
                  <X className="h-4.5 w-4.5 stroke-[3px] group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>
            </div>
          )}
        </Toaster>
        <div className="sticky top-0 z-[110] w-full bg-white shadow-sm">
          <Navbar />
          <GarageActiveIndicator />
        </div>
        <main key={location.pathname} className="flex-1 w-full overflow-x-hidden">
          <Outlet />
        </main>
        <Footer />
        <ChatWidget />
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

// Initialize Global Safety Flag
if (typeof window !== 'undefined') {
  window.isPureStateMode = false;

  // Global Listener for SecurityErrors (The Final Shield)
  window.addEventListener('error', (event) => {
    if (event.error?.name === 'SecurityError' || event.message?.includes('SecurityError')) {
      console.warn('⚠️ PROACTIVE SECURITY SHIELD: High-restriction environment detected. Activating Pure State Mode.');
      window.isPureStateMode = true;
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.name === 'SecurityError' || event.reason?.message?.includes('SecurityError')) {
      console.warn('⚠️ PROACTIVE SECURITY SHIELD: Async Security Error detected. Activating Pure State Mode.');
      window.isPureStateMode = true;
    }
  });
}

function App() {
  return (
    <Router>
      <ReferralTracker />
      <ScrollToTop />
      <StaticDataProvider>
        <SettingsProvider>
          <ErrorBoundary>
            <React.Suspense fallback={<PageLoader />}>
              <Routes>
                {/* 1. Standalone Routes (No Layout) */}
                <Route path="/print-invoice/:id" element={<InvoiceViewer />} />

                {/* 2. Admin Logic (Highest Priority) */}
                <Route path="/admin/login" element={<AdminLogin />} />
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
                  <Route path="customers" element={<ManageCustomers />} />
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
                  <Route path="payment-methods" element={<PaymentMethods />} />
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
                  <Route path="blog" element={<ManageBlog />} />
                  <Route path="blog/new" element={<AddEditBlog />} />
                  <Route path="blog/edit/:id" element={<AddEditBlog />} />
                  <Route path="settings" element={<ManageSettings />} />
                  <Route path="policies" element={<ManagePolicies />} />
                </Route>

                {/* 3. Public Routes */}
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

                {/* 4. Catch-all 404 Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </React.Suspense>
          </ErrorBoundary>
        </SettingsProvider>
      </StaticDataProvider>
    </Router >
  )
}

export default App
