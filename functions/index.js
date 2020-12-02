const functions = require('firebase-functions');
const admin = require('firebase-admin');
const app = require('express')();
const cors = require('cors');
const nodemailer = require('nodemailer');

const HEXCORD_WEB = "https://www.hexcord.com";

app.use(cors({ origin: true }));

admin.initializeApp();

const db = admin.firestore();

const mailFrom = functions.config().mail.user;
const mailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: mailFrom,
    pass: functions.config().mail.password
  }
});

const emailTemplate = ({ unsubscribeURI }) => `
  <section style="margin: 0 5%;">
    <header style="background: #0000FF;width: 100%;height: 78px;text-align: center;">
      <span style="display: inline-block;height: 100%;vertical-align: middle;"></span>
      <a style="text-decoration: none;" href="https://www.hexcord.com"><img alt="Hexcord Logo" style="vertical-align: middle;" src="https://res.cloudinary.com/hyper-debugger/image/upload/v1606919638/hexcord_logo.png" /></a>
    </header>
    <section style="background: #F8F8FF;">
      <div style="width: 70%;margin: auto;">
        <p style="font-weight:bold;font-family: Lato;font-style: normal;font-size: 16px;line-height: 26px;color: #080708;margin-bottom: 20px;">Welcome aboard!</p>
        <p style="font-family: Lato;font-style: normal;font-size: 16px;line-height: 26px;color: #080708;margin-bottom: 20px;">
          So excited to have you onboard! We can't wait to have you try out Hexcord.
        </p>
        <p style="font-family: Lato;font-style: normal;font-size: 16px;line-height: 26px;color: #080708;margin-bottom: 20px;">
          As an early bird of course you get beta access.
          How sweet is that? I knowwww!
          Hexcord would be launching by the beginning of December and you can expect to be alerted the moment it is
          available.
        </p>
        <p style="font-family: Lato;font-style: normal;font-size: 16px;line-height: 26px;color: #080708;margin-bottom: 20px;">Reply this email if you have any questions.</p>
        <p style="font-family: Lato;font-style: normal;font-size: 16px;line-height: 26px;color: #080708;margin-bottom: 20px;">Cheers!</p>
        <p style="font-family: Lato;font-style: normal;font-size: 16px;line-height: 26px;color: #080708;margin-bottom: 20px;">Hexcord.</p>
        <footer style="border-top: 1px solid #E6E6FF;border-bottom: 1px solid #E6E6FF;padding-top: 20px;margin-bottom: 20px;">
          <p style="font-family: Lato;font-style: normal;font-size: 14px;line-height: 23px;color: #424273;margin-bottom: 20px;">
            If this was a mistake however and you didn't mean to sign up for beta access, it'll be sad :( to see you
            leave
            but you can unsubscribe
            <a href="${unsubscribeURI}" target="_blank">here.</a>
          </p>
        </footer>
        <a style="text-decoration: none;" href="https://twitter.com/thehexcord">
          <span style="display: inline-block;width: 29px;height: 22.75px;background: url(https://res.cloudinary.com/hyper-debugger/image/upload/v1606919620/twitter_icon.png);"></span>
        </a>
      </div>
    </section>
  </section>
`;

const saveEmail = async (request, response) => {
  const address = request.body.emailAddress;

  // eslint-disable-next-line no-useless-escape
  if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(address)) {
    return response.status(400).json({ error: "Invalid email address" });
  }

  try {
    const { _fieldsProto: existing } = await db.collection("emails").doc(address).get();
    if (existing && existing.active && existing.active[existing.active.valueType]) return response.json({ success: true });

    await db.collection("emails").doc(address).set({ address, active: true, created_at: new Date });
    const unsubscribeURI = encodeURI(`${HEXCORD_WEB}/u?e=${Buffer.from(address).toString('base64')}`);
    const mailOptions = {
      from: {
        name: "Hexcord",
        address: mailFrom
      },
      to: address,
      subject: 'Hi there! Welcome Aboard.',
      html: emailTemplate({ unsubscribeURI }),
    };

    mailTransporter.sendMail(mailOptions)
      .then(info => {
        if (!info.accepted.includes(address)) throw new Error("Invalid email address");
        return db.collection("emails").doc(address).update({ verified: true, verified_at: new Date });
      })
      .catch(error => {
        functions.logger.error("Verify Email ---", error);
      });

    return response.json({ success: true });
  } catch (error) {
    functions.logger.error("Save Email ---", error);
    return response.status(500).json({ error: "An error occurred while attempting to save the email address" });
  }
};

const unsubscribeEmail = async (request, response) => {
  const address = request.body.emailAddress || request.query.emailAddress;

  // eslint-disable-next-line no-useless-escape
  if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(address)) {
    return response.status(400).json({ error: "Invalid email address" });
  }

  try {
    await db.collection("emails").doc(address).update({ active: false });

    return response.json({ success: true });
  } catch (error) {
    functions.logger.error("Unsubscribe Email ---", error);
    return response.status(500).json({ error: "An error occurred while attempting to unsubscribe the email address" });
  }
};

app.post('/saveEmail', saveEmail);
app.put('/unsubscribeBeta', unsubscribeEmail);
app.get('/unsubscribeBeta', unsubscribeEmail);

exports.api = functions.https.onRequest(app);