const nodemailer = require("nodemailer");
const fs = require("fs");
const readline = require("readline");

//Kjøre programmet som foretar spørring og lagrer HTML-TABELL av resultatet
var execSync = require('child_process').execSync;
execSync("node .//spoerringForsendelsesMaaterHSP.js");

let transportOptions = require("./interneData/transportOptions.js");

let transporter = nodemailer.createTransport(transportOptions);

//leser inn tabellen
var returtext = fs.readFileSync('ReturerTabell.html', 'utf8', (err, fildata) => {
      if(err){
          return console.log(err);
      }
    return fildata;
  });

let htmlstart = fs.readFileSync("htmlSTART.html", "utf-8", (err, data) => {
    if(err) return console.log(err);
    return data;
});

let htmlslutt = fs.readFileSync("htmlSLUTT.html", "utf-8", (err, data) => {
    if(err) return console.log(err);
    return data;
});

returtext = htmlstart + returtext + htmlslutt;

require("./interneData/mailOptions.js");
console.log(JSON.stringify(mailOptions, undefined, 2));

mailOptions.html = returtext;

//Sende mailen:
transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        return console.log(error);
    }
    console.log('Mail %s sendt %s', info.messageId, info.response);
});

