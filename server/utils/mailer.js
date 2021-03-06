import sendgrid from '@sendgrid/mail';
import env from '../config/env-config';

const { ADMIN_EMAIL, SITE_NAME: siteName, SENDGRID_KEY } = env;

sendgrid.setApiKey(SENDGRID_KEY);

/**
 * Sends a verification link to a newly signed up user
 *
 * @param {object} options mail options
 * @param {string} options.email Recipient email address
 * @param {string} options.username Recipient username
 * @param {string} options.verificationLink Account verification link
 * @returns {Promise} Sendgrid response
 */
const sendVerificationMail = ({ email, username, verificationLink }) => {
  const mail = {
    to: email,
    from: ADMIN_EMAIL,
    text: `Please follow this link to activate your ${siteName} account:   ${verificationLink}`,
    html: ' ',
    templateId: 'd-6e841534b95240fa929b2fcd78a8ff7f',
    dynamic_template_data: {
      subject: `Verify your account - ${siteName}`,
      siteName,
      username,
      verificationLink
    }
  };

  return sendgrid.send(mail);
};

/**
 * Sends a password reset link to a user's email
 *
 * @param {object} options mail options
 * @param {string} options.email Recipient email address
 * @param {string} options.username Recipient username
 * @param {string} options.resetPasswordLink Account verification link
 * @returns {Promise} Sendgrid response
 */
const sendResetMail = ({ email, username, resetPasswordLink }) => {
  const mail = {
    to: email,
    from: ADMIN_EMAIL,
    text: `Please follow this link to reset your ${siteName} account passoword:  ${resetPasswordLink}`,
    html: ' ',
    templateId: 'd-79785a424ade464192f178d6af66b6d4',
    dynamic_template_data: {
      subject: `Reset your account password - ${siteName}`,
      siteName,
      username,
      resetPasswordLink
    }
  };

  return sendgrid.send(mail);
};

export default {
  sendVerificationMail,
  sendResetMail
};
