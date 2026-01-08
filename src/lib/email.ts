import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.APP_URL}/api/auth/verify?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Verify your email - ICE Deaths Documentation',
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #000; border-bottom: 1px solid #ccc; padding-bottom: 10px;">
          ICE Deaths Documentation
        </h1>
        <p>Please verify your email address by clicking the link below:</p>
        <p style="margin: 20px 0;">
          <a href="${verificationUrl}" 
             style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; display: inline-block;">
            Verify Email
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          Or copy this link: <br/>
          <code style="background: #f5f5f5; padding: 4px 8px;">${verificationUrl}</code>
        </p>
        <p style="color: #666; font-size: 14px;">
          This link expires in 24 hours.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">
          If you did not request this verification, please ignore this email.
        </p>
      </div>
    `,
  };

  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log('SMTP not configured. Verification URL:', verificationUrl);
    return { success: true, message: 'SMTP not configured - check console for verification URL' };
  }

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.APP_URL}/auth/reset-password?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Reset your password - ICE Deaths Documentation',
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #000; border-bottom: 1px solid #ccc; padding-bottom: 10px;">
          ICE Deaths Documentation
        </h1>
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <p style="margin: 20px 0;">
          <a href="${resetUrl}" 
             style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          Or copy this link: <br/>
          <code style="background: #f5f5f5; padding: 4px 8px;">${resetUrl}</code>
        </p>
        <p style="color: #666; font-size: 14px;">
          This link expires in 1 hour.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">
          If you did not request this reset, please ignore this email.
        </p>
      </div>
    `,
  };

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log('SMTP not configured. Reset URL:', resetUrl);
    return { success: true, message: 'SMTP not configured - check console for reset URL' };
  }

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}
