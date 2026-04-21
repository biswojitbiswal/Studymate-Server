import axios from 'axios';

const apiKey = process.env.BREVO_API_KEY;
const fromEmail = process.env.BREVO_SENDER;

if (!apiKey || !fromEmail) {
  throw new Error('Brevo env not configured');
}

export async function sendEmail(to, subject, html) {
  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: 'Studynest',
          email: fromEmail,
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error('Brevo email error:', error.response?.data || error.message);
    throw error;
  }
}




// import sgMail from '@sendgrid/mail';

// const apiKey = process.env.SENDGRID_API_KEY;
// const fromEmail = process.env.SENDGRID_FROM_EMAIL;

// if (!apiKey || !fromEmail) {
//   throw new Error('SendGrid env not configured');
// }

// sgMail.setApiKey(apiKey);

// export async function sendEmail(
//   to: string,
//   subject: string,
//   html: string,
// ) {
//   await sgMail.send({
//     to,
//     from: fromEmail || "biswojitb474@gmail.com",
//     subject,
//     html,
//   });
// }