const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.email.host,
      port: env.email.port,
      secure: false,
      auth: env.email.user ? { user: env.email.user, pass: env.email.pass } : undefined,
      connectionTimeout: 2000,
      greetingTimeout: 2000,
      socketTimeout: 2000,
    });
  }
  return transporter;
}

async function sendSubmissionNotification({ widget, submission, ownerEmail }) {
  if (!env.email.enabled) return;
  const lines = Object.entries(submission.payload)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  const geo = submission.geo
    ? `${submission.geo.city ?? ''} ${submission.geo.country ?? ''}`.trim()
    : 'unavailable';

  await getTransporter().sendMail({
    from: env.email.from,
    to: ownerEmail,
    subject: `New ${widget.type} submission - ${widget.title}`,
    text: [
      `Widget: ${widget.title} (${widget.id})`,
      `Submission: ${submission.id}`,
      `Received: ${submission.createdAt}`,
      `Geo: ${geo}`,
      '',
      lines,
    ].join('\n'),
  });
}

function notify({ widget, submission, ownerEmail }) {
  sendSubmissionNotification({ widget, submission, ownerEmail }).catch((err) => {
    console.error(`email side effect failed: ${err.message}`);
  });
}

module.exports = { notify };
