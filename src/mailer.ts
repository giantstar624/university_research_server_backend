import nodemailer from "nodemailer";

const mailTransporter = nodemailer.createTransport( { 
    service: "hotmail",
    auth: {
        user: "studyinvite@outlook.com",
        pass: "1234!@#$qwerQWER"
    }
 } );

export const sendMail = (target: string, subject: string, content: string) => {
    const mailDetails =  {
        from: 'studyinvite@outlook.com',
        to: target,
        subject,
        text: content,
    };
    
    mailTransporter.sendMail(mailDetails, (err, data) => {
        if (err) {
            console.error("Error occures during send mail", err);
        }
        else {
            console.log("Email sent successfully");
        }
    })
}