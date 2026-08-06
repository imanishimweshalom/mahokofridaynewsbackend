const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({

host: process.env.EMAIL_HOST,

port: process.env.EMAIL_PORT,

secure:false,

auth:{
    user:process.env.EMAIL_USER,
    pass:process.env.EMAIL_PASSWORD
}

});



const sendNewsletter = async ({
    emails,
    subject,
    html
})=>{


await transporter.sendMail({

from:`Mahoko Friday News <${process.env.EMAIL_USER}>`,

bcc:emails,

subject,

html

});


};



module.exports = sendNewsletter;