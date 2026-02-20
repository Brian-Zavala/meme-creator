export const STYLE_DNA_PRESETS = [
    {
        id: 'retro-vhs',
        name: 'Retro VHS',
        fontFamily: 'Bungee',
        textColor: '#ff00ff',
        textBgColor: 'transparent',
        textShadow: '#00ffff',
        letterSpacing: 5,
        animation: 'glitch',
        filters: {
            contrast: 150,
            brightness: 110,
            blur: 0,
            grayscale: 0,
            sepia: 0,
            hueRotate: 0,
            saturate: 180,
            invert: 0,
            deepFry: 0,
        }
    },
    {
        id: 'corporate-minimal',
        name: 'Corporate Minimal',
        fontFamily: 'Montserrat',
        textColor: '#333333',
        textBgColor: '#ffffff',
        textShadow: 'transparent',
        letterSpacing: 2,
        animation: 'none',
        filters: {
            contrast: 100,
            brightness: 100,
            blur: 0,
            grayscale: 100, // Black and white
            sepia: 0,
            hueRotate: 0,
            saturate: 0,
            invert: 0,
            deepFry: 0,
        }
    },
    {
        id: 'deep-fried',
        name: 'Deep Fried',
        fontFamily: 'Impact',
        textColor: '#ffffff',
        textBgColor: 'transparent',
        textShadow: '#000000',
        letterSpacing: 0,
        animation: 'shake',
        filters: {
            contrast: 200,
            brightness: 120,
            blur: 0,
            grayscale: 0,
            sepia: 0,
            hueRotate: 0,
            saturate: 300,
            invert: 0,
            deepFry: 2, // Assuming max deep fry level
        }
    },
    {
        id: 'vapor-wave',
        name: 'Vapor Wave',
        fontFamily: 'Righteous',
        textColor: '#00ffff',
        textBgColor: 'transparent',
        textShadow: '#ff00ff',
        letterSpacing: 10,
        animation: 'float',
        filters: {
            contrast: 120,
            brightness: 110,
            blur: 0,
            grayscale: 0,
            sepia: 30,
            hueRotate: 270, // Shift towards purple/pink
            saturate: 200,
            invert: 0,
            deepFry: 0,
        }
    },
    {
        id: 'dark-academia',
        name: 'Dark Academia',
        fontFamily: 'Cinzel',
        textColor: '#e8dcc4',
        textBgColor: 'transparent',
        textShadow: '#2c251d',
        letterSpacing: 3,
        animation: 'none',
        filters: {
            contrast: 130,
            brightness: 80, // Darker
            blur: 0,
            grayscale: 20,
            sepia: 60, // Brownish tint
            hueRotate: 0,
            saturate: 80, // Desaturated
            invert: 0,
            deepFry: 0,
        }
    },
    {
        id: 'cinematic',
        name: 'Cinematic',
        fontFamily: 'Oswald',
        textColor: '#facc15', // Yellow/Gold
        textBgColor: 'transparent',
        textShadow: '#000000',
        letterSpacing: 15,
        animation: 'pulse',
        filters: {
            contrast: 140,
            brightness: 95,
            blur: 0,
            grayscale: 0,
            sepia: 10,
            hueRotate: 0,
            saturate: 130,
            invert: 0,
            deepFry: 0,
        }
    },
    {
        id: 'synthwave-sunset',
        name: 'Synthwave Sunset',
        fontFamily: 'Bungee',
        textColor: '#ffb86c', // Yellow-orange
        textBgColor: 'transparent',
        textShadow: '#bd93f9', // Purple
        letterSpacing: 8,
        animation: 'none',
        filters: {
            contrast: 130,
            brightness: 105,
            blur: 0,
            grayscale: 0,
            sepia: 10,
            hueRotate: -20, // push towards pink/orange
            saturate: 180,
            invert: 0,
            deepFry: 0,
        }
    },
    {
        id: 'lofi-late-night',
        name: 'Lofi Late Night',
        fontFamily: 'Pacifico', // Script
        textColor: '#e6e6fa', // Lavender
        textBgColor: 'transparent',
        textShadow: '#000000',
        letterSpacing: 2,
        animation: 'float',
        filters: {
            contrast: 90,
            brightness: 85,
            blur: 0,
            grayscale: 10,
            sepia: 20,
            hueRotate: 220, // Blue/Purple night vibe
            saturate: 90,
            invert: 0,
            deepFry: 0,
        }
    },
    {
        id: 'cyber-hacker',
        name: 'Cyber Hacker',
        fontFamily: 'Press Start 2P', // Pixel
        textColor: '#00ff00', // Hacker green
        textBgColor: 'transparent',
        textShadow: '#003300',
        letterSpacing: 0,
        animation: 'glitch',
        filters: {
            contrast: 150,
            brightness: 90,
            blur: 0,
            grayscale: 0,
            sepia: 0,
            hueRotate: 100, // Shift towards green
            saturate: 150,
            invert: 0,
            deepFry: 0,
        }
    },
    {
        id: 'pastel-dream',
        name: 'Pastel Dream',
        fontFamily: 'Fredoka', // Bubbly
        textColor: '#ffffff',
        textBgColor: '#ffb3ba', // Pastel pink
        textShadow: 'transparent',
        letterSpacing: 1,
        animation: 'bounce',
        filters: {
            contrast: 100,
            brightness: 110,
            blur: 0,
            grayscale: 0,
            sepia: 10,
            hueRotate: -10,
            saturate: 140, // Bump saturation for candy look
            invert: 0,
            deepFry: 0,
        }
    },
    {
        id: 'vintage-polaroid',
        name: 'Vintage Polaroid',
        fontFamily: 'Special Elite', // Typerwriter
        textColor: '#2b2b2b',
        textBgColor: '#fdfbf7', // Off-white
        textShadow: 'transparent',
        letterSpacing: 3,
        animation: 'none',
        filters: {
            contrast: 95,
            brightness: 110,
            blur: 0,
            grayscale: 20,
            sepia: 40, // Polaroid fade
            hueRotate: 0,
            saturate: 80,
            invert: 0,
            deepFry: 0,
        }
    },
    {
        id: 'neon-noir',
        name: 'Neon Noir',
        fontFamily: 'Righteous',
        textColor: '#00ffff', // Cyan
        textBgColor: 'transparent',
        textShadow: '#ff0055', // Pink shadow
        letterSpacing: 5,
        animation: 'pulse',
        filters: {
            contrast: 150,
            brightness: 80, // Dark background
            blur: 0,
            grayscale: 20,
            sepia: 0,
            hueRotate: 0,
            saturate: 200, // Popping highlights
            invert: 0,
            deepFry: 0,
        }
    },
    {
        id: 'comic-book',
        name: 'Comic Book',
        fontFamily: 'Bangers', // Loud comic
        textColor: '#ffff00', // Yellow
        textBgColor: 'transparent',
        textShadow: '#000000', // Heavy shadow
        letterSpacing: 2,
        animation: 'shake',
        filters: {
            contrast: 140,
            brightness: 105,
            blur: 0,
            grayscale: 0,
            sepia: 0,
            hueRotate: 0,
            saturate: 200, // Very saturated
            invert: 0,
            deepFry: 0,
        }
    },
    {
        id: 'gothic-horror',
        name: 'Gothic Horror',
        fontFamily: 'Creepster',
        textColor: '#8b0000', // Dark red
        textBgColor: 'transparent',
        textShadow: '#000000',
        letterSpacing: 5,
        animation: 'wave',
        filters: {
            contrast: 150,
            brightness: 70, // Very dark
            blur: 0,
            grayscale: 60, // Mostly desaturated
            sepia: 20,
            hueRotate: 0,
            saturate: 150, // Pop the remaining red
            invert: 0,
            deepFry: 0,
        }
    },
    {
        id: 'golden-hour',
        name: 'Golden Hour',
        fontFamily: 'Lato',
        textColor: '#ffffff',
        textBgColor: 'transparent',
        textShadow: '#d97706', // Amber shadow
        letterSpacing: 4,
        animation: 'none',
        filters: {
            contrast: 110,
            brightness: 115,
            blur: 0,
            grayscale: 0,
            sepia: 40,
            hueRotate: -15, // Golden glow
            saturate: 160,
            invert: 0,
            deepFry: 0,
        }
    },
    {
        id: 'y2k-bling',
        name: 'Y2K Bling',
        fontFamily: 'Anton',
        textColor: '#ff69b4', // Hot pink
        textBgColor: 'transparent',
        textShadow: '#ffffff', // White halo
        letterSpacing: 1,
        animation: 'bounce',
        filters: {
            contrast: 120,
            brightness: 110,
            blur: 0,
            grayscale: 0,
            sepia: 0,
            hueRotate: -30, // Pink shift
            saturate: 180, // Very saturated
            invert: 0,
            deepFry: 0,
        }
    },
    {
        id: 'neo-tokyo',
        name: 'Neo Tokyo',
        fontFamily: 'Bungee',
        textColor: '#ff0055', // Neon pink
        textBgColor: 'transparent',
        textShadow: '#00ffff', // Cyan glow
        letterSpacing: 6,
        animation: 'glitch',
        filters: {
            contrast: 140,
            brightness: 85,
            blur: 0,
            grayscale: 0,
            sepia: 0,
            hueRotate: 240, // Blue shift
            saturate: 220,
            invert: 0,
            deepFry: 0,
        }
    },
    {
        id: 'ukiyo-e',
        name: 'Ukiyo-e Classic',
        fontFamily: 'Lato',
        textColor: '#3b2f2f', // Ink black
        textBgColor: 'transparent',
        textShadow: '#f5f5dc', // Beige/paper
        letterSpacing: 3,
        animation: 'none',
        filters: {
            contrast: 90,
            brightness: 105,
            blur: 0,
            grayscale: 20,
            sepia: 50, // Traditional warm paper
            hueRotate: -10,
            saturate: 70, // Muted colors
            invert: 0,
            deepFry: 0,
        }
    },
    {
        id: 'old-money',
        name: 'Old Money',
        fontFamily: 'Cinzel',
        textColor: '#1a432b', // Hunter green
        textBgColor: '#f1f1e6', // Cream
        textShadow: 'transparent',
        letterSpacing: 4,
        animation: 'none',
        filters: {
            contrast: 110,
            brightness: 95,
            blur: 0,
            grayscale: 10,
            sepia: 25,
            hueRotate: 0,
            saturate: 85,
            invert: 0,
            deepFry: 0,
        }
    },
    {
        id: 'chic-elegance',
        name: 'Chic Elegance',
        fontFamily: 'Montserrat',
        textColor: '#ffffff',
        textBgColor: 'transparent',
        textShadow: '#000000',
        letterSpacing: 8,
        animation: 'none',
        filters: {
            contrast: 115,
            brightness: 105,
            blur: 0,
            grayscale: 80, // Almost black and white
            sepia: 0,
            hueRotate: 0,
            saturate: 20,
            invert: 0,
            deepFry: 0,
        }
    }
];

export const STYLE_KEYWORDS = {
  'retro-vhs': ['retro', 'vintage', '80s', '90s', 'vhs', 'glitch', 'synthwave', 'arcade', 'neon', 'cyberpunk', 'vaporwave', 'old', 'classic', 'aesthetic', 'nostalgia'],
  'corporate-minimalist': ['corporate', 'business', 'office', 'work', 'professional', 'minimal', 'clean', 'simple', 'startup', 'tech', 'smart', 'presentation', 'boss', 'executive', 'meeting'],
  'deep-fried': ['deep', 'fried', 'nuked', 'cursed', 'meme', 'dank', 'funny', 'bruh', 'sus', 'chaos', 'loud', 'bass', 'boosted', 'crazy', 'insane', 'woke', 'surreal'],
  'vapor-wave': ['vaporwave', 'chill', 'aesthetic', 'pink', 'blue', 'cyan', 'statue', 'roman', 'fiji', 'macintosh', 'windows 95', 'lofi', 'sad', 'vibes', 'dream'],
  'dark-academia': ['dark', 'academia', 'gothic', 'school', 'library', 'books', 'study', 'coffee', 'rain', 'classic', 'literature', 'vintage', 'old', 'history', 'art', 'poetry'],
  'cinematic': ['cinematic', 'movie', 'film', 'epic', 'drama', 'action', 'trailer', 'director', 'scene', 'shot', 'focus', 'blur', 'wide', 'letterbox', 'story'],
  'synthwave-sunset': ['sunset', 'synthwave', 'car', 'driving', 'horizon', 'orange', 'purple', 'grid', 'sun', 'palm', 'miami', 'vice', '80s', 'outrun', 'neon'],
  'lofi-late-night': ['lofi', 'night', 'study', 'relax', 'sleep', 'rain', 'window', 'city', 'lights', 'anime', 'calm', 'peaceful', 'quiet', 'lonely', 'midnight'],
  'cyber-hacker': ['cyber', 'hacker', 'code', 'matrix', 'terminal', 'computer', 'green', 'black', 'dark', 'tech', 'data', 'future', 'sci-fi', 'system', 'breach'],
  'pastel-dream': ['pastel', 'dream', 'cute', 'kawaii', 'pink', 'soft', 'clouds', 'sky', 'sweet', 'candy', 'bubblegum', 'anime', 'fluffy', 'magic', 'bubbly'],
  'vintage-polaroid': ['polaroid', 'vintage', 'film', 'camera', 'photo', 'memory', 'nostalgia', 'friend', 'summer', 'faded', 'old', 'retro', 'polaroid', 'instant', 'classic'],
  'neon-noir': ['neon', 'noir', 'dark', 'city', 'rain', 'cyberpunk', 'alley', 'street', 'light', 'glow', 'bladerunner', 'detective', 'mystery', 'crime', 'shadow'],
  'comic-book': ['comic', 'superhero', 'action', 'pow', 'bam', 'hero', 'villain', 'fight', 'manga', 'marvel', 'dc', 'pop', 'art', 'loud', 'crazy'],
  'gothic-horror': ['horror', 'scary', 'blood', 'vampire', 'goth', 'dark', 'creepy', 'spooky', 'ghost', 'halloween', 'monster', 'nightmare', 'terror', 'fear', 'skull'],
  'golden-hour': ['golden', 'hour', 'sun', 'warm', 'glow', 'yellow', 'orange', 'beautiful', 'nature', 'landscape', 'morning', 'evening', 'field', 'mountains', 'peace'],
  'y2k-bling': ['y2k', 'bling', '2000s', 'pink', 'sparkle', 'glitter', 'pop', 'star', 'diva', 'bratz', 'plastic', 'nostalgia', 'retro', 'fashion', 'glam'],
  'neo-tokyo': ['tokyo', 'japan', 'japanese', 'anime', 'manga', 'cyberpunk', 'neon', 'asia', 'shinjuku', 'akihabara', 'city', 'future', 'night', 'samurai', 'mech'],
  'ukiyo-e': ['ukiyo', 'edo', 'traditional', 'japan', 'japanese', 'art', 'painting', 'woodblock', 'samurai', 'zen', 'temple', 'kyoto', 'fuji', 'calm', 'history'],
  'old-money': ['old', 'money', 'wealth', 'rich', 'class', 'classy', 'elegant', 'luxury', 'estate', 'mansion', 'vintage', 'classic', 'suit', 'wine', 'sophisticated'],
  'chic-elegance': ['chic', 'elegance', 'fashion', 'model', 'magazine', 'vogue', 'minimal', 'modern', 'black', 'white', 'runway', 'designer', 'sleek', 'style', 'posh']
};
