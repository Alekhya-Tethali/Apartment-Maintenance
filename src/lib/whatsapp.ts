export function generateWhatsAppLink(
  phoneNumber: string,
  message: string
): string {
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, "");
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
}
