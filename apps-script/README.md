# Correos de reservaciones (Google Apps Script)

El sitio guarda cada reserva en Supabase y, **en paralelo**, la manda a este script para los correos. Si el script falla o se acaba la cuota, la reserva **no se pierde**: solo no sale el correo (y el admin la ve igual en vivo).

## Qué manda

| Cuándo | A quién | Asunto |
| --- | --- | --- |
| Reserva nueva | Cliente | ¡Ya quedó, [Nombre]! Tu mesa en Sin Yolanda El Paso · [fecha] |
| Reserva nueva | Equipo (TEAM_EMAILS) | 🔔 Nueva reserva [FOLIO] · [fecha] [hora] · [N] personas · [ocasión] |
| El admin pone "Confirmada" | Cliente | ¡Confirmada, [Nombre]! Te esperamos el [fecha] (con el boleto y QR otra vez) |
| El admin pone "Cancelada" | Cliente | Tu reserva quedó cancelada, [Nombre] |
| Botón "Mandar correo de prueba" (Admin > Ajustes) | Equipo | Los dos correos de una reserva nueva, con una reserva falsa |

El correo al cliente lleva: el boleto (folio, fecha, hora, personas, mesa y zona, ocasión y extras), el **QR inline** (se genera con quickchart.io y se adjunta con `inlineImages`, así Gmail y Outlook lo muestran), los botones VER MI NOCHE, INVITA A TU BOLA (WhatsApp listo para el grupo), Agregar a mi calendario y Cómo llegar, un **.ics adjunto**, las 3 primeras reglas de la casa, el depósito si hay, y un cierre según la ocasión. Sale en inglés si la reserva viene con `lang = en`.

El correo al equipo trae la tabla completa y el botón **VER EN EL ADMIN**, que abre `/admin/?reserva=FOLIO`: pide el PIN si hace falta y abre esa reserva resaltada en la pestaña Reservas, con sus botones de Confirmar, Llegó, etc.

## Instalación (una sola vez)

1. **Crea la Sheet de respaldo** (opcional pero recomendado) en Google Drive, por ejemplo "Reservas Sin Yolanda El Paso". Copia su ID de la URL: `docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit`.
2. Entra a [script.google.com](https://script.google.com) con la cuenta que va a mandar los correos y crea un **Proyecto nuevo**. Ponle "Sin Yolanda · correos".
3. Borra lo que trae `Código.gs` y pega todo el contenido de `apps-script/Code.gs`.
4. En **Configuración del proyecto** (el engrane) > **Propiedades del script**, agrega:

   | Propiedad | Valor |
   | --- | --- |
   | `TEAM_EMAILS` | `hola@purpleroots.agency, gerente@sinyolanda...` (separados por coma) |
   | `SITE_URL` | `https://sinyolandaelpaso.com` (sin diagonal al final) |
   | `LOGO_URL` | `https://sinyolandaelpaso.com/assets/logos/logo-email.png` |
   | `SHEET_ID` | el ID de la Sheet del paso 1 (opcional) |
   | `SUPABASE_URL` | la misma que `VITE_SUPABASE_URL` (recomendado) |
   | `SUPABASE_ANON_KEY` | la misma que `VITE_SUPABASE_ANON_KEY` (recomendado) |

   Con `SUPABASE_URL` y `SUPABASE_ANON_KEY` el script **lee la reserva real de la base por su folio** en lugar de confiar en lo que manda el navegador. Así nadie puede usar el script para mandar correos inventados.
5. En el editor, escoge la función **`setup`** y dale **Ejecutar**. Google pide permisos (correo, conexiones externas y Sheets): acepta. Si hay Sheet, crea la hoja "Reservas" con encabezados.
6. Prueba con **`testEnvio`**: te llegan los dos correos de ejemplo a TEAM_EMAILS.
7. **Implementar > Nueva implementación** > tipo **Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
8. Copia la URL que termina en `/exec` y ponla en Vercel como `VITE_APPS_SCRIPT_URL` (Settings > Environment Variables). Vuelve a desplegar el sitio para que tome la variable.

Para revisar que está vivo, abre la URL `/exec` en el navegador: debe contestar `{"ok":true,...}`.

## Actualizar el script sin que cambie la URL

Si creas una "Nueva implementación" cada vez, **la URL cambia** y hay que volver a ponerla en Vercel. Para conservarla:

1. Pega el código nuevo y guarda.
2. **Implementar > Administrar implementaciones**.
3. En la implementación activa, dale al **lápiz (Editar)**.
4. En **Versión**, escoge **Nueva versión** y dale **Implementar**.

La URL `/exec` sigue siendo la misma y ya corre el código nuevo.

## Límites de correo

`MailApp` tiene una cuota diaria por cuenta:

- **Gmail normal: 100 correos al día.**
- **Google Workspace: 1,500 correos al día.**

Cada reserva nueva gasta **2 correos** (cliente y equipo; si TEAM_EMAILS tiene varias direcciones cuenta cada destinatario) y cada cambio de estado a Confirmada o Cancelada gasta **1**. Con Gmail normal alcanza para unas 40 reservas al día con confirmación; para la operación real conviene una cuenta de Workspace.

Para no gastar la cuota en el demo, el sitio no manda correos a direcciones `@example.com` (las de los datos de ejemplo). Además el script limita a 3 reservas por correo por hora y a 60 correos por hora en total.

Para ver cuántos quedan: en el editor corre `setup` y revisa el registro ("Correos que quedan hoy").

## Pruebas locales

El código se probó con un simulador de los servicios de Google (MailApp, UrlFetchApp, Utilities, etc.) que genera el HTML de cada correo para revisarlo en el navegador.
