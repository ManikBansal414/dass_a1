const QRCode = require('qrcode');
const crypto = require('crypto');

// Generate unique ticket ID
exports.generateTicketId = () => {
  return 'TKT-' + crypto.randomBytes(8).toString('hex').toUpperCase();
};

// Generate QR code
exports.generateQRCode = async (data) => {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(data));
    return qrCodeDataUrl;
  } catch (error) {
    console.error('QR Code generation error:', error);
    return null;
  }
};
