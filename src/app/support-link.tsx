export function SupportLink() {
  const phone = process.env.COMPANY_WHATSAPP_NUMBER ?? '966563447314';
  if (!/^[1-9][0-9]{7,14}$/.test(phone)) return null;
  return <a href={'https://wa.me/' + phone} target="_blank" rel="noopener noreferrer">Contact Alfadata support on WhatsApp</a>;
}
