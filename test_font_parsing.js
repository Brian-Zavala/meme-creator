
const fetch = require('node-fetch'); // emulate fetch in node

async function testFontParsing() {
    const fonts = ['Bangers', 'Roboto', 'Press Start 2P'];
    const families = fonts.map(f => `family=${f.replace(/ /g, '+')}`).join('&');
    const url = `https://fonts.googleapis.com/css2?${families}&display=swap`;

    console.log(`Fetching CSS from: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const cssText = await response.text();
        console.log('CSS Length:', cssText.length);

        // Regex to find font-family and src
        // Note: Google Fonts CSS usually looks like:
        // @font-face {
        //   font-family: 'Bangers';
        //   font-style: normal;
        //   font-weight: 400;
        //   src: url(https://fonts.gstatic.com/s/bangers/v20/FeVQS0BTqb0h60ACL5la2bxii28.woff2) format('woff2');
        //   unicode-range: ...;
        // }

        const fontFaceRegex = /@font-face\s*{([^}]+)}/g;
        let match;

        while ((match = fontFaceRegex.exec(cssText)) !== null) {
            const block = match[1];
            const familyMatch = block.match(/font-family:\s*['"]?([^'";]+)['"]?/);
            const srcMatch = block.match(/src:\s*url\(([^)]+)\)/);

            if (familyMatch && srcMatch) {
                console.log(`Found Font: ${familyMatch[1]} -> ${srcMatch[1]}`);
            }
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

testFontParsing();
