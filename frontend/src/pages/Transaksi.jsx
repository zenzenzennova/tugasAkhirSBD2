import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";
import toast from "react-hot-toast";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatRupiah(n) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hour = String(d.getHours()).padStart(2, "0");
  const minute = String(d.getMinutes()).padStart(2, "0");
  const second = String(d.getSeconds()).padStart(2, "0");
  return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
}

// ─── Receipt Component ───────────────────────────────────────────────────────

function Receipt({ transaction, onClose }) {
  const t = transaction;
  if (!t) return null;

  const items = t.items || [];
  const subtotal = Number(t.subtotal_amount ?? t.subtotal ?? 0);
  const total = Number(t.total_amount ?? t.total ?? 0);
  const paid = Number(t.payment_amount ?? 0);
  const change = Number(t.change_amount ?? Math.max(0, paid - total));
  const transactionNumber = t.transaction_number || t.transaction_code || t.transaction_id || '—';

  const storeName = 'MIDNIGHT MERIDIAN';
  const storeAddress = 'Toko Jam Tangan Terpercaya | Jl. Karawaci No. 1, Tangerang';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-600 text-white px-6 py-4 text-center flex-shrink-0">
          <div className="text-xl font-bold tracking-wide uppercase">
            {storeName}
          </div>
          <div className="text-[11px] text-indigo-100 mt-1 leading-snug">
            {storeAddress}
          </div>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            🧾 Struk Transaksi
          </div>
          <div className="mt-3 space-y-1 text-xs text-indigo-100">
            <div>No. Transaksi: <span className="font-semibold text-white">{transactionNumber}</span></div>
            <div>Tanggal: <span className="font-semibold text-white">{t.created_at ? formatDateTime(t.created_at) : '—'}</span></div>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4 text-sm">
          {/* Customer */}
          {t.customer_name && (
            <div className="flex items-start justify-between gap-4 rounded-xl bg-gray-50 px-4 py-3">
              <span className="text-gray-500">Pelanggan</span>
              <span className="font-semibold text-gray-800 text-right">
                {t.customer_name}
              </span>
            </div>
          )}

          <div className="border-t border-dashed border-gray-300" />

          {/* Items */}
          <div className="space-y-3">
            <div className="grid grid-cols-[1.7fr_0.5fr_0.8fr_0.9fr] gap-2 text-[11px] font-bold uppercase tracking-wide text-gray-500 pb-2 border-b border-gray-200">
              <div>Produk</div>
              <div className="text-right">Qty</div>
              <div className="text-right">Harga</div>
              <div className="text-right">Subtotal</div>
            </div>
            {items.map((item, idx) => {
              const unitPrice = Number(item.unit_price ?? 0);
              const qty = Number(item.quantity ?? 1);
              const discPct = Number(
                item.discount_percent ?? item.item_discount_percent ?? 0,
              );
              const discountedUnit = unitPrice * (1 - discPct / 100);
              const lineTotal = discountedUnit * qty;

              return (
                <div key={idx} className="grid grid-cols-[1.7fr_0.5fr_0.8fr_0.9fr] gap-2 items-start py-1.5 border-b border-dashed border-gray-100 last:border-b-0">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-800 leading-tight">
                      {item.product_name}
                    </div>
                    {item.product_brand && (
                      <div className="text-xs text-gray-400 truncate mt-0.5">
                        {item.product_brand}
                      </div>
                    )}
                    {discPct > 0 && (
                      <div className="text-[11px] text-red-500 mt-1">
                        Diskon {discPct}%
                      </div>
                    )}
                  </div>
                  <div className="text-right text-gray-700 font-medium pt-0.5">
                    {qty}
                  </div>
                  <div className="text-right text-gray-700 pt-0.5">
                    {formatRupiah(discPct > 0 ? discountedUnit : unitPrice)}
                  </div>
                  <div className="text-right font-semibold text-gray-900 pt-0.5">
                    {formatRupiah(lineTotal)}
                  </div>
                  {discPct > 0 && (
                    <div className="col-span-4 -mt-1 text-[11px] text-gray-400 text-right">
                      Harga awal: {formatRupiah(unitPrice)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-t border-dashed border-gray-300" />

          {/* Summary */}
          <div className="space-y-1.5 rounded-xl bg-gray-50 px-4 py-3">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Pajak (10%)</span>
              <span>{formatRupiah(transaction.tax_amount ?? (subtotal * 0.10))}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-gray-900 pt-1 border-t border-dashed border-gray-300">
              <span>Total Keseluruhan</span>
              <span className="text-indigo-700">{formatRupiah(total)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Bayar</span>
              <span>{formatRupiah(paid)}</span>
            </div>
            <div className="flex justify-between font-semibold text-green-600">
              <span>Kembalian</span>
              <span>{formatRupiah(change)}</span>
            </div>
          </div>

          <div className="text-center text-xs text-gray-400 pt-2">
            Terima kasih telah berbelanja!
          </div>
        </div>

        {/* Footer buttons */}
        <div className="no-print flex gap-2 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={() => window.print()}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors"
          >
            🖨️ Cetak
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold text-sm transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Transaksi Page ─────────────────────────────────────────────────────

export default function Transaksi() {
  const { user } = useAuth();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [taxPercent, setTaxPercent] = useState(10);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingProducts, setFetchingProducts] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);

  // ── Fetch products & categories ─────────────────────────────────────────

  const fetchInitialData = useCallback(async () => {
    setFetchingProducts(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        client.get("/products"),
        client.get("/categories"),
      ]);
      setProducts(prodRes.data.data || []);
      setCategories(catRes.data.data || []);
    } catch (err) {
      toast.error("Gagal memuat data produk");
      console.error(err);
    } finally {
      setFetchingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // ── Filtered products ───────────────────────────────────────────────────

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      p.name?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q);
    const matchCat =
      !filterCategoryId || String(p.category_id) === String(filterCategoryId);
    return matchSearch && matchCat;
  });

  // ── Cart helpers ────────────────────────────────────────────────────────

  function calcSubtotal(price, qty, discPct) {
    return Number(price) * qty * (1 - (discPct || 0) / 100);
  }

  function getProductStock(productId) {
    return products.find((p) => p.id === productId)?.stock ?? 0;
  }

  function addToCart(product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        const maxStock = getProductStock(product.id);
        if (existing.quantity >= maxStock) {
          toast.error(`Stok tidak cukup (maks ${maxStock})`);
          return prev;
        }
        return prev.map((i) =>
          i.product_id === product.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                subtotal: calcSubtotal(
                  i.unit_price,
                  i.quantity + 1,
                  i.discount_percent,
                ),
              }
            : i,
        );
      }
      if ((product.stock ?? 0) <= 0) {
        toast.error("Produk habis");
        return prev;
      }
      const discPct = Number(product.discount_percent) || 0;
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          product_brand: product.brand,
          unit_price: Number(product.price),
          discount_percent: discPct,
          quantity: 1,
          subtotal: calcSubtotal(product.price, 1, discPct),
          stock: product.stock,
        },
      ];
    });
  }

  function updateQuantity(productId, delta) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.product_id !== productId) return i;
          const newQty = i.quantity + delta;
          if (newQty <= 0) return null;
          const maxStock = getProductStock(productId);
          if (newQty > maxStock) {
            toast.error(`Stok tidak cukup (maks ${maxStock})`);
            return i;
          }
          return {
            ...i,
            quantity: newQty,
            subtotal: calcSubtotal(i.unit_price, newQty, i.discount_percent),
          };
        })
        .filter(Boolean),
    );
  }

  function removeFromCart(productId) {
    setCart((prev) => prev.filter((i) => i.product_id !== productId));
  }

  function clearCart() {
    setCart([]);
    setTaxPercent(10);
    setPaymentAmount("");
    setCustomerName("");
  }

  // ── Calculations ────────────────────────────────────────────────────────

  const cartSubtotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const taxAmount = cartSubtotal * (taxPercent / 100);
  const total = cartSubtotal + taxAmount;
  const paid = parseFloat(paymentAmount) || 0;
  const change = Math.max(0, paid - total);
  const canProcess = cart.length > 0 && paid >= total && paid > 0;

  // ── Submit ──────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!canProcess) return;
    setLoading(true);
    try {
      const payload = {
        items: cart.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
        })),
        tax_percent: Number(taxPercent),
        payment_amount: paid,
        customer_name: customerName.trim() || null,
      };

      const res = await client.post("/transactions", payload);
      const trx = res.data.data || res.data;

      // Enrich receipt items with local cart data (names, brands, discounts)
      const enrichedItems = (trx.items || []).map((serverItem) => {
        const local = cart.find((c) => c.product_id === serverItem.product_id);
        return {
          product_name: local?.product_name ?? serverItem.product_name ?? "—",
          product_brand: local?.product_brand ?? serverItem.product_brand ?? "",
          unit_price: local?.unit_price ?? serverItem.unit_price ?? 0,
          discount_percent:
            local?.discount_percent ?? serverItem.discount_percent ?? 0,
          quantity: serverItem.quantity ?? local?.quantity ?? 1,
        };
      });

      setLastTransaction({
        ...trx,
        items: enrichedItems.length
          ? enrichedItems
          : cart.map((c) => ({ ...c })),
      });
      setShowReceipt(true);
      toast.success("Transaksi berhasil!");
      clearCart();
      fetchInitialData();
    } catch (err) {
      const msg = err.response?.data?.message || "Transaksi gagal";
      toast.error(msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleNewTransaction() {
    setShowReceipt(false);
    setLastTransaction(null);
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Receipt Modal */}
      {showReceipt && lastTransaction && (
        <Receipt transaction={lastTransaction} onClose={handleNewTransaction} />
      )}

      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transaksi</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Kasir:{" "}
              <span className="font-medium text-indigo-600">
                {user?.name || user?.username || "—"}
              </span>
            </p>
          </div>
          <button
            onClick={fetchInitialData}
            disabled={fetchingProducts}
            className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <span className={fetchingProducts ? "animate-spin" : ""}>↻</span>
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* ── Left: Product List ──────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Search & Filter */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                🔍
              </span>
              <input
                type="text"
                placeholder="Cari produk atau brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              />
            </div>
            <select
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-[160px]"
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Product Grid */}
          {fetchingProducts ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl p-4 animate-pulse space-y-2"
                >
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-5 bg-gray-200 rounded w-2/3 mt-2" />
                  <div className="h-8 bg-gray-200 rounded mt-2" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">🕐</div>
              <div className="font-medium">Produk tidak ditemukan</div>
              <div className="text-sm mt-1">
                Coba ubah kata kunci atau filter kategori
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const isOut = (product.stock ?? 0) <= 0;
                const cartItem = cart.find((i) => i.product_id === product.id);
                const hasDiscount = Number(product.discount_percent) > 0;
                const discountedPrice =
                  product.price * (1 - (product.discount_percent || 0) / 100);

                return (
                  <button
                    key={product.id}
                    onClick={() => !isOut && addToCart(product)}
                    disabled={isOut}
                    className={`relative bg-white rounded-xl p-4 text-left border transition-all duration-150 focus:outline-none
                      ${
                        isOut
                          ? "opacity-50 cursor-not-allowed border-gray-200"
                          : "border-gray-200 hover:border-indigo-400 hover:shadow-md cursor-pointer active:scale-[0.98]"
                      }
                      ${cartItem ? "border-indigo-400 ring-2 ring-indigo-200" : ""}
                    `}
                  >
                    {/* Cart badge */}
                    {cartItem && (
                      <span className="absolute top-2 right-2 bg-indigo-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center leading-none">
                        {cartItem.quantity}
                      </span>
                    )}

                    {/* Out of stock overlay */}
                    {isOut && (
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                        HABIS
                      </span>
                    )}

                    {/* Discount badge */}
                    {hasDiscount && !isOut && (
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                        DISKON
                      </span>
                    )}

                    <div className="mt-4 space-y-1">
                      <div className="text-xs font-semibold text-indigo-500 uppercase tracking-wide truncate">
                        {product.brand}
                      </div>
                      <div className="text-sm font-bold text-gray-800 leading-tight line-clamp-2">
                        {product.name}
                      </div>
                      {product.model_type && (
                        <div className="text-xs text-gray-400 truncate">
                          {product.model_type}
                        </div>
                      )}

                      {/* Price */}
                      <div className="pt-1">
                        {hasDiscount ? (
                          <div className="space-y-0.5">
                            <div className="text-xs line-through text-gray-400">
                              {formatRupiah(product.price)}
                            </div>
                            <div className="text-sm font-bold text-red-600">
                              {formatRupiah(discountedPrice)}
                            </div>
                            <div className="inline-block text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-semibold">
                              DISKON {product.discount_percent}%
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm font-bold text-indigo-700">
                            {formatRupiah(product.price)}
                          </div>
                        )}
                      </div>

                      {/* Stock */}
                      <div
                        className={`text-xs ${product.stock <= 5 ? "text-orange-500 font-medium" : "text-gray-400"}`}
                      >
                        Stok: {product.stock}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right: Cart ─────────────────────────────────────────────────── */}
        <div className="w-80 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col sticky top-6 max-h-[calc(100vh-6rem)]">
            {/* Cart Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">🛒</span>
                <span className="font-bold text-gray-800">Keranjang</span>
                {cart.length > 0 && (
                  <span className="bg-indigo-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                >
                  Kosongkan
                </button>
              )}
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {cart.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-3xl mb-2">🛍️</div>
                  <div className="text-sm">Keranjang kosong</div>
                  <div className="text-xs mt-1">
                    Klik produk untuk menambahkan
                  </div>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product_id}
                    className="bg-gray-50 rounded-xl px-3 py-3 space-y-2"
                  >
                    {/* Name & brand */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 leading-tight truncate">
                          {item.product_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.product_brand}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none flex-shrink-0"
                        aria-label="Hapus item"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Price with discount */}
                    {item.discount_percent > 0 ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs line-through text-gray-400">
                          {formatRupiah(item.unit_price)}
                        </span>
                        <span className="bg-red-100 text-red-600 px-1 rounded text-xs font-bold">
                          {item.discount_percent}% OFF
                        </span>
                      </div>
                    ) : null}
                    <div className="text-sm font-bold text-indigo-700">
                      {formatRupiah(
                        item.unit_price * (1 - item.discount_percent / 100),
                      )}
                    </div>

                    {/* Qty & subtotal */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQuantity(item.product_id, -1)}
                          className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600 font-bold text-base leading-none transition-colors flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-semibold text-gray-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product_id, 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-green-50 hover:border-green-300 hover:text-green-600 font-bold text-base leading-none transition-colors flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-sm font-bold text-gray-800">
                        {formatRupiah(item.subtotal)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Summary & Checkout */}
            {cart.length > 0 && (
              <div className="border-t border-gray-100 px-5 py-4 space-y-3 flex-shrink-0">
                {/* Subtotal */}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium">
                    {formatRupiah(cartSubtotal)}
                  </span>
                </div>

                {/* Tax (Read-only) */}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Pajak (10%)</span>
                  <span className="font-medium text-gray-700">
                    +{formatRupiah(taxAmount)}
                  </span>
                </div>

                {/* Divider */}
                <div className="border-t border-dashed border-gray-300" />

                {/* Total */}
                <div className="flex justify-between text-base font-bold text-gray-900">
                  <span>TOTAL</span>
                  <span className="text-indigo-700">{formatRupiah(total)}</span>
                </div>

                {/* Payment Amount */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">
                    Jumlah Bayar
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>

                {/* Change */}
                {paid > 0 && (
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-gray-600">Kembalian</span>
                    <span
                      className={
                        change >= 0 ? "text-green-600" : "text-red-500"
                      }
                    >
                      {formatRupiah(change)}
                    </span>
                  </div>
                )}

                {/* Kurang bayar warning */}
                {paid > 0 && paid < total && (
                  <div className="text-xs text-red-500 font-medium text-center bg-red-50 rounded-lg py-1.5">
                    Kurang {formatRupiah(total - paid)}
                  </div>
                )}

                <div className="border-t border-gray-100" />

                {/* Customer Name */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">
                    Pelanggan <span className="text-gray-400">(opsional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nama pelanggan"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={!canProcess || loading}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all
                    ${
                      canProcess && !loading
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg active:scale-[0.98]"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      Memproses...
                    </span>
                  ) : (
                    "💳 Proses Transaksi"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
