import { Injectable, InternalServerErrorException } from '@nestjs/common';
import sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;

    if (!apiKey || !fromEmail) {
      throw new InternalServerErrorException(
        'SendGrid environment variables are not configured',
      );
    }

    sgMail.setApiKey(apiKey);
    this.fromEmail = fromEmail;
  }

  private readonly fromEmail: string;

  async sendEmail(to: string, subject: string, html: string) {
    await sgMail.send({
      to,
      from: this.fromEmail,
      subject,
      html,
    });
  }
}
