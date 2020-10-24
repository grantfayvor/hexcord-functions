const functions = require('firebase-functions');
const admin = require('firebase-admin');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

admin.initializeApp();

const db = admin.firestore();

exports.saveEmail = functions.https.onRequest(async (request, response) => {
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
});