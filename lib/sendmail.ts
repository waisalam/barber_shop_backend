import nodemailer from 'nodemailer'

export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
})
transporter.verify((error, success) => {
  if (error) {
    console.log('Mailer error:', error)
  } else {
    console.log('Mailer is ready to send emails')
  }
})

export const getOTPEmailTemplate = (otp: string, name?: string) => {
  return `
  <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 40px 0;">
    <div style="max-width: 500px; margin: auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">BarbersCloud</h1>
        <p style="color: #cbd5e1; margin: 5px 0 0;">Your grooming experience starts here</p>
      </div>

      <!-- Body -->
      <div style="padding: 30px; text-align: center;">
        <h2 style="color: #111827; margin-bottom: 10px;">Verify Your Email</h2>

        <p style="color: #6b7280; font-size: 14px;">
          ${name ? `Hi ${name},` : "Hi there,"}
          <br/>
          Use the OTP below to verify your email and activate your BarbersCloud account.
        </p>

        <!-- OTP Box -->
        <div style="margin: 25px 0;">
          <div style="display: inline-block; background: #111827; color: #ffffff;
                      font-size: 28px; letter-spacing: 8px; padding: 15px 25px;
                      border-radius: 10px; font-weight: bold;">
            ${otp}
          </div>
        </div>

        <p style="color: #9ca3af; font-size: 13px;">
          This OTP is valid for <b>5 minutes</b>. Do not share it with anyone.
        </p>
      </div>

      <!-- Footer -->
      <div style="background: #f9fafb; padding: 15px; text-align: center;">
        <p style="font-size: 12px; color: #9ca3af; margin: 0;">
          © ${new Date().getFullYear()} BarbersCloud. All rights reserved.
        </p>
      </div>

    </div>
  </div>
  `;
};