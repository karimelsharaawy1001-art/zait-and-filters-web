// app/admin/wallets/page.tsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Wallet, Search, RefreshCw, Plus, Minus, Eye,
  X, CheckCircle, AlertCircle, ArrowUpRight, ArrowDownRight,
  User, Phone, TrendingUp, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight
} from 'lucide-react';

interface WalletRow {
  user_id: string;
  balance: number;
  full_name: string;
  phone_number: string;
  email: string;
}

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string;
  admin_note: string | null;
  created_at: string;
  balance_after: number | null;
}

const TX_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  cashback:   { label: 'كاش باك',    color: '#16a34a', bg: '#f0fdf4' },
  adjustment: { label: 'تعديل يدوي', color: '#0284c7', bg: '#eff6ff' },
  deduction:  { label: 'خصم',        color: '#16a34a', bg: '#f0fdf4' },
  redemption: { label: 'استخدام',    color: '#7c3aed', bg: '#f5f3ff' },
  refund:     { label: 'استرجاع',    color: '#d97706', bg: '#fffbeb' },
};

const ITEMS_PER_PAGE = 15;

// ── Statement Modal ───────────────────────────────────────────────────────────
function StatementModal({ wallet, onClose }: { wallet: WalletRow; onClose: () => void }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/wallets?user_id=${wallet.user_id}`)
      .then(r => r.json())
      .then(d => { setTransactions(d.transactions || []); setLoading(false); });
  }, [wallet.user_id]);

  const total_credit = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const total_debit  = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '680px', maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.2)', direction: 'rtl' }}>

        {/* Header */}
        <div style={{ padding: '22px 26px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', color: '#0f172a' }}>
                كشف حساب المحفظة
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: '#475569', fontWeight: '700' }}>
                  <User size={13} /> {wallet.full_name}
                </div>
                {wallet.phone_number !== '—' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: '#475569', fontWeight: '700' }}>
                    <Phone size={13} /> {wallet.phone_number}
                  </div>
                )}
              </div>
            </div>
            <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', flexShrink: 0 }}>
              <X size={16} />
            </button>
          </div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px', marginTop: '16px' }}>
            {[
              { label: 'الرصيد الحالي', value: `${wallet.balance.toFixed(2)} ج.م`, color: '#0f172a', bg: '#f8fafc', border: '#e2e8f0' },
              { label: 'إجمالي الإضافات', value: `+${total_credit.toFixed(2)} ج.م`, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
              { label: 'إجمالي الخصومات', value: `-${total_debit.toFixed(2)} ج.م`, color: '#16a34a', bg: '#f0fdf4', border: '#dcfce7' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '12px', padding: '10px 14px' }}>
                <div style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: '700', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '1rem', fontWeight: '900', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 26px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 10px' }} />
              جاري التحميل...
            </div>
          ) : transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#374151' }}>
              <Wallet size={36} strokeWidth={1} style={{ display: 'block', margin: '0 auto 10px' }} />
              <p style={{ fontWeight: '700' }}>لا توجد حركات في المحفظة</p>
            </div>
          ) : transactions.map(tx => {
            const cfg = TX_TYPE_CONFIG[tx.type] || { label: tx.type, color: '#475569', bg: '#f8fafc' };
            const isCredit = tx.amount > 0;
            return (
              <div key={tx.id} style={{ display: 'flex', gap: '12px', padding: '12px 0', borderBottom: '1px solid #f8fafc', alignItems: 'flex-start' }}>
                {/* Icon */}
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                  {isCredit
                    ? <ArrowUpRight size={16} color={cfg.color} />
                    : <ArrowDownRight size={16} color={cfg.color} />}
                </div>
                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#0f172a' }}>{tx.description}</div>
                      {tx.admin_note && (
                        <div style={{ fontSize: '0.74rem', color: '#6b7280', marginTop: '2px', fontWeight: '600' }}>
                          ملاحظة: {tx.admin_note}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: '800', padding: '2px 8px', borderRadius: '6px', background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                          {new Date(tx.created_at).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {' · '}
                          {new Date(tx.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                        {tx.balance_after !== null && (
                          <span style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: '600' }}>
                            الرصيد بعدها: {tx.balance_after.toFixed(2)} ج.م
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: '900', color: isCredit ? '#16a34a' : '#16a34a', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {isCredit ? '+' : ''}{tx.amount.toFixed(2)} ج.م
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: '14px 26px', borderTop: '1px solid #f1f5f9' }}>
          <button onClick={onClose} style={{ width: '100%', padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', color: '#475569' }}>إغلاق</button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Edit Balance Modal ────────────────────────────────────────────────────────
function EditBalanceModal({ wallet, onClose, onSuccess }: { wallet: WalletRow; onClose: () => void; onSuccess: () => void }) {
  const [mode, setMode] = useState<'add' | 'deduct'>('add');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('adjustment');
  const [description, setDescription] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const txTypes = [
    { value: 'cashback',   label: 'كاش باك' },
    { value: 'adjustment', label: 'تعديل يدوي' },
    { value: 'refund',     label: 'استرجاع' },
    { value: 'deduction',  label: 'خصم' },
    { value: 'redemption', label: 'استخدام' },
  ];

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) return toast.error('أدخل مبلغاً صحيحاً');
    if (!description.trim()) return toast.error('السبب مطلوب');

    const finalAmount = mode === 'deduct' ? -Math.abs(amt) : Math.abs(amt);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: wallet.user_id,
          amount: finalAmount,
          type: mode === 'deduct' ? 'deduction' : type,
          description: description.trim(),
          admin_note: adminNote.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل التعديل');
      toast.success(`تم ${mode === 'add' ? 'إضافة' : 'خصم'} ${amt.toFixed(2)} ج.م ✅`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const newBalance = Math.max(0, wallet.balance + (parseFloat(amount) || 0) * (mode === 'deduct' ? -1 : 1));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '480px', boxShadow: '0 25px 60px rgba(0,0,0,0.2)', direction: 'rtl', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '22px 26px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '900', color: '#0f172a' }}>تعديل رصيد المحفظة</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#6b7280', fontWeight: '600' }}>{wallet.full_name}</p>
            </div>
            <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
              <X size={16} />
            </button>
          </div>
          {/* Current balance pill */}
          <div style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '8px 14px' }}>
            <Wallet size={15} color="#16a34a" />
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#15803d' }}>الرصيد الحالي:</span>
            <span style={{ fontSize: '1rem', fontWeight: '900', color: '#14532d' }}>{wallet.balance.toFixed(2)} ج.م</span>
          </div>
        </div>

        <div style={{ padding: '20px 26px' }}>
          {/* Add / Deduct toggle */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
            <button onClick={() => setMode('add')} style={{ flex: 1, padding: '11px', borderRadius: '12px', border: mode === 'add' ? 'none' : '1.5px solid #e2e8f0', background: mode === 'add' ? 'linear-gradient(135deg, #16a34a, #15803d)' : '#fff', color: mode === 'add' ? '#fff' : '#6b7280', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', fontFamily: 'inherit' }}>
              <Plus size={16} /> إضافة رصيد
            </button>
            <button onClick={() => setMode('deduct')} style={{ flex: 1, padding: '11px', borderRadius: '12px', border: mode === 'deduct' ? 'none' : '1.5px solid #e2e8f0', background: mode === 'deduct' ? 'linear-gradient(135deg, #16a34a, #15803d)' : '#fff', color: mode === 'deduct' ? '#fff' : '#6b7280', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', fontFamily: 'inherit' }}>
              <Minus size={16} /> خصم رصيد
            </button>
          </div>

          {/* Amount input */}
          <div style={{ marginBottom: '14px' }}>
            <label style={lbl}>المبلغ (ج.م) *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="number" min="0.01" step="0.01"
                value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                style={{ ...inp, paddingLeft: '50px', fontSize: '1.1rem', fontWeight: '800', color: mode === 'add' ? '#16a34a' : '#16a34a' }}
              />
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', fontWeight: '700', color: '#6b7280' }}>ج.م</span>
            </div>
          </div>

          {/* Type — only shown for credits */}
          {mode === 'add' && (
            <div style={{ marginBottom: '14px' }}>
              <label style={lbl}>نوع الحركة *</label>
              <select value={type} onChange={e => setType(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                {txTypes.filter(t => t.value !== 'deduction' && t.value !== 'redemption').map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div style={{ marginBottom: '14px' }}>
            <label style={lbl}>السبب / الوصف *</label>
            <input
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder={mode === 'add' ? 'مثال: كاش باك على طلب #1234' : 'مثال: تصحيح خطأ في الرصيد'}
              style={inp}
            />
          </div>

          {/* Admin note */}
          <div style={{ marginBottom: '20px' }}>
            <label style={lbl}>ملاحظة داخلية (اختياري)</label>
            <input
              value={adminNote} onChange={e => setAdminNote(e.target.value)}
              placeholder="ملاحظة للأدمن فقط — لا تظهر للعميل"
              style={inp}
            />
          </div>

          {/* Preview new balance */}
          {amount && !isNaN(parseFloat(amount)) && (
            <div style={{ marginBottom: '18px', background: mode === 'add' ? '#f0fdf4' : '#f0fdf4', border: `1px solid ${mode === 'add' ? '#bbf7d0' : '#dcfce7'}`, borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: mode === 'add' ? '#15803d' : '#16a34a' }}>الرصيد بعد التعديل:</span>
              <span style={{ fontSize: '1.1rem', fontWeight: '900', color: mode === 'add' ? '#14532d' : '#14532d' }}>{newBalance.toFixed(2)} ج.م</span>
            </div>
          )}

          {/* Submit */}
          <button onClick={handleSubmit} disabled={submitting} style={{ width: '100%', padding: '14px', background: mode === 'add' ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', border: 'none', borderRadius: '13px', fontWeight: '900', fontSize: '0.95rem', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'inherit', transition: 'all 0.15s' }}>
            {submitting ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : mode === 'add' ? <Plus size={16} /> : <Minus size={16} />}
            {submitting ? 'جاري التنفيذ...' : mode === 'add' ? 'تأكيد الإضافة' : 'تأكيد الخصم'}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const lbl: React.CSSProperties = { display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#374151', marginBottom: '6px' };
const inp: React.CSSProperties = { width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: '11px', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', color: '#0f172a', background: '#fff', boxSizing: 'border-box' };

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminWalletsPage() {
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<WalletRow | null>(null);
  const [modalMode, setModalMode] = useState<'statement' | 'edit' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchWallets = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/wallets${q ? `?search=${encodeURIComponent(q)}` : ''}`);
      const data = await res.json();
      setWallets(data.wallets || []);
    } catch (err: any) {
      toast.error('خطأ في جلب البيانات: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWallets(); }, [fetchWallets]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { fetchWallets(search); setCurrentPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search, fetchWallets]);

  const openModal = (wallet: WalletRow, mode: 'statement' | 'edit') => {
    setSelectedWallet(wallet);
    setModalMode(mode);
  };
  const closeModal = () => { setSelectedWallet(null); setModalMode(null); };

  // Pagination
  const totalPages = Math.ceil(wallets.length / ITEMS_PER_PAGE);
  const paginated = wallets.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Stats
  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);
  const activeWallets = wallets.filter(w => w.balance > 0).length;

  return (
    <div style={{ direction: 'rtl', fontFamily: "'Cairo', sans-serif", color: '#1e293b' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .wlt-row { transition: background 0.12s; }
        .wlt-row:hover { background: #f8fafc !important; }
        .wlt-btn { transition: all 0.12s; border: none; cursor: pointer; font-family: 'Cairo', sans-serif; font-weight: 700; display: inline-flex; align-items: center; gap: 5px; border-radius: 9px; }
        .wlt-btn:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }

        @media (max-width: 768px) {
          .wlt-stats-grid { grid-template-columns: repeat(2,1fr) !important; }
          .wlt-table-wrap { overflow-x: auto; }
          .wlt-search-row { flex-direction: column !important; gap: 10px !important; }
          .wlt-search-row > div:first-child { width: 100% !important; }
        }
      `}</style>

      {/* Modals */}
      {selectedWallet && modalMode === 'statement' && (
        <StatementModal wallet={selectedWallet} onClose={closeModal} />
      )}
      {selectedWallet && modalMode === 'edit' && (
        <EditBalanceModal wallet={selectedWallet} onClose={closeModal} onSuccess={() => fetchWallets(search)} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '900', margin: 0, color: '#0f172a' }}>محافظ العملاء</h1>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '3px 0 0', fontWeight: '600' }}>إدارة أرصدة الكاش باك وكشوف الحساب</p>
        </div>
        <button onClick={() => fetchWallets(search)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '9px', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem', fontFamily: "'Cairo', sans-serif" }}>
          <RefreshCw size={14} /> تحديث
        </button>
      </div>

      {/* Stats */}
      <div className="wlt-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'إجمالي المحافظ', value: wallets.length, icon: <Wallet size={16} />, color: '#0f172a', light: '#f1f5f9', border: '#e2e8f0' },
          { label: 'محافظ نشطة (> 0)', value: activeWallets, icon: <CheckCircle size={16} />, color: '#16a34a', light: '#f0fdf4', border: '#bbf7d0' },
          { label: 'إجمالي الأرصدة', value: `${totalBalance.toFixed(2)} ج.م`, icon: <TrendingUp size={16} />, color: '#0284c7', light: '#eff6ff', border: '#bae6fd' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.light, border: `1px solid ${s.border}`, borderRadius: '14px', padding: '14px 16px', animation: `fadeUp 0.3s ease ${i*0.05}s both` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: '700' }}>{s.label}</span>
              <div style={{ color: s.color }}>{s.icon}</div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: s.color, letterSpacing: '-0.5px' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="wlt-search-row" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', background: '#fff', borderRadius: '14px', padding: '12px 16px', border: '1px solid #f1f5f9' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', borderRadius: '10px', padding: '9px 13px' }}>
          <Search size={15} color="#374151" />
          <input
            type="text"
            placeholder="بحث بالاسم أو رقم الموبايل أو الإيميل..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', color: '#334155', fontFamily: "'Cairo', sans-serif" }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0, display: 'flex' }}>
              <X size={14} />
            </button>
          )}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: '600', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {wallets.length} محفظة
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 12px' }} />
          جاري التحميل...
        </div>
      ) : wallets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#374151', background: '#fff', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
          <Wallet size={44} strokeWidth={1} style={{ display: 'block', margin: '0 auto 12px' }} />
          <p style={{ fontWeight: '700' }}>لا توجد محافظ</p>
        </div>
      ) : (
        <>
          <div className="wlt-table-wrap" style={{ background: '#fff', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 1px 8px rgba(0,0,0,0.04)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
            {/* Inner wrapper forces min-width so the grid scrolls on mobile */}
            <div style={{ minWidth: '520px' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 1.2fr 1fr 1.4fr', padding: '10px 18px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              {['العميل', 'الموبايل', 'الإيميل', 'الرصيد', 'إجراءات'].map((h, i) => (
                <div key={i} style={{ fontSize: '0.72rem', fontWeight: '800', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', paddingRight: i > 0 ? '8px' : 0 }}>{h}</div>
              ))}
            </div>

            {paginated.map((wallet, idx) => (
              <div key={wallet.user_id} className="wlt-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 1.2fr 1fr 1.4fr', padding: '13px 18px', borderBottom: '1px solid #f8fafc', alignItems: 'center', animation: `fadeUp 0.2s ease ${idx*0.02}s both` }}>

                {/* Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: wallet.balance > 0 ? '#f0fdf4' : '#f8fafc', border: `1px solid ${wallet.balance > 0 ? '#bbf7d0' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={15} color={wallet.balance > 0 ? '#16a34a' : '#6b7280'} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>{wallet.full_name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: '600', marginTop: '1px' }}>
                      {wallet.balance > 0 ? <span style={{ color: '#16a34a', fontWeight: '700' }}>● نشط</span> : <span>● فارغة</span>}
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600', paddingRight: '8px', direction: 'ltr', textAlign: 'right' }}>
                  {wallet.phone_number}
                </div>

                {/* Email */}
                <div style={{ fontSize: '0.78rem', color: '#6b7280', paddingRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {wallet.email}
                </div>

                {/* Balance */}
                <div style={{ paddingRight: '8px' }}>
                  <div style={{ fontSize: '1rem', fontWeight: '900', color: wallet.balance > 0 ? '#15803d' : '#6b7280' }}>
                    {wallet.balance.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: '600' }}>ج.م</div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px', paddingRight: '8px', flexWrap: 'wrap' }}>
                  <button onClick={() => openModal(wallet, 'statement')} className="wlt-btn" style={{ padding: '7px 12px', background: '#eff6ff', color: '#0284c7', fontSize: '0.78rem' }} title="كشف الحساب">
                    <Eye size={13} /> كشف
                  </button>
                  <button onClick={() => openModal(wallet, 'edit')} className="wlt-btn" style={{ padding: '7px 12px', background: '#f0fdf4', color: '#16a34a', fontSize: '0.78rem' }} title="تعديل الرصيد">
                    <Plus size={13} /> تعديل
                  </button>
                </div>
              </div>
            ))}
            </div>{/* end minWidth wrapper */}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginTop: '14px', padding: '12px 18px', background: '#fff', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '0.82rem', color: '#6b7280', fontWeight: '600' }}>
                عرض {(currentPage-1)*ITEMS_PER_PAGE+1}–{Math.min(currentPage*ITEMS_PER_PAGE, wallets.length)} من {wallets.length}
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {[
                  { icon: <ChevronsRight size={13} />, action: () => setCurrentPage(1),          disabled: currentPage === 1 },
                  { icon: <ChevronRight size={13} />,  action: () => setCurrentPage(p => p-1),   disabled: currentPage === 1 },
                  { icon: <ChevronLeft size={13} />,   action: () => setCurrentPage(p => p+1),   disabled: currentPage === totalPages },
                  { icon: <ChevronsLeft size={13} />,  action: () => setCurrentPage(totalPages), disabled: currentPage === totalPages },
                ].map((btn, i) => (
                  <button key={i} onClick={btn.action} disabled={btn.disabled} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '1px solid #e2e8f0', background: btn.disabled ? '#f8fafc' : '#fff', color: btn.disabled ? '#374151' : '#475569', cursor: btn.disabled ? 'not-allowed' : 'pointer' }}>
                    {btn.icon}
                  </button>
                ))}
                <span style={{ fontSize: '0.8rem', color: '#6b7280', padding: '0 8px', fontWeight: '600' }}>
                  {currentPage} / {totalPages}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}