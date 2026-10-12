// Pagos de depósitos. Dos proveedores:
//  - simulado: checkout de mentiritas con look de Stripe (modo demo).
//  - stripe: Stripe Checkout real vía /api/checkout (función de Vercel).

import { ENV } from './entorno.js';
import { esc } from './ui.js';

export const proveedor = ENV.pagos === 'stripe' ? 'stripe' : 'simulado';

export const dinero = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);

/**
 * Cobra el depósito.
 * Resuelve { ok: true } si se pagó, { ok: false, cancelado: true } si la persona
 * cerró el checkout. Con Stripe redirige y no regresa.
 */
export async function cobrar({ folio, monto, concepto, correo, nombre }) {
  if (proveedor === 'stripe') return cobrarStripe({ folio, monto, concepto, correo });
  return checkoutSimulado({ monto, concepto, correo, nombre });
}

async function cobrarStripe({ folio, monto, concepto, correo }) {
  const r = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folio, monto, concepto, correo }),
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok || !datos.url) throw new Error(datos.error || 'No se pudo abrir el pago');
  window.location.href = datos.url;
  return new Promise(() => {}); // la página se va a Stripe
}

function checkoutSimulado({ monto, concepto, correo = '', nombre = '' }) {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'checkout';
    dlg.setAttribute('aria-labelledby', 'checkout-titulo');
    dlg.innerHTML = `
      <form method="dialog" class="checkout__caja" novalidate>
        <div class="checkout__lado">
          <p class="checkout__comercio"><span class="checkout__avatar" aria-hidden="true">SY</span> Sin Yolanda El Paso</p>
          <p class="checkout__concepto">${esc(concepto)}</p>
          <p class="checkout__monto" id="checkout-titulo">${dinero(monto)}</p>
          <p class="checkout__prueba">Modo prueba: usa 4242 4242 4242 4242</p>
        </div>
        <div class="checkout__form">
          <label>Correo<input name="correo" type="email" value="${esc(correo)}" autocomplete="email" required></label>
          <label>Datos de la tarjeta
            <span class="checkout__tarjeta">
              <input name="numero" inputmode="numeric" autocomplete="cc-number" placeholder="1234 1234 1234 1234" required>
              <span class="checkout__fila">
                <input name="exp" inputmode="numeric" autocomplete="cc-exp" placeholder="MM / AA" required>
                <input name="cvc" inputmode="numeric" autocomplete="cc-csc" placeholder="CVC" required>
              </span>
            </span>
          </label>
          <label>Nombre en la tarjeta<input name="nombre" value="${esc(nombre)}" autocomplete="cc-name" required></label>
          <p class="checkout__error" role="alert" hidden></p>
          <button class="checkout__pagar" value="pagar">Pagar ${dinero(monto)}</button>
          <button class="checkout__cancelar" value="cancelar" formnovalidate>Cancelar</button>
          <p class="checkout__pie">Pago simulado. No se cobra nada. <span>Powered by <b>stripe</b></span></p>
        </div>
      </form>`;
    document.body.append(dlg);
    const form = dlg.querySelector('form');
    const error = dlg.querySelector('.checkout__error');
    const numero = form.numero;

    numero.addEventListener('input', () => {
      const d = numero.value.replace(/\D/g, '').slice(0, 16);
      numero.value = d.replace(/(\d{4})(?=\d)/g, '$1 ');
    });
    form.exp.addEventListener('input', () => {
      const d = form.exp.value.replace(/\D/g, '').slice(0, 4);
      form.exp.value = d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
    });

    const cerrar = (resultado) => {
      dlg.close();
      dlg.remove();
      resolve(resultado);
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (e.submitter?.value === 'cancelar') return cerrar({ ok: false, cancelado: true });
      error.hidden = true;
      const d = numero.value.replace(/\D/g, '');
      if (d.length < 16 || !form.exp.value || !form.cvc.value) {
        error.textContent = 'Completa los datos de la tarjeta.';
        error.hidden = false;
        return;
      }
      if (d !== '4242424242424242') {
        error.textContent = 'Tarjeta rechazada. En modo prueba usa 4242 4242 4242 4242.';
        error.hidden = false;
        return;
      }
      const btn = form.querySelector('.checkout__pagar');
      btn.disabled = true;
      btn.textContent = 'Procesando...';
      await new Promise((r) => setTimeout(r, 1300));
      btn.textContent = '✓ Pagado';
      await new Promise((r) => setTimeout(r, 500));
      cerrar({ ok: true });
    });
    dlg.addEventListener('cancel', (e) => {
      e.preventDefault();
      cerrar({ ok: false, cancelado: true });
    });
    dlg.showModal();
    numero.focus();
  });
}
