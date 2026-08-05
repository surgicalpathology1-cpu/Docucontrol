import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const NOTIFY_EMAILS = (process.env.NOTIFY_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean);
const RESEND_API_KEY = process.env.RESEND_API_KEY!;

async function sendEmail(to: string[], subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'DocuControl <onboarding@resend.dev>',
      to,
      subject,
      html,
    }),
  });
  return res.ok;
}

export async function POST(req: NextRequest) {
  try {
    const { type, documentTitle, documentId } = await req.json();

    if (type === 'signature_required') {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1e3a5f; padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">DocuControl</h1>
            <p style="color: #94a3b8; margin: 4px 0 0;">Gastrointestinal Specialists Pathology Laboratory</p>
          </div>
          <div style="background: #f8fafc; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e3a5f; margin-top: 0;">Signature Required</h2>
            <p style="color: #475569;">A document requires your signature:</p>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0; font-weight: bold; color: #1e293b;">${documentTitle}</p>
            </div>
            <a href="https://docucontrol.vercel.app/dashboard" 
               style="display: inline-block; background: #1e3a5f; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 8px;">
              Sign Document
            </a>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
              This is an automated message from DocuControl. Please do not reply to this email.
            </p>
          </div>
        </div>
      `;
      await sendEmail(NOTIFY_EMAILS, `Signature Required: ${documentTitle}`, html);
    }

    if (type === 'expiring_soon') {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1e3a5f; padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">DocuControl</h1>
            <p style="color: #94a3b8; margin: 4px 0 0;">Gastrointestinal Specialists Pathology Laboratory</p>
          </div>
          <div style="background: #fff7ed; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #fed7aa;">
            <h2 style="color: #c2410c; margin-top: 0;">⚠️ Document Expiring Soon</h2>
            <p style="color: #475569;">The following document is due for review within 30 days:</p>
            <div style="background: white; border: 1px solid #fed7aa; border-radius: 6px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0; font-weight: bold; color: #1e293b;">${documentTitle}</p>
            </div>
            <a href="https://docucontrol.vercel.app/dashboard" 
               style="display: inline-block; background: #c2410c; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 8px;">
              Review Document
            </a>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
              This is an automated message from DocuControl. Please do not reply to this email.
            </p>
          </div>
        </div>
      `;
      await sendEmail(NOTIFY_EMAILS, `Document Expiring Soon: ${documentTitle}`, html);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
