/**
 * Shared email HTML template builder for all Lumi Membros Edge Functions.
 * Uses the Master brand palette: #ff7b00 (orange), #09090b (dark bg), #18181b (card), #fafafa (text).
 */

export interface EmailTemplateOptions {
  subject: string;
  previewText?: string;
  heading: string;
  subheading?: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  footerNote?: string;
  platformName: string;
  platformUrl: string;
}

export function buildEmailHtml(options: EmailTemplateOptions): string {
  const {
    previewText,
    heading,
    subheading,
    bodyHtml,
    ctaText,
    ctaUrl,
    footerNote,
    platformName,
    platformUrl,
  } = options;

  const previewSection = previewText
    ? `<div style="display:none;font-size:1px;color:#09090b;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${previewText}${"&zwnj;&nbsp;".repeat(30)}</div>`
    : "";

  const subheadingHtml = subheading
    ? `<p style="margin:0 0 0 0;font-size:14px;line-height:20px;color:#a1a1aa;">${subheading}</p>`
    : "";

  const ctaHtml =
    ctaText && ctaUrl
      ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px auto 0 auto;">
          <tr>
            <td style="border-radius:8px;background-color:#ff7b00;">
              <a href="${ctaUrl}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:700;color:#09090b;text-decoration:none;border-radius:8px;">
                ${ctaText}
              </a>
            </td>
          </tr>
        </table>`
      : "";

  const footerNoteHtml = footerNote
    ? `<p style="margin:12px 0 0 0;font-size:12px;line-height:18px;color:#6b7280;">${footerNote}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${heading}</title>
  <!--[if mso]>
  <style>
    table { border-collapse: collapse; }
    td { font-family: Arial, sans-serif; }
  </style>
  <![endif]-->
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
    body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    img { border: 0; display: block; outline: none; text-decoration: none; }
    a { color: #ff7b00; text-decoration: underline; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; padding: 0 12px !important; }
      .header-td { padding: 24px 20px !important; }
      .body-td { padding: 28px 20px !important; }
      .footer-td { padding: 20px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;">
  ${previewSection}
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <!--[if mso]><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600"><tr><td><![endif]-->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;margin:0 auto;" class="email-container">

          <!-- HEADER -->
          <tr>
            <td class="header-td" style="background-color:#ff7b00;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#09090b;letter-spacing:-0.02em;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                ${platformName}
              </h1>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td class="body-td" style="background-color:#18181b;padding:36px 32px;">
              <h2 style="margin:0 0 8px 0;font-size:20px;font-weight:700;color:#fafafa;line-height:28px;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                ${heading}
              </h2>
              ${subheadingHtml}
              <div style="margin-top:24px;font-size:15px;line-height:24px;color:#d4d4d8;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                ${bodyHtml}
              </div>
              ${ctaHtml}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td class="footer-td" style="background-color:#09090b;padding:24px 32px;border-top:1px solid #27272a;border-radius:0 0 12px 12px;">
              <p style="margin:0;font-size:12px;line-height:18px;color:#6b7280;text-align:center;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                Voce recebeu este email porque e membro da <a href="${platformUrl}" style="color:#ff7b00;text-decoration:underline;">${platformName}</a>.
              </p>
              ${footerNoteHtml}
              <p style="margin:12px 0 0 0;font-size:11px;line-height:16px;color:#52525b;text-align:center;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                Para deixar de receber notificacoes, acesse suas <a href="${platformUrl}/meu-perfil" style="color:#71717a;text-decoration:underline;">configuracoes de perfil</a>.
              </p>
            </td>
          </tr>

        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}
