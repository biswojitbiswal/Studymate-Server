export function forgotPasswordEmailHtml(name: string, verifyUrl: string) {
  const brandColor = '#2563eb';

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Reset your password</title>
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
                  StudyMate
                </h1>
                <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9">
                  Secure Account Access
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
                  Reset your password
                </h2>

                <p
                  style="
                    margin: 0 0 16px;
                    font-size: 14px;
                    color: #475569;
                    line-height: 1.6;
                  "
                >
                  Hi <strong>${name}</strong>,
                </p>

                <p
                  style="
                    margin: 0 0 20px;
                    font-size: 14px;
                    color: #475569;
                    line-height: 1.6;
                  "
                >
                  We received a request to reset your StudyMate account password.
                  Click the button below to set a new password.
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
                    Reset Password
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
                  If you did not request a password reset, you can safely ignore
                  this email. Your account will remain secure.
                </p>

                <p
                  style="
                    margin: 20px 0 0;
                    font-size: 12px;
                    color: #94a3b8;
                    line-height: 1.6;
                  "
                >
                  This password reset link will expire in 15 minutes.
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
                © 2026 StudyMate. All rights reserved.
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
