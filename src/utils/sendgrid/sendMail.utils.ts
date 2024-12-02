import * as sgMail from '@sendgrid/mail';
import { ConfigService } from '../../config/config.service';
import { Injectable } from '@nestjs/common';
import { SecurityCodeUtils } from '../security-code/securityCode.utils';

@Injectable()
export class SendMail {
  private readonly SENDGRID_API_KEY = ""
  private readonly EMAIL_FROM = ""
  constructor(private readonly config: ConfigService) {}

  async sendOrderDetails(email, orderDetails) {
    try {
      sgMail.setApiKey(this.SENDGRID_API_KEY);
      const message = {
        to: email,
        from: this.EMAIL_FROM,
        subject: 'Order Confirmation',
        html: this.generateMailTemplate(orderDetails),
      };

      const mail = await sgMail.send(message);
      return true;
    } catch (error) {
      console.log('Catch block in send email method: sendMail' + error);
      return false;
    }
  }

  async sendOrderDetailsTransak(email, orderDetails) {
    try {
      sgMail.setApiKey(this.SENDGRID_API_KEY);
      const message = {
        to: email,
        from: this.EMAIL_FROM,
        subject: 'Order Confirmation',
        html: this.generateMailTemplateForTransak(orderDetails),
      };

      const mail = await sgMail.send(message);
      return true;
    } catch (error) {
      console.log('Catch block in send email method: sendMail' + error);
      return false;
    }
  }
  async sendQrCode(email, image, secret) {
    try {
      const imageb64 = image.replace('data:image/png;base64,', '');

      sgMail.setApiKey(this.SENDGRID_API_KEY);
      const message = {
        to: email,
        from: this.EMAIL_FROM,
        subject: '2fa Code for ZAH Master Wallet',
        html: `Scan the QR code with any 2FA authenticator attached to this email.
        <b>Or use the secret:</b>${secret}
        <br>`,
        attachments: [
          {
            filename: 'qrcode.png',
            content: imageb64,
            content_id: 'myimagecid',
          },
        ],
      };

      const mail = await sgMail.send(message);
      return true;
    } catch (error) {
      console.log('Catch block in send email method: sendMail' + error);
      return false;
    }
  }

  async sendEmailJwt(email, jwt, title) {
    try {
      const titles = ['Email Confirmation', 'Reset Password'];
      const texts = ['verify your email', 'reset your password'];
      const endPoints = ['/verify', '/set-password'];

      sgMail.setApiKey(this.SENDGRID_API_KEY);
      const message = {
        to: email,
        from: this.EMAIL_FROM,
        subject: titles[title],
        html: `Kindly use this link to ${texts[title]}:<br> <a href='https://www.zahnymous.io${endPoints[title]}?auth=${jwt}'>https://www.zahnymous.io${endPoints[title]}?auth=${jwt}</a>`,
      };

      const mail = await sgMail.send(message);
      return true;
    } catch (error) {
      console.log('Catch block in send email method: sendMail' + error);
      return false;
    }
  }

  async sendVeriffStatus(email, status, decision, reason) {
    try {
      sgMail.setApiKey(this.SENDGRID_API_KEY);
      const message = {
        to: email,
        from: this.EMAIL_FROM,
        subject: 'KYC Status',
        html: `<html>

  <body style="scrollbar-width: thin; scrollbar-color: #41446a #dbbf70">
    <div
      style="
        max-width: 450px !important;
        flex-direction: column;
        align-items: center;
        margin: auto !important;
        border-left: 1px solid lightgray !important;
        border-right: 1px solid lightgray !important;
        background-image: url('https://s3.amazonaws.com/zahnymous.io/public_images/bg-body.png') !important;
        background-repeat: no-repeat;
        background-size: contain;
        background-color: #1d1d51;
      "
    >
      <div
        style="
          min-height: 170px;
          width: 100%;
          justify-content: center;
          align-items: center;
          color: white;
          background-repeat: no-repeat !important;
          background-position: center center !important;
          background-color: transparent !important;
          background-size: cover !important;
        "
      ></div>

      <div
        style="
          width: 100%;
          flex-direction: column;
          margin: auto;
          justify-content: center;
          /* row-gap: 1rem; */
          padding: 0.8rem;
        "
      >
        <h1
          style="
            font-family: sans-serif !important;
            text-align: left;
            font-size: 20px;
            font-weight: 500;
             line-height: 30px;
            align-items: center;
            text-align: center;
            justify-content: center;
            color: #dbbf70;

          "
        >
          Dear ZAH User <br />
          Please check your Veriff KYC status
        </h1>
        <p
          style="
            font-family: sans-serif !important;
            width: 90%;
            align-items: center;
            text-align: center;
            color: white;
            opacity: 0.7;
            line-height: 25px;
            font-weight: 400;
          "
        >
         Your kyc has been ${status}.<br>${
          decision ? `KYC decision is ${decision} with reason ${reason}.` : ''
        }
        </p>
      </div>
      <div
        style="
          font-family: Poppins, sans-serif !important;
          width: 100%;
        
          height: 100px;
          margin: auto;
          overflow: auto;
          scrollbar-width: thin;
          scrollbar-color: #41446a #dbbf70;
        "
      >
      </div>
  

      <div
        style="
          height: 70px;
          background-color: #41446a;
          color: white;
          width: 100%;
          margin-top: 3rem;
          display: flex !important;
          font-family: sans-serif !important;
        "
      >
        <div
          style="
            font-size: 17px;
            width: 100% !important;
            text-decoration: underline;
            cursor: pointer;
            text-align: center;
            color: white;
            align-self: center;
            margin: auto;
            font-family: sans-serif !important;
          "
        >
          <a
            href="https://www.zahnymous.io/"
            target="_blank"
            style="
              float: left !important;
              color: #dbbf70;
              margin-left: 0.5rem !important;
              font-size: 11px;
            "
            >www.zahnymous.io/</a
          >
          <a href="https://t.me/Zahnymous" target="_blank"
            ><img
              style="float: right !important; margin-right: 0.5rem"
              src="https://s3.amazonaws.com/zahnymous.io/public_images/telegram.png"
          /></a>
          <a href="https://www.instagram.com/zahnymous/" target="_blank"
            ><img
              style="float: right !important; margin-right: 0.5rem"
              src="https://s3.amazonaws.com/zahnymous.io/public_images/instagram.png"
          /></a>
          <a
            href="https://www.youtube.com/channel/UCs6WmBWwWY9C2C64KqG6rqQ"
            target="_blank"
            ><img
              style="float: right !important; margin-right: 0.5rem"
              src="https://s3.amazonaws.com/zahnymous.io/public_images/youtube.png"
          /></a>
          <a href="https://twitter.com/zahnymous" target="_blank"
            ><img
              style="float: right !important; margin-right: 0.5rem"
              src="https://s3.amazonaws.com/zahnymous.io/public_images/twitter.png"
          /></a>
        </div>
      </div>
    </div>
  </body>
</html>
`,
      };

      const mail = await sgMail.send(message);
      return true;
    } catch (error) {
      console.log('Catch block in send email method: sendMail' + error);
      return false;
    }
  }

  generateMailTemplate(data) {
    const template = `<html>
  <!-- <head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Poppins&display=swap"
      rel="stylesheet"
    />
    <style>
      div {
        display: block !important;
      }
      body {
        font-family: Poppins, sans-serif !important;
      }
    </style>
  </head> -->
  <body style="scrollbar-width: thin; scrollbar-color: #41446A #DBBF70">
    <div
      style="
        max-width: 600px !important;
        display: block!important;
        align-items: center;
        margin: auto !important;
        border-left: 1px solid lightgray !important;
        border-right: 1px solid lightgray !important;
        background-image: url('https://s3.amazonaws.com/zahnymous.io/public_images/bg-body.png') !important;
        background-repeat: no-repeat;
        background-size: contain;
        background-color: #1D1D51;
      "
    >
      <div
        style="
          min-height: 250px;
          width: 100%;
          display: flex !important;
          flex-direction: column!important;
          justify-content: center !important;
          align-items: center !important;
          color: white;
          background-repeat: no-repeat !important;
          background-position: center center !important;
          background-color: transparent !important;
          background-size: cover !important;
        "
      ></div>
      <div
        style="
          width: 100%;
          margin: auto;
          justify-content: center !important;
          row-gap: 1rem;
          padding: 0.8rem;
        "
      >
        <h1
          style="
            font-family: sans-serif !important;
            text-align: left;
            font-size: 20px;
            font-weight: 500;
            align-items: center;
            text-align: center;
            justify-content: center !important;
            color: #DBBF70;
          "
        >
          Dear ZAH User <br />
          Thank You For Purchasing
        </h1>
        <p
          style="
            font-family: sans-serif !important;
            width: 90%;
            align-items: center;
            text-align: center;
            justify-content: center;
            display: flex;
            color: white;
            opacity: 0.7;
            line-height: 25px;
            font-weight: 400;
          "
        >
          Thank you for your purchase from Zahnymous. Please find below the
          details of your order. In case of any queries feel free to contact our
          support team.
        </p>
      </div>
      <div
        style="
          font-family: Poppins, sans-serif !important;
          width: 100%;
          margin-top: 2rem;
          height: 250px;
          margin: auto;
          overflow: auto;
          scrollbar-width: thin;
          scrollbar-color: #41446A #DBBF70;
        "
      >
        <table
          style="
            width: 100%;
            text-align: center;
            position: relative !important;
            border-spacing: 0 !important;
            font-size: 110% !important;
          "
        >
          <tr
            style="
              background: #DBBF70;
              color: #1E1164;
              height: 40px;
              position: sticky !important;
              top: 0 !important;
              font-family: Poppins, sans-serif !important;
            "
          >
            <th
              style="
                background: #DBBF70;
                color: #1E1164;
                position: sticky !important;
                top: 0 !important;
                font-family: Poppins, sans-serif !important;
              "
            >
              #
            </th>
            <th
              style="
                background: #DBBF70;
                color: #1E1164;
                position: sticky !important;
                top: 0 !important;
                font-family: Poppins, sans-serif !important;
              "
            >
              Card Name
            </th>
            <th
              style="
                background: #DBBF70;
                color: #1E1164;
                position: sticky !important;
                top: 0 !important;
                font-family: Poppins, sans-serif !important;
              "
            >
              Code
            </th>
            <th
              style="
                background: #DBBF70;
                color: #1E1164;
                position: sticky !important;
                top: 0 !important;
                font-family: Poppins, sans-serif !important;
              "
            >
              Expiry
            </th>
          </tr>
       ${this.giveMeRows(data)}
        </table>
      </div>
      <br />
      <div
        style="
          background-color: #41446A;
          width: 80%;
          margin: auto;
          border-radius: 10px;

          justify-content: center;
          align-items: center;
          row-gap: 1rem;
          padding: 1rem;
          font-family: Poppins !important;
        "
      >
        <h1
          style="
            font-size: 20px;
            font-weight: bold;
            color: red;
            text-align: center;
            font-family: sans-serif !important;
          "
        >
          Disclaimer
        </h1>
        <ul
          style="
            width: 80%;
            margin: auto;
            color: white;
            opacity: 0.7;
            font-weight: 100;
            font-family: sans-serif !important;
          "
        >
          <li>Each gift card is based on a single-use code.</li>
          <br />
          <li>
            Once sold, the company will not be responsible for losing the gift
            card in case of lost access to the code or expiry.
          </li>
        </ul>
      </div>
      <div
        style="
          height: 70px;
          background-color: #41446A;
          color: white;
          width: 100%;
          margin-top: 3rem;
          display: flex !important;
          font-family: sans-serif !important;
        "
      >
        <div
          style="
            font-size: 17px;
            width: 100% !important;
            text-decoration: underline;
            cursor: pointer;
            text-align: center;
            color: white;
            align-self: center;
            margin: auto;
            font-family: sans-serif !important;
          "
        >
          <a
            href="https://www.zahnymous.io/"
            target="_blank"
            style="
              float: left !important;
              color: #DBBF70;
              margin-left: 0.5rem !important;
              font-size: 11px;
            "
            >www.zahnymous.io/</a
          >
          <a href="https://t.me/Zahnymous" target="_blank"
            ><img
              style="float: right !important; margin-right: 0.5rem"
              src="https://s3.amazonaws.com/zahnymous.io/public_images/telegram.png"
          /></a>
          <a href="https://www.instagram.com/zahnymous/" target="_blank"
            ><img
              style="float: right !important; margin-right: 0.5rem"
              src="https://s3.amazonaws.com/zahnymous.io/public_images/instagram.png"
          /></a>
          <a
            href="https://www.youtube.com/channel/UCs6WmBWwWY9C2C64KqG6rqQ"
            target="_blank"
            ><img
              style="float: right !important; margin-right: 0.5rem"
              src="https://s3.amazonaws.com/zahnymous.io/public_images/youtube.png"
          /></a>
          <a href="https://twitter.com/zahnymous" target="_blank"
            ><img
              style="float: right !important; margin-right: 0.5rem"
              src="https://s3.amazonaws.com/zahnymous.io/public_images/twitter.png"
          /></a>
        </div>
      </div>
    </div>
  </body>
</html>`;
    return template;
  }

  giveMeRows(data) {
    let str = '';
    data.forEach((elem, i) => {
      str += `<tr
            style="
              border-bottom: 1px solid #DBBF70 !important;
              height: 70px;
              color: white;
            "
          >
            <td
              style="
                border-bottom: 1px solid #DBBF70 !important;
                font-weight: lighter;
              "
            >
              ${i + 1}
            </td>
            <td
              style="
                border-bottom: 1px solid #DBBF70 !important;
                font-weight: lighter;
              "
            >
              ${elem.name}
            </td>
            <td
              style="
                border-bottom: 1px solid #DBBF70 !important;
                font-weight: lighter;
              "
            >
              ${elem.voucherCode}
            </td>
            <td
              style="
                border-bottom: 1px solid #DBBF70 !important;
                font-weight: 800!important;
                color:red!important;
              "
            >
              ${elem.validity}
            </td>
          </tr>
          `;
    });
    return str;
  }

  generateMailTemplateForTransak(data) {
    const template = `<html>
  <!-- <head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Poppins&display=swap"
      rel="stylesheet"
    />
    <style>
      div {
        display: block !important;
      }
      body {
        font-family: Poppins, sans-serif !important;
      }
    </style>
  </head> -->
  <body style="scrollbar-width: thin; scrollbar-color: #41446A #DBBF70">
    <div
      style="
        max-width: 600px !important;
        display: block!important;
        align-items: center;
        margin: auto !important;
        border-left: 1px solid lightgray !important;
        border-right: 1px solid lightgray !important;
        background-image: url('https://s3.amazonaws.com/zahnymous.io/public_images/bg-body.png') !important;
        background-repeat: no-repeat;
        background-size: contain;
        background-color: #1D1D51;
      "
    >
      <div
        style="
          min-height: 250px;
          width: 100%;
          display: flex !important;
          flex-direction: column!important;
          justify-content: center !important;
          align-items: center !important;
          color: white;
          background-repeat: no-repeat !important;
          background-position: center center !important;
          background-color: transparent !important;
          background-size: cover !important;
        "
      ></div>
      <div
        style="
          width: 100%;
          margin: auto;
          justify-content: center !important;
          row-gap: 1rem;
          padding: 0.8rem;
        "
      >
        <h1
          style="
            font-family: sans-serif !important;
            text-align: left;
            font-size: 20px;
            font-weight: 500;
            align-items: center;
            text-align: center;
            justify-content: center !important;
            color: #DBBF70;
          "
        >
          Dear ZAH User <br />
          Thank You For Purchasing
        </h1>
        <p
          style="
            font-family: sans-serif !important;
            width: 90%;
            align-items: center;
            text-align: center;
            justify-content: center;
            display: flex;
            color: white;
            opacity: 0.7;
            line-height: 25px;
            font-weight: 400;
          "
        >
          Thank you for your purchase from Zahnymous. Please find below the
          details of your order. In case of any queries feel free to contact our
          support team.
        </p>
      </div>
      <div
        style="
          font-family: Poppins, sans-serif !important;
          width: 100%;
          margin-top: 2rem;
          height: 250px;
          margin: auto;
          overflow: auto;
          scrollbar-width: thin;
          scrollbar-color: #41446A #DBBF70;
        "
      >
        <table
          style="
            width: 100%;
            text-align: center;
            position: relative !important;
            border-spacing: 0 !important;
            font-size: 110% !important;
          "
        >
          <tr
            style="
              background: #DBBF70;
              color: #1E1164;
              height: 40px;
              position: sticky !important;
              top: 0 !important;
              font-family: Poppins, sans-serif !important;
            "
          >
            <th
              style="
                background: #DBBF70;
                color: #1E1164;
                position: sticky !important;
                top: 0 !important;
                font-family: Poppins, sans-serif !important;
              "
            >
              #
            </th>
            <th
              style="
                background: #DBBF70;
                color: #1E1164;
                position: sticky !important;
                top: 0 !important;
                font-family: Poppins, sans-serif !important;
              "
            >
              Order ID
            </th>
            <th
              style="
                background: #DBBF70;
                color: #1E1164;
                position: sticky !important;
                top: 0 !important;
                font-family: Poppins, sans-serif !important;
              "
            >
              Order Status
            </th>
            <th
              style="
                background: #DBBF70;
                color: #1E1164;
                position: sticky !important;
                top: 0 !important;
                font-family: Poppins, sans-serif !important;
              "
            >
              Total Amount
            </th>
          </tr>
       ${this.giveMeRowsTransak(data)}
        </table>
      </div>
      <br />
      <div
        style="
          background-color: #41446A;
          width: 80%;
          margin: auto;
          border-radius: 10px;

          justify-content: center;
          align-items: center;
          row-gap: 1rem;
          padding: 1rem;
          font-family: Poppins !important;
        "
      >
        <h1
          style="
            font-size: 20px;
            font-weight: bold;
            color: red;
            text-align: center;
            font-family: sans-serif !important;
          "
        >
          Disclaimer
        </h1>
        <ul
          style="
            width: 80%;
            margin: auto;
            color: white;
            opacity: 0.7;
            font-weight: 100;
            font-family: sans-serif !important;
          "
        >
          <li>Note</li>
          <br />
          <li>
          All transaction done on transak platform we don't hold any information with us. If you do
          not receive amount within 1 to 2 hours please talk to our support!
          </li>
        </ul>
      </div>
      <div
        style="
          height: 70px;
          background-color: #41446A;
          color: white;
          width: 100%;
          margin-top: 3rem;
          display: flex !important;
          font-family: sans-serif !important;
        "
      >
        <div
          style="
            font-size: 17px;
            width: 100% !important;
            text-decoration: underline;
            cursor: pointer;
            text-align: center;
            color: white;
            align-self: center;
            margin: auto;
            font-family: sans-serif !important;
          "
        >
          <a
            href="https://www.zahnymous.io/"
            target="_blank"
            style="
              float: left !important;
              color: #DBBF70;
              margin-left: 0.5rem !important;
              font-size: 11px;
            "
            >www.zahnymous.io/</a
          >
          <a href="https://t.me/Zahnymous" target="_blank"
            ><img
              style="float: right !important; margin-right: 0.5rem"
              src="https://s3.amazonaws.com/zahnymous.io/public_images/telegram.png"
          /></a>
          <a href="https://www.instagram.com/zahnymous/" target="_blank"
            ><img
              style="float: right !important; margin-right: 0.5rem"
              src="https://s3.amazonaws.com/zahnymous.io/public_images/instagram.png"
          /></a>
          <a
            href="https://www.youtube.com/channel/UCs6WmBWwWY9C2C64KqG6rqQ"
            target="_blank"
            ><img
              style="float: right !important; margin-right: 0.5rem"
              src="https://s3.amazonaws.com/zahnymous.io/public_images/youtube.png"
          /></a>
          <a href="https://twitter.com/zahnymous" target="_blank"
            ><img
              style="float: right !important; margin-right: 0.5rem"
              src="https://s3.amazonaws.com/zahnymous.io/public_images/twitter.png"
          /></a>
        </div>
      </div>
    </div>
  </body>
</html>`;
    return template;
  }

  giveMeRowsTransak(data) {
    let str = '';
    str += `<tr
            style="
              border-bottom: 1px solid #DBBF70 !important;
              height: 70px;
              color: white;
            "
          >
            <td
              style="
                border-bottom: 1px solid #DBBF70 !important;
                font-weight: lighter;
              "
            >
              1
            </td>
            <td
              style="
                border-bottom: 1px solid #DBBF70 !important;
                font-weight: lighter;
              "
            >
              ${data.id}
            </td>
            <td
              style="
                border-bottom: 1px solid #DBBF70 !important;
                font-weight: lighter;
              "
            >
              ${data.status}
            </td>
            <td
              style="
                border-bottom: 1px solid #DBBF70 !important;
                font-weight: 800!important;
                color:red!important;
              "
            >
              ${data.amount}{" "}${data.currency}
            </td>
          </tr>
          `;
    return str;
  }

  async sendEmailError(data: string) {
    try {
      sgMail.setApiKey(this.SENDGRID_API_KEY);
      const message = {
        to: 'muhammadbilalakbar021@gmail.com',
        from: this.EMAIL_FROM,
        subject: 'SchedularError',
        html: data.toString(),
      };

      const mail = await sgMail.send(message);
    } catch (error) {
      console.log(error);
      throw new Error(error.messgae);
    }
  }
}
