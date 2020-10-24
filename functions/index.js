const functions = require('firebase-functions');
const admin = require('firebase-admin');
const app = require('express')();
const cors = require('cors');

app.use(cors({ origin: true }));

admin.initializeApp();

const db = admin.firestore();

const saveEmail = async (request, response) => {
  const address = request.body.emailAddress;

  // eslint-disable-next-line no-useless-escape
  if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(address)) {
    return response.status(400).json({ error: "Invalid email address" });
  }

  try {
    await db.collection("emails").add({ address });
    return response.json({ success: true });
  } catch (error) {
    functions.logger.error("Save Email ---", error);
    return response.status(500).json({ error: "An error occurred while attempting to save the email address" });
  }
};

app.post('/saveEmail', saveEmail);

exports.api = functions.https.onRequest(app);