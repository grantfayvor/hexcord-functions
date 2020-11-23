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
  <style>
    .button__link {
      border: none;
      background: none;
      padding: 0;
      text-decoration: underline;
      cursor: pointer;
      outline: none;
      color: #069;
    }
  </style>
  <p>Hi there!</p>
  <p>
    So excited to have you onboard! We can't wait to have you try out Hexcord and as an early bird of course you get beta access.
    How sweet is that? I knowwww.
    Hexcord would be launching by the beginning of December and you can expect to be alerted the moment it is available.
  </p>
  <p>
    If this was a mistake however and you didn't mean to sign up for beta access, it'll be sad :( to see you leave but you can unsubscribe 
    <a href="${unsubscribeURI}" target="_blank">here.</a>
  </p>
  <p>Cheers!</p>
  <p>Hexcord.</p>
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
      subject: 'Welcome Aboard! You would be alerted as soon as the Hexcord service is up.',
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