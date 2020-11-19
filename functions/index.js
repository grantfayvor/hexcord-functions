const functions = require('firebase-functions');
const admin = require('firebase-admin');
const app = require('express')();
const cors = require('cors');
const nodemailer = require('nodemailer');

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

const saveEmail = async (request, response) => {
  const address = request.body.emailAddress;

  // eslint-disable-next-line no-useless-escape
  if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(address)) {
    return response.status(400).json({ error: "Invalid email address" });
  }

  try {
    await db.collection("emails").doc(address).set({ address, active: true });
    const mailOptions = {
      from: {
        name: "Hexcord",
        address: mailFrom
      },
      to: address,
      subject: 'Welcome Aboard! You would be alerted as soon as the Hexcord service is up.',
      html: `<p>Thanks for signing up for early access</p>`
    };

    await mailTransporter.sendMail(mailOptions);

    return response.json({ success: true });
  } catch (error) {
    functions.logger.error("Save Email ---", error);
    return response.status(500).json({ error: "An error occurred while attempting to save the email address" });
  }
};

const unsubscribeEmail = async (request, response) => {
  const address = request.body.emailAddress;

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

exports.api = functions.https.onRequest(app);