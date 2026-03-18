/**
 * JMC Test — Simple Icon Copy Script 
 * Copies logo.png as icon files for PWA (browsers handle resizing)
 * Run: node copy-icons.js
 */
const fs = require('fs');
const path = require('path');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const srcLogo = path.join(__dirname, 'logo.png');
const iconDir = path.join(__dirname, 'icons');

if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

if (!fs.existsSync(srcLogo)) {
  console.error('❌ logo.png not found!');
  process.exit(1);
}

const logoBuffer = fs.readFileSync(srcLogo);

SIZES.forEach(size => {
  const dest = path.join(iconDir, `icon-${size}x${size}.png`);
  fs.writeFileSync(dest, logoBuffer);
  console.log(`✅ Created: icon-${size}x${size}.png`);
});

// Screenshots
['screenshot-wide', 'screenshot-narrow'].forEach(name => {
  const dest = path.join(iconDir, `${name}.png`);
  fs.writeFileSync(dest, logoBuffer);
  console.log(`✅ Created: ${name}.png`);
});

console.log('\n✨ All icon files created successfully!');
