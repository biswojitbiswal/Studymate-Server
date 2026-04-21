import * as Brevo from '@getbrevo/brevo';

const client = Brevo.ApiClient.instance;
client.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

const apiInstance = new Brevo.TransactionalEmailsApi();

async function sendTestEmail() {
  const email = {
    to: [{ email: "biswojitb474@gmail.com" }],
    subject: "Test Email from Studynest 🚀",
    htmlContent: "<h1>Hello from Brevo!</h1>",
    sender: {
      name: "Studynest",
      email: process.env.BREVO_SENDER || "",
    },
  };

  try {
    const res = await apiInstance.sendTransacEmail(email);
    console.log("Email sent:", res);
  } catch (err) {
    console.error("Error:", err);
  }
}

sendTestEmail();