/**
 * Color Audit Script - NexBuy
 * Enforces NO PURPLE/VIOLET colors (HSL hue 260-300°)
 * Parses compiled CSS and fails CI on violations
 * 
 * Usage: node scripts/auditColors.js [css-file-path]
 */

const fs = require('fs');
const path = require('path');

// Purple/Violet hue range to reject (260-300 degrees)
const FORBIDDEN_HUE_MIN = 260;
const FORBIDDEN_HUE_MAX = 300;

// Regex patterns for different color formats
const COLOR_PATTERNS = {
  hex: /#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})\b/g,
  rgb: /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)/g,
  hsl: /hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*[\d.]+\s*)?\)/g,
  colorNames: /\b(purple|violet|indigo|magenta|orchid|plum|lavender|fuchsia|thistle)\b/gi
};

/**
 * Convert HEX to RGB
 */
function hexToRgb(hex) {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Handle shorthand (e.g., #abc => #aabbcc)
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return { r, g, b };
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * Check if hue is in forbidden purple range
 */
function isForbiddenHue(hue) {
  return hue >= FORBIDDEN_HUE_MIN && hue <= FORBIDDEN_HUE_MAX;
}

/**
 * Parse and audit all colors in CSS content
 */
function auditColors(cssContent, filePath) {
  const violations = [];
  const allColors = new Set();
  
  // Track line numbers for violations
  const lines = cssContent.split('\n');
  
  // Find HEX colors
  let match;
  while ((match = COLOR_PATTERNS.hex.exec(cssContent)) !== null) {
    const hexColor = match[0];
    const rgb = hexToRgb(hexColor);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    
    allColors.add(hexColor);
    
    if (isForbiddenHue(hsl.h)) {
      const lineNumber = cssContent.substring(0, match.index).split('\n').length;
      violations.push({
        type: 'HEX',
        color: hexColor,
        hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
        line: lineNumber,
        snippet: lines[lineNumber - 1]?.trim() || ''
      });
    }
  }
  
  // Find RGB colors
  COLOR_PATTERNS.rgb.lastIndex = 0;
  while ((match = COLOR_PATTERNS.rgb.exec(cssContent)) !== null) {
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    const hsl = rgbToHsl(r, g, b);
    
    const rgbColor = match[0];
    allColors.add(rgbColor);
    
    if (isForbiddenHue(hsl.h)) {
      const lineNumber = cssContent.substring(0, match.index).split('\n').length;
      violations.push({
        type: 'RGB',
        color: rgbColor,
        hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
        line: lineNumber,
        snippet: lines[lineNumber - 1]?.trim() || ''
      });
    }
  }
  
  // Find HSL colors (direct check)
  COLOR_PATTERNS.hsl.lastIndex = 0;
  while ((match = COLOR_PATTERNS.hsl.exec(cssContent)) !== null) {
    const hue = parseFloat(match[1]);
    const hslColor = match[0];
    
    allColors.add(hslColor);
    
    if (isForbiddenHue(hue)) {
      const lineNumber = cssContent.substring(0, match.index).split('\n').length;
      violations.push({
        type: 'HSL',
        color: hslColor,
        hsl: hslColor,
        line: lineNumber,
        snippet: lines[lineNumber - 1]?.trim() || ''
      });
    }
  }
  
  // Find color names
  COLOR_PATTERNS.colorNames.lastIndex = 0;
  while ((match = COLOR_PATTERNS.colorNames.exec(cssContent)) !== null) {
    const lineNumber = cssContent.substring(0, match.index).split('\n').length;
    violations.push({
      type: 'COLOR_NAME',
      color: match[0],
      hsl: 'N/A (color name)',
      line: lineNumber,
      snippet: lines[lineNumber - 1]?.trim() || ''
    });
  }
  
  return { violations, totalColors: allColors.size };
}

/**
 * Scan CSS file or directory
 */
function scanPath(targetPath) {
  if (!fs.existsSync(targetPath)) {
    console.error(`❌ Path not found: ${targetPath}`);
    process.exit(1);
  }
  
  const stats = fs.statSync(targetPath);
  const cssFiles = [];
  
  if (stats.isDirectory()) {
    // Recursively find all CSS files
    const findCssFiles = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const fileStat = fs.statSync(filePath);
        
        if (fileStat.isDirectory()) {
          findCssFiles(filePath);
        } else if (file.endsWith('.css')) {
          cssFiles.push(filePath);
        }
      });
    };
    
    findCssFiles(targetPath);
  } else if (targetPath.endsWith('.css')) {
    cssFiles.push(targetPath);
  }
  
  return cssFiles;
}

/**
 * Main execution
 */
function main() {
  console.log('🎨 NexBuy Color Audit Tool');
  console.log('=' .repeat(50));
  console.log(`🚫 Forbidden hue range: ${FORBIDDEN_HUE_MIN}° - ${FORBIDDEN_HUE_MAX}° (Purple/Violet)`);
  console.log('=' .repeat(50));
  console.log('');
  
  // Get target path from args or default to frontend/css
  const targetPath = process.argv[2] || path.join(__dirname, '..', 'frontend', 'css');
  
  console.log(`📁 Scanning: ${targetPath}\n`);
  
  const cssFiles = scanPath(targetPath);
  
  if (cssFiles.length === 0) {
    console.log('⚠️  No CSS files found to audit.');
    process.exit(0);
  }
  
  console.log(`📄 Found ${cssFiles.length} CSS file(s) to audit:\n`);
  
  let totalViolations = 0;
  const allViolations = [];
  
  cssFiles.forEach(filePath => {
    console.log(`   Checking: ${path.relative(process.cwd(), filePath)}`);
    
    const cssContent = fs.readFileSync(filePath, 'utf-8');
    const { violations, totalColors } = auditColors(cssContent, filePath);
    
    if (violations.length > 0) {
      console.log(`   ❌ ${violations.length} violation(s) found`);
      allViolations.push({ filePath, violations });
      totalViolations += violations.length;
    } else {
      console.log(`   ✅ No violations (${totalColors} colors checked)`);
    }
  });
  
  console.log('\n' + '='.repeat(50));
  
  if (totalViolations > 0) {
    console.log(`\n🚨 AUDIT FAILED: ${totalViolations} purple/violet color violation(s) found!\n`);
    
    allViolations.forEach(({ filePath, violations }) => {
      console.log(`\n📝 File: ${path.relative(process.cwd(), filePath)}`);
      console.log('-'.repeat(50));
      
      violations.forEach((violation, index) => {
        console.log(`\n  ${index + 1}. Line ${violation.line}`);
        console.log(`     Type: ${violation.type}`);
        console.log(`     Color: ${violation.color}`);
        console.log(`     HSL: ${violation.hsl}`);
        console.log(`     Code: ${violation.snippet}`);
      });
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('\n💡 SOLUTION: Replace purple/violet colors with approved brand colors:');
    console.log('   - Royal Blue: #1E3A8A (hsl(220, 68%, 33%))');
    console.log('   - Electric Blue: #3B82F6 (hsl(221, 91%, 60%))');
    console.log('   - Amber Gold: #FBBF24 (hsl(45, 95%, 58%))');
    console.log('\n' + '='.repeat(50));
    
    process.exit(1); // Fail CI
  } else {
    console.log('\n✅ AUDIT PASSED: No purple/violet colors detected!');
    console.log(`   ${cssFiles.length} file(s) checked successfully.\n`);
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { auditColors, hexToRgb, rgbToHsl, isForbiddenHue };
