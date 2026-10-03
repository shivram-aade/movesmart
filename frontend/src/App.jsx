import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Login, Signup, Forgot, Reset } from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import Notifications from './pages/Notifications';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import RoutesPage from './pages/RoutesPage';
import Live from './pages/Live';
import { About, Services, Contact, Faq, Legal, Soon } from './pages/Pages';

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function Protected({ children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (user === undefined) return <p className="empty">Loading...</p>;
  return user ? children : <Navigate to="/login" state={{ from: loc.pathname }} replace />;
}

export default function App() {
  return (
    <>
      <ScrollTop />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/live" element={<Live />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/privacy" element={<Legal kind="privacy" />} />
          <Route path="/terms" element={<Legal kind="terms" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot" element={<Forgot />} />
          <Route path="/reset" element={<Reset />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/tickets" element={<Protected><Tickets /></Protected>} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<Soon title="Page not found" />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
