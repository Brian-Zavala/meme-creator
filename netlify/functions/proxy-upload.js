const Busboy = require('busboy');
const https = require('https');
const FormData = require('form-data');

exports.handler = async (event, context) => {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'OK' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    // 1. Parse the incoming multipart/form-data (the GIF)
    const formData = new FormData();
    const parsePromise = new Promise((resolve, reject) => {
        const busboy = Busboy({ headers: event.headers });

        busboy.on('file', (fieldname, file, info) => {
            const chunks = [];
            file.on('data', (data) => chunks.push(data));
            file.on('end', () => {
                const buffer = Buffer.concat(chunks);
                // Append exactly as Catbox expects: 'reqtype', 'userhash' (optional), 'fileToUpload'
                formData.append('reqtype', 'fileupload');
                formData.append('fileToUpload', buffer, { filename: info.filename, contentType: info.mimeType });
            });
        });

        busboy.on('finish', resolve);
        busboy.on('error', reject);

        // Busboy expects raw stream, but Netlify gives base64 encoded body if binary
        busboy.write(event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body);
        busboy.end();
    });

    await parsePromise;

    // 2. Upload to Catbox.moe
    // API Endpoint: https://catbox.moe/user/api.php
    return new Promise((resolve, reject) => {
        const request = https.request('https://catbox.moe/user/api.php', {
            method: 'POST',
            headers: formData.getHeaders()
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                   resolve({
                       statusCode: 200,
                       headers,
                       body: JSON.stringify({ url: data.trim() })
                   });
                } else {
                    resolve({
                        statusCode: 502,
                        headers,
                        body: JSON.stringify({ error: 'Catbox API Error', details: data })
                    });
                }
            });
        });

        request.on('error', (e) => {
            resolve({
                statusCode: 502,
                headers,
                body: JSON.stringify({ error: 'Upload Failed', details: e.message })
            });
        });

        formData.pipe(request);
    });

  } catch (error) {
    console.error("Proxy Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
