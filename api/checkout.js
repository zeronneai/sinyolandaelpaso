// POST /api/checkout  { folio, correo }
// Crea una sesión de Stripe Checkout para el depósito de una reserva.
// El monto se lee de Supabase con la llave de servicio (no se confía en el navegador).

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const supabase = () =>
  createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: 'Falta STRIPE_SECRET_KEY' });

  const { folio, correo } = req.body || {};
  if (!/^SY-EP-[A-Z0-9]{6,12}$/.test(folio || '')) return res.status(400).json({ error: 'Folio inválido' });

  const { data: reserva, error } = await supabase()
    .from('reservas')
    .select('folio, monto_deposito, deposito_estado, fecha, personas, correo')
    .eq('folio', folio)
    .single();
  if (error || !reserva) return res.status(404).json({ error: 'No existe la reserva' });
  if (reserva.deposito_estado === 'pagado') return res.status(409).json({ error: 'El depósito ya está pagado' });

  const monto = Math.round(Number(reserva.monto_deposito) * 100);
  if (!(monto > 0)) return res.status(400).json({ error: 'Esta reserva no lleva depósito' });

  const sitio = process.env.SITE_URL || `https://${req.headers.host}`;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sesion = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: monto,
          product_data: { name: `Depósito Sin Yolanda El Paso · ${reserva.fecha} · ${reserva.personas} personas` },
        },
      },
    ],
    customer_email: correo || reserva.correo,
    metadata: { folio },
    success_url: `${sitio}/tu-noche/?folio=${encodeURIComponent(folio)}&pago=ok`,
    cancel_url: `${sitio}/tu-noche/?folio=${encodeURIComponent(folio)}&pago=cancelado`,
  });

  return res.status(200).json({ url: sesion.url });
}
