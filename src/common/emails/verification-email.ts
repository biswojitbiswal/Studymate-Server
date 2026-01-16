export function verificationEmailHtml(verifyUrl: string) {
  const brandColor = '#2563eb';

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Verify your email</title>
  </head>

  <body
    style="
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: Arial, Helvetica, sans-serif;
    "
  >
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding: 40px 16px">
          <!-- Container -->
          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            style="
              max-width: 520px;
              background-color: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 10px 25px rgba(0, 0, 0, 0.06);
            "
          >
            <!-- Header -->
            <tr>
              <td
                style="
                  background-color: #2563eb;
                  padding: 24px;
                  text-align: center;
                  color: #ffffff;
                "
              >
                <h1 style="margin: 0; font-size: 22px">
                  StudyNest
                </h1>
                <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9">
                  Learn better. Together.
                </p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding: 32px">
                <h2
                  style="
                    margin: 0 0 12px;
                    font-size: 20px;
                    color: #0f172a;
                  "
                >
                  Verify your email
                </h2>

                <p
                  style="
                    margin: 0 0 20px;
                    font-size: 14px;
                    color: #475569;
                    line-height: 1.6;
                  "
                >
                  Thanks for signing up for <strong>StudyNest</strong> 🎉  
                  Please confirm your email address to activate your account and
                  continue your learning journey.
                </p>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 28px 0">
                  <a
                    href=${verifyUrl}
                    style="
                      display: inline-block;
                      background-color: #2563eb;
                      color: #ffffff;
                      padding: 14px 28px;
                      border-radius: 9999px;
                      text-decoration: none;
                      font-size: 14px;
                      font-weight: bold;
                    "
                  >
                    Verify Email
                  </a>
                </div>

                <p
                  style="
                    margin: 0;
                    font-size: 13px;
                    color: #64748b;
                    line-height: 1.6;
                  "
                >
                  If you didn’t create a StudyNest account, you can safely ignore
                  this email.
                </p>

                <p
                  style="
                    margin: 20px 0 0;
                    font-size: 12px;
                    color: #94a3b8;
                    line-height: 1.6;
                  "
                >
                  This verification link will expire in 30 minutes.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="
                  background-color: #f1f5f9;
                  padding: 16px;
                  text-align: center;
                  font-size: 12px;
                  color: #64748b;
                "
              >
                © 2026 StudyNest. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>

  `;
}
