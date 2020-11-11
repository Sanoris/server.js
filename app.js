const express = require('express');
const https = require('https');
const throttledQueue = require('throttled-queue');
const sleep = require('system-sleep');
const app = express();
var jsonfile = require('./places.json');
const fs = require('fs');
const xlsx = require('xlsx-to-json');

var jsonobj;
var myfile = jsonfile;
var latlngPairs = [];

xlsx({
    input: 'C:/Users/Matthew/rest/FAA.xlsx',
    output: null,
    sheet: 'Existing TDM Services'
}, function(err, result){
    if(err){
        console.error(err);
    }else{
        jsonobj = result;
        extractLatLongPairs(jsonobj);
    }
});

//search all known lat lng, if not known => find the lat lng
//push the starting location and the destination location to myfile
//generate the pair of latlngs to draw a line between. 
function extractLatLongPairs(jsonobj){
    for(var i = 0; i<jsonobj.length; i++){
        if(i%15 == 0){
            sleep(50);
        }
        let promises = [googlePlace(jsonobj[i]['From LID']), googlePlace(jsonobj[i]['To LID'])];
        /* if(temp0 == 'false'){
            await googlePlace(jsonobj[i]['From LID']);
        }else{
            //stuff
            myfile.push(temp0);
        }
        if(temp1 == 'false'){
            await googlePlace(jsonobj[i]['To LID']);
        }else{
            //stuff
            myfile.push(temp1);
        } */
        //temp0 & temp1 = {name: '', location: {lat: '', lng: ''}}
        Promise.all(promises).then((results) => {
            temp2 = [results[0], results[1]];
            latlngPairs.push(temp2);
            //console.log(latlngPairs);
        }).catch((res) => {
            console.log('Error with googlePlace results. Airportcode searched for is: ' + res);
        });
        
    }
    //write latlongs to file
}

//pass in an airport name, return the json object {name: '', lat: '', long: ''} if the name is found
//otherwise, return the string 'false'
function findinFile(airport){
    return new Promise((resolve, reject) => {
        for(var i = 0; i<myfile.length-1; i++){
            if(myfile[i].name == airport){
                resolve(myfile[i]);
            }
        }
        resolve('false');
    })
    
}

//find the lat lng of the passed value(airport)
function googlePlace(airport){
    return new Promise((resolve, reject) => {
        temp0 = findinFile(airport);
        temp0.then((results) => {
            if(results == 'false'){
                var options = {agent: false};
                https.get('https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=airport%20code%20' + airport + '&inputtype=textquery&fields=geometry&key=AIzaSyA5K1yjYdbKkUNgp-Gz8sJHYrHHUpDRTqg', (resp) => {
                    let data = '';
            
                    // A chunk of data has been recieved.
                    resp.on('data', (chunk) => {
                        data += chunk;
                    });
            
                    // The whole response has been received. Return the json object
                    resp.on('end', () => {
                        data = JSON.parse(data);
                        if(data.candidates[0]){
                            let obj = {
                                name: airport,
                                location: data.candidates[0].geometry.location
                            };
                            myfile.push(obj);
                            //console.log('latlong should print after this');
                            resolve(obj);
                        }else{
                            reject(airport);
                        }
                        });
            
                    }).on("error", (err) => {
                        console.log("Error: " + err.message);
            
                });
            }else{
                console.log('found the airport in file');
                resolve(results);
            }
        });
    });

}

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.send(latlngPairs);
    fs.writeFile('places.json', JSON.stringify(myfile), (err) => {
        if (err) return console.log(err);
        console.log('Wrote the file');
        console.log('latlngPairs: ' + latlngPairs.length);
    });
});

module.exports = app;