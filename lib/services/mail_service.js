const config     = require('../../config/config');
const nodemailer = require('nodemailer');

class MailService{
    constructor(){
        this.transporter = nodemailer.createTransport({
            host: config.get('mail:host'),
            port: config.get('mail:port'),
            secure: true, // true for 465, false for other ports
            auth: {
                user: config.get('mail:username'),
                pass: config.get('mail:password')
            }
        });
    }
    sendMail(to, subject, text){
        let mailOptions = {
            from: 'Brutepool Mailer <' + config.get('mail:address') + '>',
            to: to,
            subject: subject,
            text: text
        };
        this.transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log(error);
            }
            console.log('Message sent: %s', info.messageId);
        });
    }
}
let mailService = new MailService();

module.exports.MailService = mailService;