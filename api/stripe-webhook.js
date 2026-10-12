// POST /api/stripe-webhook
// Stripe avisa aquí cuando se paga un depósito; se marca la reserva como pagada
// y confirmada. El admin lo ve en vivo por Supabase Realtime.
//
// En Stripe > Developers > Webhooks: endpoint https://TU-DOMINIO/api/stripe-webhook
// con el evento checkout.session.completed. Copia el signing secret a STRIPE_WEBHOOK_SECRET.

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// La firma se valida contra el cuerpo crudo: no dejar que se parsee.
export const config = { api: { bodyParser: false } };

const cuerpoCrudo = (req) =>
  new Promise((resolve, reject) => {
    const partes = [];
    req.on('data', (c) => partes.push(typeof c === 'string' ? Buffer.from(c) : c));
    req.on('end', () => resolve(Buffer.concat(partes)));
    req.on('error', reject);
  });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  let evento;
  try {
    evento = stripe.webhooks.constructEvent(await cuerpoCrudo(req), req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return res.status(400).send(`Firma inválida: ${e.message}`);
  }

  if (evento.type === 'checkout.session.completed' || evento.type === 'checkout.session.async_payment_succeeded') {
    const sesion = evento.data.object;
    const folio = sesion.metadata?.folio;
    if (folio && sesion.payment_status === 'paid') {
      const sb = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      });
      const { error } = await sb.from('reservas').update({ deposito_estado: 'pagado', estado: 'confirmada' }).eq('folio', folio);
      if (error) return res.status(500).send(error.message);
    }
  }
  if (evento.type === 'checkout.session.async_payment_failed') {
    const folio = evento.data.object.metadata?.folio;
    if (folio) {
      const sb = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
      await sb.from('reservas').update({ deposito_estado: 'fallido' }).eq('folio', folio);
    }
  }
  return res.status(200).json({ recibido: true });
}
