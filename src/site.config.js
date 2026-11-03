export const store = {
  name: 'Aura TCG & Print',
  whatsapp: '56998716582',
  currency: 'CLP',
  locale: 'es-CL',
};

export function whatsappUrl(message) {
  return `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(message)}`;
}
