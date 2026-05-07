import { useState } from 'react';
import { useAuth, useToast } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
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

type Page = 'dashboard' | 'users' | 'clients' | 'providers' | 'products' | 'orders' | 'shopping-lists' | 'purchase-orders' | 'invoices' | 'audit-log';

const PAGE_META: Record<Page, { title: string; sub: string }> = {
  dashboard:       { title: 'Dashboard',          sub: 'Overview and quick access' },
  users:           { title: 'User management',    sub: 'Create, edit and deactivate accounts' },
  clients:         { title: 'Client management',  sub: 'Create, edit and deactivate clients' },
  providers:       { title: 'Provider management', sub: 'Create, edit and deactivate providers' },
  products:        { title: 'Product management', sub: 'Create, edit and manage product catalog' },
  orders:          { title: 'Orders',             sub: 'Create and manage customer orders' },
  'shopping-lists':  { title: 'Shopping lists',    sub: 'Aggregate confirmed orders and prepare daily procurement' },
  'purchase-orders': { title: 'Purchase orders',   sub: 'Track and manage supplier purchase orders' },
  'invoices':        { title: 'Invoices',           sub: 'View and manage client invoices' },
  'audit-log':       { title: 'Audit log',         sub: 'Track every action performed in the system' },
};

function isPage(value: string): value is Page {
  return ['dashboard', 'users', 'clients', 'providers', 'products', 'orders', 'shopping-lists', 'purchase-orders', 'invoices', 'audit-log'].includes(value);
}

export default function App() {
  const { user, authed, loading, login, logout } = useAuth();
  const { toasts, add: toast } = useToast();
  const [page, setPage] = useState<Page>('dashboard');

  // Still resolving token → show nothing (avoids flash)
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
  const meta = PAGE_META[safePage];

  return (
    <>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar
          page={safePage}
          setPage={(p) => setPage(isPage(p) ? p : 'dashboard')}
          user={user}
          onLogout={logout}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'auto' }}>
          {/* Topbar */}
          <div style={{
            padding: '20px 32px', borderBottom: '1px solid var(--border)',
            position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10,
          }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{meta.title}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, fontFamily: 'var(--mono)' }}>{meta.sub}</div>
          </div>

          {/* Page content */}
          <div style={{ padding: '28px 32px', flex: 1 }}>
            {safePage === 'dashboard' && <Dashboard user={user} />}
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

      <Toast toasts={toasts} />
    </>
  );
}