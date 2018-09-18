const Connection = require('tedious').Connection;
const Request = require('tedious').Request;
const os = require("os");
const fs = require('fs');
const moment = require("moment");
const numeral = require("numeral");

var rapportStartDato = moment().subtract(1, 'month');
var rappDatoStartFormatert = moment(rapportStartDato).year() + "-" + numeral(moment(rapportStartDato).month() + 1).format('00') + '-01';

var rapportSluttDato = moment(rapportStartDato).endOf('month');
var rappDatoSluttFormatert = moment(rapportSluttDato).format("YYYY-MM-DD");
var tellerPoster = 0;
var merkevarer = {};

var config = require("./interneData/dbconfig.js");

var connection = new Connection(config);

connection.on('connect', (err) => {
    if (err) {
        return console.log(err);
    }
    queryDatabase();

});

function queryDatabase(){
    var rapportsql = require("./interneData/hspRapport.js")(rappDatoStartFormatert,rappDatoSluttFormatert);
    // console.log(rapportsql);

    var rensetData = [];
    var rensetData2 = [];
    var samleObjekt = [];
    var chacheobjekt ={};
    var dynamiskeOverskrifter = [];
    var foersteRAD = [];
    var tabellen = [];


    request = new Request(rapportsql, (err, rowCount, rows) => {
        if (err) {
            return console.log(err);
        }

        connection.close();
        let i = 0;
        rensetData2.forEach((underArray) => {
            underArray.forEach((underObjekt) => {
            // console.log(underObjekt.metadata.colName, " ", underObjekt.value);
            chacheobjekt[underObjekt.metadata.colName] = underObjekt.value;
            samleObjekt[i] = chacheobjekt;
            });
            chacheobjekt = {};
            i++;
        });

        
        var totaltAntallReturer = 0;
        var overskrift = 'Totalt\nantall\nreturer i\nperioden';
        

        // console.log(overskrift[0]);
        samleObjekt.forEach((objektene)=> {
            //Huske at antall er hele objektet i arrayet
            totaltAntallReturer += objektene.antall;
            //console.log(objektene['FORSENDELSESMÅTE']);
           
            if (dynamiskeOverskrifter.indexOf(objektene['FORSENDELSESMÅTE']) === -1) {
           
                dynamiskeOverskrifter.push(objektene['FORSENDELSESMÅTE']);
            }
            
        });
        
        console.log("Totalt antall = ", totaltAntallReturer);
        //overskrift[1] = totaltAntallReturer;
        console.log("Dynamiske overskrifter", dynamiskeOverskrifter)
        
        foersteRAD.push(overskrift);
        foersteRAD.push(totaltAntallReturer);
        dynamiskeOverskrifter.forEach((overskrift) => {
            foersteRAD.push(overskrift);
        });
        foersteRAD.push("Codesen");

        tabellen.push(foersteRAD);
        var testerObject = {};

        // console.log("samleObjekt.length: ", samleObjekt.length);
        var teller = 0;
        //for (var ti = 0; ti <= samleObjekt.length; ti++) {
        var tabellenCache = [];

        samleObjekt.forEach((objektene) => {
            
            tabellenCache.push(objektene.MERKENAVN);
            tabellenCache.push('SUMMEN AV ANTALLEN PER MERKENAVN');
            let plassering = dynamiskeOverskrifter.indexOf(objektene.FORSENDELSESMÅTE);
            plassering+= 2;
            tabellenCache[plassering] = objektene.antall
            // console.log("teller: ", teller);
            teller++;
            // console.log("I lokken: ", objektene.MERKENAVN, " antall ", objektene.antall, " forsendelsesmåte: ", objektene.FORSENDELSESMÅTE);
            tabellen.push(tabellenCache);
            tabellenCache = [];

            //console.log(objektene);

            if (!testerObject.hasOwnProperty(objektene.MERKENAVN)) {
                testerObject[objektene.MERKENAVN] = {[objektene.FORSENDELSESMÅTE]:objektene.antall};
                testerObject[objektene.MERKENAVN]["CodeSEN"] = objektene.CodeSEN;
            }  else {
                if (!testerObject[objektene.MERKENAVN].hasOwnProperty([objektene.FORSENDELSESMÅTE])) {
                    testerObject[objektene.MERKENAVN][objektene.FORSENDELSESMÅTE] = objektene.antall;
                } else {
                    let antall = testerObject[objektene.MERKENAVN][objektene.FORSENDELSESMÅTE];
                    antall += objektene.antall;
                    testerObject[objektene.MERKENAVN][objektene.FORSENDELSESMÅTE] = antall;
                }
            }

        });
        
        //HER SUMMERES ALLE TYPENE FORSENDELSESMÅTE
        let underOverskriftsrad = {};
            parsertObjekt = JSON.stringify(testerObject, undefined, 2);
            parsertObjekt = JSON.parse(parsertObjekt);
            dynamiskeOverskrifter.forEach((overskrift) =>  {
                let objektnokler = Object.keys(parsertObjekt);

                objektnokler.forEach((enkeltnokkel) => {
                    if(parsertObjekt[enkeltnokkel].hasOwnProperty(overskrift)) {
                        //console.log("parseObjekt[", enkeltnokkel, "] har verdien ",overskrift);
                        if (parsertObjekt[enkeltnokkel].hasOwnProperty("sum")) {
                            parsertObjekt[enkeltnokkel]["sum"] = parsertObjekt[enkeltnokkel]["sum"] + parsertObjekt[enkeltnokkel][overskrift];    
                        } else {
                            parsertObjekt[enkeltnokkel]["sum"] = parsertObjekt[enkeltnokkel][overskrift];
                        }

                        
                    } else { //Her finnes ikke overskriften i formålet, og vi legger en til med verdien 0
                        parsertObjekt[enkeltnokkel][overskrift] = 0;
                    }
                });
            });
            //HER ER ALLE FORSENDELSESMÅTENE SUMMERT
            // console.log("Etter summmering\n",parsertObjekt);


        //fs.writeFile('json.txt',JSON.stringify(samleObjekt, undefined, 2), (err) => {
        fs.writeFile('json.txt',JSON.stringify(parsertObjekt, undefined, 2), (err) => {
                if(err){
                    return console.log(err);
                }
        });

        //Bygge HTML-tabell
        let objektnokler = Object.keys(parsertObjekt);
        let htmltabell = `<h2>Rapport for periode ${rappDatoStartFormatert} til ${rappDatoSluttFormatert}</h2><br>`
        htmltabell += '<table>' + "\n\t" + "<tr>" + "\n\t";
        htmltabell += "\t" + '<td>Totalt<br>antall<br>returer<br>i<br>perioden</td>' + "\n";
        htmltabell += "\t\t" + '<td>' + totaltAntallReturer + "</td>" + "\n";
        dynamiskeOverskrifter.forEach((overskift) => {
            htmltabell += "\t\t<td>" + overskift + "</td>" + "\n";
        });
        htmltabell += "\t\t<td>CodeSEN</td>\n";
        htmltabell += "\t" + '</tr>' + "\n\t";



        objektnokler.forEach((enkeltnokkel) => {
            htmltabell+="\t<tr>";
            htmltabell+="\t\t<td>";
            htmltabell+=enkeltnokkel;
            htmltabell+='</td>' + "\n";
            htmltabell+="\t\t<td>";
            htmltabell+=parsertObjekt[enkeltnokkel]["sum"];
            htmltabell+='</td>' + "\n";

            dynamiskeOverskrifter.forEach((overskrift) => {
                htmltabell+="\t\t<td>";                
                htmltabell+=parsertObjekt[enkeltnokkel][overskrift];
                htmltabell+='</td>' + "\n";
            });
            htmltabell+="\t\t<td>";
            htmltabell+=parsertObjekt[enkeltnokkel]["CodeSEN"];
            htmltabell+='</td>' + "\n";
            htmltabell += '</tr>' + "\n\t";
        });
        htmltabell+='</table>';
        // console.log(htmltabell);

        fs.writeFile('ReturerTabell.html',htmltabell, (err) => {
            if(err){
                return console.log(err);
            }
        });

    });

    var preLine = [];
    
    request.on('row', (columns) => {
        //console.log(JSON.stringify(columns, undefined, 2));
        // htmlRapport += '\t<tr>\n';
        columns.forEach((column) => {
            // console.log(column.value);
            if(column.metadata.colName == 'Merkevare') {
                if(!(merkevarer.hasOwnProperty(column.value))){
                    merkevarer[column.value] = 1;
                    //rensetData2 = $.extend(column.metadata.colName,column.value);

                } else merkevarer[column.value] = merkevarer[column.value] + 1;
            }
            rensetData.push(column.value);
             if (preLine.indexOf(column.metadata.colName) < 0) {
            preLine.push(column.metadata.colName);
            }
        });
        
        if (teller = columns.length - 1) {
            teller = 0;
        } else { teller++; }
        tellerPoster++;
        rensetData2.push(columns);
        
    });

    connection.execSql(request);
}

 