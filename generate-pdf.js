// Standalone PDF generation script using pdf-lib
// Usage: node generate-pdf.js

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import fontkit from '@pdf-lib/fontkit';
import { HDate } from '@hebcal/core';

// Helper function to get Hebrew month name
function getHebrewMonthName(monthIndex) {
  const hebrewMonths = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  return hebrewMonths[monthIndex];
}

// Format date as DD/MM/YYYY
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}/${month}/${year}`;
}

// Get Hebrew calendar date without punctuation or vowels
function getHebrewDate(date) {
  const hdate = new HDate(date);
  
  // Hebrew month names without vowels (nikkud)
  const hebrewMonthsNoNikkud = {
    'Nisan': 'ניסן',
    'Iyyar': 'אייר',
    'Sivan': 'סיון',
    'Tamuz': 'תמוז',
    'Av': 'אב',
    'Elul': 'אלול',
    'Tishrei': 'תשרי',
    'Cheshvan': 'חשון',
    'Kislev': 'כסלו',
    'Tevet': 'טבת',
    'Sh\'vat': 'שבט',
    'Adar': 'אדר',
    'Adar I': 'אדר א',
    'Adar II': 'אדר ב'
  };
  
  const day = hdate.getDate();
  const monthName = hdate.getMonthName();
  const year = hdate.getFullYear();
  
  // Convert numbers to Hebrew letters without punctuation
  const gematriya = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'יא', 'יב', 'יג', 'יד', 'טו', 'טז', 'יז', 'יח', 'יט', 'כ', 'כא', 'כב', 'כג', 'כד', 'כה', 'כו', 'כז', 'כח', 'כט', 'ל'];
  
  // Convert day to Hebrew with gershayim for two-letter numbers
  let dayHebrew = gematriya[day] || day;
  if (dayHebrew.length === 2) {
    // Add gershayim between the two letters (e.g., י"א)
    dayHebrew = dayHebrew[0] + '"' + dayHebrew[1];
  }
  
  const monthHebrew = hebrewMonthsNoNikkud[monthName] || monthName;
  
  // Convert year to Hebrew with gershayim (")
  const yearShort = year - 5000;
  const hundreds = Math.floor(yearShort / 100);
  const ones = yearShort % 10;
  
  // Hebrew hundreds (for 700-800 range)
  const hundredsLetter = hundreds === 7 ? 'פ' : hundreds === 8 ? 'צ' : '';
  
  // Build year with gershayim before last letter: תשפ"ו
  let yearHebrew = 'תש' + hundredsLetter;
  if (ones > 0) {
    yearHebrew += gematriya[ones];
  }
  
  // Add gershayim before last character
  if (yearHebrew.length > 1) {
    yearHebrew = yearHebrew.slice(0, -1) + '"' + yearHebrew.slice(-1);
  }
  
  return `${dayHebrew} ב${monthHebrew} ${yearHebrew}`;
}

// Get English date with Hebrew month name
function getEnglishDateWithHebrewMonth(date) {
  const day = date.getDate();
  const month = getHebrewMonthName(date.getMonth());
  const year = date.getFullYear(); // Don't convert to string yet
  return `${day} ב${month} ${year}`;
}

// Get date X days ago
function getDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function generatePDF() {
  try {
    console.log('Starting PDF generation...');
    
    // Generate dates
    const today = new Date();
    const sixDaysAgo = getDaysAgo(6);
    
    // Prepare data
    const data = {
      hebrewDate: getHebrewDate(today),
      englishDate: getEnglishDateWithHebrewMonth(today),
      idNumber: "308334127",
      firstName: "דביר",
      lastName: "כהן", 
      privateNumber: "7600783",
      beginningDate: formatDate(sixDaysAgo)
    };
    
    console.log('Data to fill:', data);
    
    // Load the template PDF
    const templatePath = path.join(process.cwd(), 'PDF Approval Document.pdf');
    console.log('Loading template from:', templatePath);
    
    const existingPdfBytes = fs.readFileSync(templatePath);
    console.log('Template loaded, size:', existingPdfBytes.length, 'bytes');
    
    // Parse the PDF
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    console.log('PDF parsed successfully');
    
    // Register fontkit
    pdfDoc.registerFontkit(fontkit);
    console.log('Fontkit registered');
    
    // Get form fields if they exist
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log('\n=== FORM FIELDS FOUND ===');
    console.log('Total fields:', fields.length);
    
    fields.forEach((field, index) => {
      const fieldName = field.getName();
      const fieldType = field.constructor.name;
      console.log(`${index + 1}. Name: "${fieldName}", Type: ${fieldType}`);
    });
    
    // Get pages info
    const pages = pdfDoc.getPages();
    console.log('\n=== PAGES INFO ===');
    console.log('Total pages:', pages.length);
    
    pages.forEach((page, index) => {
      const { width, height } = page.getSize();
      console.log(`Page ${index + 1}: ${width} x ${height}`);
    });
    
    // Try to identify fonts in the document
    console.log('\n=== FONTS IN DOCUMENT ===');
    try {
      const fonts = pdfDoc.context.enumerateIndirectObjects();
      let fontCount = 0;
      for (const [ref, obj] of fonts) {
        if (obj.dict && obj.dict.get('Type')?.toString() === '/Font') {
          const baseFont = obj.dict.get('BaseFont')?.toString();
          const subtype = obj.dict.get('Subtype')?.toString();
          console.log(`Font ${++fontCount}: ${baseFont || 'Unknown'} (${subtype || 'Unknown type'})`);
        }
      }
      if (fontCount === 0) {
        console.log('No embedded fonts found in document');
      }
    } catch (err) {
      console.log('Could not enumerate fonts:', err.message);
    }
    
    // If no form fields exist, we'll need to add text manually
    if (fields.length === 0) {
      console.log('\n=== NO FORM FIELDS - WILL ADD TEXT OVERLAYS ===');
      
      const firstPage = pages[0];
      const { height } = firstPage.getSize();
      
      // Load Libertinus Serif font from local assets
      const fontPath = path.join(process.cwd(), 'public/assets/LibertinusSerif-Regular.ttf');
      console.log(`Loading font from: ${fontPath}`);
      
      let font;
      if (fs.existsSync(fontPath)) {
        const fontBytes = fs.readFileSync(fontPath);
        font = await pdfDoc.embedFont(fontBytes);
        console.log('✅ Libertinus Serif font loaded successfully!');
      } else {
        console.log('⚠️  Font not found, falling back to Helvetica');
        font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      }
      
      // Add numeric fields only (to avoid encoding errors)
      // 1 cm = 28.35 points (approximately)
      
      // ABSOLUTE POSITIONS
      
      // Hebrew Date - 0.1cm right
      const hebrewDateX = 42.8;
      const hebrewDateY = 788;
      
      console.log(`Adding Hebrew Date at position: x=${hebrewDateX}, y=${hebrewDateY}`);
      firstPage.drawText(data.hebrewDate, {
        x: hebrewDateX,
        y: hebrewDateY,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      // English Date - split by spaces and draw separately for RTL - 0.1cm right
      const englishDateY = 777;
      const englishDateParts = data.englishDate.split(' '); // ["1", "בדצמבר", "2025"]
      const reversedParts = [...englishDateParts].reverse(); // ["2025", "בדצמבר", "1"] for RTL
      
      console.log(`Adding English Date (split, RTL) at y=${englishDateY}`);
      
      // Start from left, draw each part in reversed order (RTL) - 0.2cm right
      let currentX = 45.6;
      reversedParts.forEach((part, index) => {
        const partWidth = font.widthOfTextAtSize(part, 10);
        console.log(`  Part ${index}: "${part}" at x=${currentX}, width=${partWidth}`);
        
        firstPage.drawText(part, {
          x: currentX,
          y: englishDateY,
          size: 10,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        // Add space width for next part
        const spaceWidth = font.widthOfTextAtSize(' ', 10);
        currentX += partWidth + spaceWidth;
      });
      
      // ID Number - 0.2cm right
      const idX = 80.7;
      const idY = height - 195;
      
      console.log(`Adding ID Number at position: x=${idX}, y=${idY}`);
      firstPage.drawText(data.idNumber, {
        x: idX,
        y: idY,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      // First Name - 0.1cm right
      const firstNameX = 227.8;
      const firstNameY = height - 195;
      
      console.log(`Adding First Name at position: x=${firstNameX}, y=${firstNameY}`);
      firstPage.drawText(data.firstName, {
        x: firstNameX,
        y: firstNameY,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      // Family Name - 0.1cm right
      const familyNameX = 360.8;
      const familyNameY = height - 195;
      
      console.log(`Adding Family Name at position: x=${familyNameX}, y=${familyNameY}`);
      firstPage.drawText(data.lastName, {
        x: familyNameX,
        y: familyNameY,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      // Private Number - 0.2cm right
      const privateNumberX = 485.7;
      const privateNumberY = height - 195;
      
      console.log(`Adding Private Number at position: x=${privateNumberX}, y=${privateNumberY}`);
      firstPage.drawText(data.privateNumber, {
        x: privateNumberX,
        y: privateNumberY,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      // Beginning Date - 0.4cm right total
      const beginningDateX = 326.3;
      const beginningDateY = 584;
      
      console.log(`Adding Beginning Date at position: x=${beginningDateX}, y=${beginningDateY}`);
      firstPage.drawText(data.beginningDate, {
        x: beginningDateX,
        y: beginningDateY,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      console.log('All fields added: ID Number, First Name, Family Name, Private Number, Beginning Date');
    } else {
      // Fill form fields if they exist
      console.log('\n=== FILLING FORM FIELDS ===');
      
      fields.forEach(field => {
        const fieldName = field.getName();
        console.log(`Processing field: ${fieldName}`);
        
        // Map field names to data (you'll need to adjust based on actual field names)
        if (fieldName.includes('id') || fieldName.includes('ID')) {
          field.setText(data.idNumber);
          console.log(`  -> Set to: ${data.idNumber}`);
        } else if (fieldName.includes('private') || fieldName.includes('personal')) {
          field.setText(data.privateNumber);
          console.log(`  -> Set to: ${data.privateNumber}`);
        } else if (fieldName.includes('date') || fieldName.includes('Date')) {
          field.setText(data.beginningDate);
          console.log(`  -> Set to: ${data.beginningDate}`);
        }
      });
    }
    
    // Save the PDF
    console.log('\n=== SAVING PDF ===');
    const pdfBytes = await pdfDoc.save();
    
    const outputPath = path.join(process.cwd(), 'output-filled.pdf');
    fs.writeFileSync(outputPath, pdfBytes);
    
    console.log('✅ PDF saved successfully to:', outputPath);
    console.log('File size:', pdfBytes.length, 'bytes');
    
  } catch (error) {
    console.error('❌ Error generating PDF:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the script
generatePDF();

