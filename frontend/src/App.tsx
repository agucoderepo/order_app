import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth, useToast } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import LanguageSwitcher from './components/LanguageSwitcher';
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Users from './pages/Users.tsx';
import Clients from './pages/Clients.tsx';
import Providers from './pages/Providers.tsx';
import Products from './pages/Products.tsx';
import Orders from './pages/Orders.tsx';
import ShoppingLists from './pages/ShoppingLists.tsx';
import PurchaseOrders from './pages/PurchaseOrders.tsx';
import Invoices from './pages/Invoices.tsx';
import AuditLog from './pages/AuditLog.tsx';
import './styles/globals.css';
import type { TFunction } from 'i18next';

type Page = 'dashboard' | 'users' | 'clients' | 'providers' | 'products' | 'orders' | 'shopping-lists' | 'purchase-orders' | 'invoices' | 'audit-log';

function getPageMeta(t: TFunction): Record<Page, { title: string; sub: string }> {
  return {
    dashboard:         { title: t('page_meta.dashboard_title'),       sub: t('page_meta.dashboard_sub') },
    users:             { title: t('page_meta.users_title'),           sub: t('page_meta.users_sub') },
    clients:           { title: t('page_meta.clients_title'),         sub: t('page_meta.clients_sub') },
    providers:         { title: t('page_meta.providers_title'),       sub: t('page_meta.providers_sub') },
    products:          { title: t('page_meta.products_title'),        sub: t('page_meta.products_sub') },
    orders:            { title: t('page_meta.orders_title'),          sub: t('page_meta.orders_sub') },
    'shopping-lists':  { title: t('page_meta.shopping_lists_title'),  sub: t('page_meta.shopping_lists_sub') },
    'purchase-orders': { title: t('page_meta.purchase_orders_title'), sub: t('page_meta.purchase_orders_sub') },
    'invoices':        { title: t('page_meta.invoices_title'),        sub: t('page_meta.invoices_sub') },
    'audit-log':       { title: t('page_meta.audit_log_title'),       sub: t('page_meta.audit_log_sub') },
  };
}

function isPage(value: string): value is Page {
  return ['dashboard', 'users', 'clients', 'providers', 'products', 'orders', 'shopping-lists', 'purchase-orders', 'invoices', 'audit-log'].includes(value);
}

export default function App() {
  const { t } = useTranslation();
  const { user, authed, loading, login, logout } = useAuth();
  const { toasts, add: toast } = useToast();
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" />
      </div>
    );
  }

  if (!authed) {
    return (
      <>
        <Login onLogin={login} />
        <Toast toasts={toasts} />
      </>
    );
  }

  const safePage: Page = isPage(page) ? page : 'dashboard';
  const meta = getPageMeta(t)[safePage];

  return (
    <>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar
          page={safePage}
          setPage={(p) => { setPage(isPage(p) ? p : 'dashboard'); setSidebarOpen(false); }}
          user={user}
          onLogout={logout}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'auto' }}>
          {/* Topbar */}
          <div className="topbar" style={{
            padding: '20px 32px', borderBottom: '1px solid var(--border)',
            position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <button
              className="topbar-hamburger"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >☰</button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{meta.title}</div>
              <div className="topbar-sub" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, fontFamily: 'var(--mono)' }}>{meta.sub}</div>
            </div>
            <LanguageSwitcher />
          </div>

          {/* Page content */}
          <div className="page-content" style={{ padding: '28px 32px', flex: 1 }}>
            {safePage === 'dashboard' && <Dashboard user={user} setPage={(p) => setPage(isPage(p) ? p : 'dashboard')} />}
            {safePage === 'users'     && <Users currentUser={user} toast={toast} />}
            {safePage === 'clients'   && <Clients toast={toast} />}
            {safePage === 'providers' && <Providers toast={toast} />}
            {safePage === 'products'  && <Products toast={toast} />}
            {safePage === 'orders'         && <Orders toast={toast} />}
            {safePage === 'shopping-lists'  && <ShoppingLists toast={toast} />}
            {safePage === 'purchase-orders' && <PurchaseOrders toast={toast} />}
            {safePage === 'invoices'        && <Invoices toast={toast} />}
            {safePage === 'audit-log'       && <AuditLog toast={toast} />}
          </div>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' sidebar-open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Toast toasts={toasts} />
    </>
  );
}
