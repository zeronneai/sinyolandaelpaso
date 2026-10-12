import QRCode from 'qrcode';

const OPCIONES = { margin: 1, errorCorrectionLevel: 'M', color: { dark: '#3B1F14', light: '#FFFFFF' } };

/** SVG del QR como texto, para meterlo en el HTML. */
export const qrSVG = (texto) => QRCode.toString(texto, { ...OPCIONES, type: 'svg' });

/** Data URL PNG del QR (para canvas e impresión). */
export const qrPNG = (texto, ancho = 600) => QRCode.toDataURL(texto, { ...OPCIONES, width: ancho });
