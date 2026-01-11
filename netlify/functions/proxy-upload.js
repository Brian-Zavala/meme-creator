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
        console.log("Upload Size (Approx):", event.body.length);
        const busboy = Busboy({ headers: event.headers });

        busboy.on('file', (fieldname, file, info) => {
            try {
                const chunks = [];
                file.on('data', (data) => chunks.push(data));
                file.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    // Tmpfiles expects 'file'

                    // Use the provided filename (sanitized) to preserve the "Tenor" name if possible
                    let originalName = (info && info.filename) ? info.filename : `meme-${Date.now()}.gif`;
                    let safeFilename = originalName.replace(/[^a-zA-Z0-9\-\.]/g, '_');

                    if (!safeFilename.toLowerCase().endsWith('.gif')) {
                        safeFilename += '.gif';
                    }
                    if (safeFilename === '.gif' || !safeFilename) {
                         safeFilename = `meme-${Date.now()}.gif`;
                    }

                    formData.append('file', buffer, { filename: safeFilename, contentType: 'image/gif' });
                });
            } catch (err) {
                console.error("Busboy File Handler Error:", err);
                reject(err);
            }
        });

        busboy.on('finish', resolve);
        busboy.on('error', reject);

        // Busboy expects raw stream, but Netlify gives base64 encoded body if binary
        busboy.write(event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body);
        busboy.end();
    });

    await parsePromise;

    // 2. Upload to Tmpfiles.org (More reliable than Catbox for proxies)
    // API Endpoint: https://tmpfiles.org/api/v1/upload
    return new Promise((resolve, reject) => {
        const request = https.request('https://tmpfiles.org/api/v1/upload', {
            method: 'POST',
            headers: formData.getHeaders()
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log("Tmpfiles Response:", res.statusCode, data);
                if (res.statusCode === 200) {
                   try {
                       const json = JSON.parse(data);
                       // Tmpfiles returns: { data: { url: "https://tmpfiles.org/..." } }
                       // The DL link is: https://tmpfiles.org/dl/[id]/filename.gif
                       const originalUrl = json.data.url;
                       const dlUrl = originalUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');

                       resolve({
                           statusCode: 200,
                           headers,
                           body: JSON.stringify({ url: dlUrl })
                       });
                   } catch (e) {
                       resolve({ statusCode: 502, headers, body: JSON.stringify({ error: "Invalid JSON from host" }) });
                   }
                } else {
                    resolve({
                        statusCode: 502,
                        headers,
                        body: JSON.stringify({ error: 'Tmpfiles API Error', details: data })
                    });
                }
            });
        });

        request.on('error', (e) => {
            console.error("Upstream Request Error:", e);
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
