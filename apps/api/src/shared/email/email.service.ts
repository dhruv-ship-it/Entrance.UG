import { env } from '../../config/env.js';
import { AppError } from '../http/app-error.js';

type SendOtpEmailInput = {
  to: string;
  subject: string;
  heading: string;
  intro: string;
  otp: string;
};

export const sendOtpEmail = async ({ to, subject, heading, intro, otp }: SendOtpEmailInput) => {
  if (env.EMAIL_PROVIDER === 'dev') {
    if (env.NODE_ENV === 'production') {
      throw new AppError(500, 'Email delivery is not configured for production.');
    }
    console.info(`[email:dev] ${subject} -> ${to}. OTP: ${otp}`);
    return { devOtp: otp };
  }

  if (env.EMAIL_PROVIDER === 'resend') {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
      throw new AppError(500, 'Resend email credentials are not configured.');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to,
        subject,
        text: `${intro}\n\nYour OTP is ${otp}. It expires in 10 minutes.\n\nIf you did not request this, you can safely ignore this email.`,
        html: renderOtpEmail({ heading, intro, otp }),
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new AppError(502, `Email provider failed to send OTP.${body ? ` ${body}` : ''}`);
    }

    return { devOtp: null };
  }

  throw new AppError(500, 'Unsupported email provider.');
};

const renderOtpEmail = ({ heading, intro, otp }: Pick<SendOtpEmailInput, 'heading' | 'intro' | 'otp'>) => `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f7f8f4;padding:32px;color:#16251c;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e7e5dd;border-radius:24px;padding:28px;">
      <p style="margin:0 0 12px;color:#164331;font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;">Entrance UG</p>
      <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;">${escapeHtml(heading)}</h1>
      <p style="margin:0 0 22px;color:#5f625a;font-size:14px;line-height:1.7;">${escapeHtml(intro)}</p>
      <div style="font-size:30px;letter-spacing:.35em;font-weight:800;background:#eef8d4;border-radius:18px;padding:18px 22px;text-align:center;color:#164331;">${otp}</div>
      <p style="margin:22px 0 0;color:#777b72;font-size:13px;line-height:1.6;">This code expires in 10 minutes. If you did not request it, you can safely ignore this email.</p>
    </div>
  </div>
`;

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');
