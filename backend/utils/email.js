const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
  // Check if email configuration exists
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
    console.log('⚠️  Email configuration not found. Emails will be logged to console only.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Helper function to send email or log if transporter not configured
const sendEmail = async (mailOptions) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('\n📧 EMAIL (Console Mode - No SMTP configured):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`To: ${mailOptions.to}`);
    console.log(`Subject: ${mailOptions.subject}`);
    console.log(`Body: ${mailOptions.html.replace(/<[^>]*>/g, '')}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return true;
  }

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${mailOptions.to}: ${mailOptions.subject}`);
    return true;
  } catch (error) {
    console.error('❌ Email send error:', error.message);
    return false;
  }
};

// Send ticket email for Normal Events (Section 9.5)
exports.sendTicketEmail = async (participantEmail, eventDetails, ticketData) => {
  // Extract base64 data from the data URL for use as an attachment
  const qrBase64 = ticketData.qrCode
    ? ticketData.qrCode.replace(/^data:image\/png;base64,/, '')
    : null;

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@felicity.com',
    to: participantEmail,
    subject: `Registration Confirmed - ${eventDetails.name}`,
    attachments: qrBase64 ? [{
      filename: 'ticket-qr.png',
      content: qrBase64,
      encoding: 'base64',
      cid: 'ticketqr'   // Content-ID so we can reference it inline
    }] : [],
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .ticket-box { background: white; border: 2px dashed #667eea; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .ticket-id { font-size: 24px; font-weight: bold; color: #667eea; text-align: center; letter-spacing: 2px; }
          .details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .details li { margin: 8px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .qr-note { background: #d4edda; border-left: 4px solid #28a745; padding: 12px; margin: 15px 0; }
          .qr-container { text-align: center; margin: 20px 0; padding: 20px; background: white; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Registration Successful!</h1>
          </div>
          <div class="content">
            <p>Congratulations! You have successfully registered for:</p>
            <h2 style="color: #667eea; text-align: center;">${eventDetails.name}</h2>
            
            <div class="ticket-box">
              <p style="text-align: center; margin: 0 0 10px 0; color: #666;">Your Ticket ID</p>
              <div class="ticket-id">${ticketData.ticketId}</div>
            </div>

            ${qrBase64 ? `
            <div class="qr-container">
              <h3 style="color: #667eea;">Your QR Code Ticket</h3>
              <img src="cid:ticketqr" alt="QR Code" style="max-width: 250px; margin: 15px auto; display: block;" />
              <p style="color: #666; font-size: 14px;">Present this QR code at the event venue</p>
            </div>
            ` : ''}

            <div class="details">
              <h3>Event Details</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Date:</strong> ${new Date(eventDetails.startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>
                <li><strong>Time:</strong> ${new Date(eventDetails.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</li>
                <li><strong>Venue:</strong> ${eventDetails.venue || 'To be announced'}</li>
                <li><strong>Category:</strong> ${eventDetails.category || eventDetails.eventType}</li>
              </ul>
            </div>

            <div class="qr-note">
              <strong>Important Notes:</strong><br>
              - Save this email for easy access to your QR code<br>
              - You can also view your ticket in the dashboard<br>
              - Present the QR code at the event venue for entry
            </div>

            <p style="text-align: center; margin-top: 30px;">
              <strong>See you at the event!</strong>
            </p>
          </div>
          <div class="footer">
            <p>This is an automated email from Felicity Event Management System.</p>
            <p>For any queries, please contact the event organizer.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  return await sendEmail(mailOptions);
};

// Send confirmation email for merchandise purchase - Basic Flow (Section 9.5)
exports.sendMerchandiseEmail = async (participantEmail, eventDetails, ticketData, orderDetails = {}) => {
  const qrBase64 = ticketData.qrCode
    ? ticketData.qrCode.replace(/^data:image\/png;base64,/, '')
    : null;

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@felicity.com',
    to: participantEmail,
    subject: `Order Confirmed - ${eventDetails.name}`,
    attachments: qrBase64 ? [{
      filename: 'order-qr.png',
      content: qrBase64,
      encoding: 'base64',
      cid: 'orderqr'
    }] : [],
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .order-box { background: white; border: 2px solid #f5576c; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .order-id { font-size: 24px; font-weight: bold; color: #f5576c; text-align: center; letter-spacing: 2px; }
          .details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .details li { margin: 8px 0; }
          .price { font-size: 28px; color: #f5576c; font-weight: bold; text-align: center; margin: 15px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .qr-note { background: #d4edda; border-left: 4px solid #28a745; padding: 12px; margin: 15px 0; }
          .qr-container { text-align: center; margin: 20px 0; padding: 20px; background: white; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmed!</h1>
          </div>
          <div class="content">
            <p>Thank you for your purchase! Your order has been confirmed.</p>
            <h2 style="color: #f5576c; text-align: center;">${eventDetails.name}</h2>
            
            <div class="order-box">
              <p style="text-align: center; margin: 0 0 10px 0; color: #666;">Order ID</p>
              <div class="order-id">${ticketData.ticketId}</div>
            </div>

            <div class="price">&#8377;${eventDetails.registrationFee || 0}</div>

            ${qrBase64 ? `
            <div class="qr-container">
              <h3 style="color: #f5576c;">Your Order QR Code</h3>
              <img src="cid:orderqr" alt="QR Code" style="max-width: 250px; margin: 15px auto; display: block;" />
              <p style="color: #666; font-size: 14px;">Present this QR code for merchandise collection</p>
            </div>
            ` : ''}

            <div class="details">
              <h3>Order Details</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Item:</strong> ${eventDetails.name}</li>
                ${orderDetails.size ? `<li><strong>Size:</strong> ${orderDetails.size}</li>` : ''}
                ${orderDetails.color ? `<li><strong>Color:</strong> ${orderDetails.color}</li>` : ''}
                ${orderDetails.variant ? `<li><strong>Variant:</strong> ${orderDetails.variant}</li>` : ''}
                <li><strong>Order Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</li>
                <li><strong>Payment:</strong> Completed</li>
              </ul>
            </div>

            <div class="qr-note">
              <strong>Next Steps:</strong><br>
              - Save this email for easy access to your QR code<br>
              - Present the QR code for merchandise collection<br>
              - Check your dashboard for delivery/pickup details
            </div>
          </div>
          <div class="footer">
            <p>This is an automated email from Felicity Event Management System.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  return await sendEmail(mailOptions);
};

// Send pending approval email for merchandise (Tier A - Section 13.1.2)
exports.sendMerchandisePendingEmail = async (participantEmail, eventDetails, orderData) => {
  const mailOptions = {
    from: process.env.EMAIL_USER || 'noreply@felicity.com',
    to: participantEmail,
    subject: `⏳ Payment Under Review - ${eventDetails.name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%); color: #333; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .status-box { background: white; border: 2px dashed #fdcb6e; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
          .status { font-size: 20px; font-weight: bold; color: #f39c12; }
          .details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .info-note { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏳ Order Submitted</h1>
          </div>
          <div class="content">
            <p>Your order has been received and is currently under review.</p>
            
            <div class="status-box">
              <div class="status">🔍 Payment Verification in Progress</div>
            </div>

            <div class="details">
              <h3>📋 Order Details</h3>
              <ul style="list-style: none; padding: 0;">
                <li>📦 <strong>Item:</strong> ${eventDetails.name}</li>
                <li>🆔 <strong>Order ID:</strong> ${orderData.orderId}</li>
                <li>💰 <strong>Amount:</strong> ₹${eventDetails.registrationFee || 0}</li>
              </ul>
            </div>

            <div class="info-note">
              <strong>📌 What's Next?</strong><br>
              • Our team is reviewing your payment proof<br>
              • You'll receive a confirmation email once approved<br>
              • Expected review time: 24-48 hours<br>
              • Check your dashboard for real-time status
            </div>

            <p style="text-align: center; margin-top: 30px; color: #666;">
              <strong>Note:</strong> Your QR code will be generated after payment approval.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  return await sendEmail(mailOptions);
};

// Send approval email for merchandise (Tier A - Section 13.1.2)
exports.sendMerchandiseApprovalEmail = async (participantEmail, eventDetails, ticketData, orderDetails = {}) => {
  const qrBase64 = ticketData.qrCode
    ? ticketData.qrCode.replace(/^data:image\/png;base64,/, '')
    : null;

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@felicity.com',
    to: participantEmail,
    subject: `Payment Approved - ${eventDetails.name}`,
    attachments: qrBase64 ? [{
      filename: 'order-qr.png',
      content: qrBase64,
      encoding: 'base64',
      cid: 'approvalqr'
    }] : [],
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #00b894 0%, #00cec9 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .approval-box { background: white; border: 3px solid #00b894; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
          .ticket-id { font-size: 24px; font-weight: bold; color: #00b894; letter-spacing: 2px; margin-top: 10px; }
          .details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .success-note { background: #d4edda; border-left: 4px solid #28a745; padding: 12px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Payment Approved!</h1>
          </div>
          <div class="content">
            <p>Great news! Your payment has been verified and approved.</p>
            
            <div class="approval-box">
              <div style="font-size: 48px;">🎉</div>
              <h2 style="color: #00b894; margin: 10px 0;">Order Confirmed</h2>
              <p style="margin: 5px 0;">Your Ticket ID</p>
              <div class="ticket-id">${ticketData.ticketId}</div>
            </div>

            ${qrBase64 ? `
            <div style="text-align: center; margin: 20px 0; padding: 20px; background: white; border-radius: 8px;">
              <h3 style="color: #00b894;">Your QR Code</h3>
              <img src="cid:approvalqr" alt="QR Code" style="max-width: 250px; margin: 15px auto; display: block;" />
              <p style="color: #666; font-size: 14px;">Present this QR code for merchandise collection</p>
            </div>
            ` : ''}

            <div class="details">
              <h3>📦 Confirmed Order</h3>
              <ul style="list-style: none; padding: 0;">
                <li>🛍️ <strong>Item:</strong> ${eventDetails.name}</li>
                ${orderDetails.size ? `<li>📏 <strong>Size:</strong> ${orderDetails.size}</li>` : ''}
                ${orderDetails.color ? `<li>🎨 <strong>Color:</strong> ${orderDetails.color}</li>` : ''}
                <li>💰 <strong>Amount Paid:</strong> ₹${eventDetails.registrationFee || 0}</li>
                <li>✅ <strong>Status:</strong> Confirmed</li>
              </ul>
            </div>

            <div class="success-note">
              <strong>🎫 Your QR Code is Ready!</strong><br>
              • Login to your dashboard to view your QR code<br>
              • Download and save it for collection<br>
              • Present the QR code when collecting your order
            </div>

            <p style="text-align: center; margin-top: 30px;">
              <strong>Thank you for your purchase!</strong>
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  return await sendEmail(mailOptions);
};

// Send rejection email for merchandise (Tier A - Section 13.1.2)
exports.sendMerchandiseRejectionEmail = async (participantEmail, eventDetails, orderData, reason) => {
  const mailOptions = {
    from: process.env.EMAIL_USER || 'noreply@felicity.com',
    to: participantEmail,
    subject: `❌ Payment Declined - ${eventDetails.name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #d63031 0%, #e17055 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .rejection-box { background: white; border: 2px solid #d63031; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
          .details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .warning-note { background: #f8d7da; border-left: 4px solid #dc3545; padding: 12px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Payment Declined</h1>
          </div>
          <div class="content">
            <p>We're sorry, but your payment could not be verified.</p>
            
            <div class="rejection-box">
              <h2 style="color: #d63031; margin: 10px 0;">Order Not Confirmed</h2>
              <p style="margin: 15px 0;"><strong>Order ID:</strong> ${orderData.orderId}</p>
            </div>

            <div class="warning-note">
              <strong>❗ Reason for Decline:</strong><br>
              ${reason || 'Payment proof could not be verified. Please check the uploaded document.'}
            </div>

            <div class="details">
              <h3>📋 Order Details</h3>
              <ul style="list-style: none; padding: 0;">
                <li>📦 <strong>Item:</strong> ${eventDetails.name}</li>
                <li>💰 <strong>Amount:</strong> ₹${eventDetails.registrationFee || 0}</li>
                <li>🚫 <strong>Status:</strong> Declined</li>
              </ul>
            </div>

            <p style="text-align: center; margin-top: 30px;">
              <strong>What to do next?</strong><br>
              Please contact the event organizer for clarification or to resubmit your payment proof.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  return await sendEmail(mailOptions);
};
