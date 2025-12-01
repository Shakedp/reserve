import React, { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import DocumentCard from '@/components/DocumentCard';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { HDate } from '@hebcal/core';

export default function Home() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [userData, setUserData] = useState(null);
  const [greeting, setGreeting] = useState('ערב טוב');

  // Load user data on mount
  useEffect(() => {
    const loadUserData = async () => {
      const pathParts = window.location.pathname.split('/').filter(p => p);
      const userName = pathParts[0] || 'shaked';
      
      try {
        const userResponse = await fetch(`${import.meta.env.BASE_URL}assets/users/${userName}.json`);
        if (userResponse.ok) {
          const data = await userResponse.json();
          setUserData(data);
          
          // Determine greeting based on Israel time
          const israelTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' });
          const hour = new Date(israelTime).getHours();
          setGreeting(hour < 12 ? 'בוקר טוב' : 'ערב טוב');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    
    loadUserData();
  }, []);

  // Helper function to get Hebrew month name (Gregorian)
  const getHebrewMonthName = (monthIndex) => {
    const hebrewMonths = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    return hebrewMonths[monthIndex];
  };

  // Format date as DD/MM/YYYY
  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${day}/${month}/${year}`;
  };

  // Get Hebrew calendar date with gershayim
  const getHebrewDate = (date) => {
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
    
    // Convert numbers to Hebrew letters
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
  };

  // Get English date with Hebrew month name
  const getEnglishDateWithHebrewMonth = (date) => {
    const day = date.getDate();
    const month = getHebrewMonthName(date.getMonth());
    const year = date.getFullYear();
    return `${day} ב${month} ${year}`;
  };

  // Get date X days ago
  const getDaysAgo = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  };

  const handleDownload = async () => {
    console.log('Starting PDF generation...');
    setIsGenerating(true);
    
    try {
      // Use already loaded user data
      if (!userData) {
        alert('נתוני משתמש לא נטענו');
        setIsGenerating(false);
        return;
      }
      
      const { firstName, lastName, privateNumber, idNumber } = userData;
      console.log('User data:', { firstName, lastName, privateNumber, idNumber });
      
      // Generate dates
      const today = new Date();
      const sixDaysAgo = getDaysAgo(6);
      
      // Prepare data
      const data = {
        hebrewDate: getHebrewDate(today),
        englishDate: getEnglishDateWithHebrewMonth(today),
        idNumber,
        firstName,
        lastName,
        privateNumber,
        beginningDate: formatDate(sixDaysAgo)
      };
      
      console.log('Data to fill:', data);

      // Load the template PDF
      console.log('Loading PDF template...');
      const response = await fetch(`${import.meta.env.BASE_URL}assets/PDF Approval Document.pdf`);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }
      const existingPdfBytes = await response.arrayBuffer();
      console.log('PDF loaded, size:', existingPdfBytes.byteLength);
      
      console.log('Parsing PDF...');
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      console.log('PDF parsed successfully');
      
      // Register fontkit
      pdfDoc.registerFontkit(fontkit);
      console.log('Fontkit registered');
      
      // Get the first page
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { height, width } = firstPage.getSize();
      console.log('Page dimensions:', { width, height });
      
      // Load the David Libre font
      console.log('Loading David Libre font...');
      const fontResponse = await fetch(`${import.meta.env.BASE_URL}assets/DavidLibre-Regular.ttf`);
      const fontBytes = await fontResponse.arrayBuffer();
      const font = await pdfDoc.embedFont(fontBytes);
      console.log('✅ David Libre font loaded successfully!');
      
      const fontSize = 11;
      const textColor = rgb(0, 0, 0);
      
      // Hebrew Date - 0.1cm down
      const hebrewDateX = 40;
      const hebrewDateY = 788;
      firstPage.drawText(data.hebrewDate, {
        x: hebrewDateX,
        y: hebrewDateY,
        size: fontSize,
        font: font,
        color: textColor,
      });
      console.log(`Adding Hebrew Date at position: x=${hebrewDateX}, y=${hebrewDateY}`);
      
      // English Date - split by spaces and draw separately for RTL
      const englishDateY = 777;
      const englishDateParts = data.englishDate.split(' '); // ["1", "בדצמבר", "2025"]
      const reversedParts = [...englishDateParts].reverse(); // ["2025", "בדצמבר", "1"] for RTL
      
      console.log(`Adding English Date (split, RTL) at y=${englishDateY}`);
      
      // Start from left, draw each part in reversed order (RTL)
      let currentX = 40;
      reversedParts.forEach((part, index) => {
        const partWidth = font.widthOfTextAtSize(part, fontSize);
        console.log(`  Part ${index}: "${part}" at x=${currentX}, width=${partWidth}`);
        
        firstPage.drawText(part, {
          x: currentX,
          y: englishDateY,
          size: fontSize,
          font: font,
          color: textColor,
        });
        
        // Add space width for next part
        const spaceWidth = font.widthOfTextAtSize(' ', fontSize);
        currentX += partWidth + spaceWidth;
      });
      
      // ID Number
      const idX = 75;
      const idY = height - 195;
      firstPage.drawText(data.idNumber, {
        x: idX,
        y: idY,
        size: fontSize,
        font: font,
        color: textColor,
      });
      console.log(`Adding ID Number at position: x=${idX}, y=${idY}`);
      
      // First Name
      const firstNameX = 225;
      const firstNameY = height - 195;
      firstPage.drawText(data.firstName, {
        x: firstNameX,
        y: firstNameY,
        size: fontSize,
        font: font,
        color: textColor,
      });
      console.log(`Adding First Name at position: x=${firstNameX}, y=${firstNameY}`);
      
      // Family Name
      const lastNameX = 358;
      const lastNameY = height - 195;
      firstPage.drawText(data.lastName, {
        x: lastNameX,
        y: lastNameY,
        size: fontSize,
        font: font,
        color: textColor,
      });
      console.log(`Adding Family Name at position: x=${lastNameX}, y=${lastNameY}`);
      
      // Private Number
      const privateNumberX = 480;
      const privateNumberY = height - 195;
      firstPage.drawText(data.privateNumber, {
        x: privateNumberX,
        y: privateNumberY,
        size: fontSize,
        font: font,
        color: textColor,
      });
      console.log(`Adding Private Number at position: x=${privateNumberX}, y=${privateNumberY}`);
      
      // Beginning Date - 0.3cm right - 0.1cm left = 0.2cm right, 0.1cm down - 0.1cm up = 0cm
      // 0.2cm right = ~5.7 points
      const beginningDateX = 315 + 5.7;
      const beginningDateY = 584;
      firstPage.drawText(data.beginningDate, {
        x: beginningDateX,
        y: beginningDateY,
        size: fontSize,
        font: font,
        color: textColor,
      });
      console.log(`Adding Beginning Date at position: x=${beginningDateX}, y=${beginningDateY}`);
      
      console.log('All fields added successfully');

      // Save the PDF
      console.log('Saving PDF...');
      const pdfBytes = await pdfDoc.save();
      console.log('PDF saved, size:', pdfBytes.length);
      
      // Create blob and download
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'Attachment.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      console.log('PDF download triggered successfully!');
      setIsGenerating(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      console.error('Error stack:', error.stack);
      setIsGenerating(false);
      alert(`שגיאה ביצירת ה-PDF: ${error.message}`);
    }
  };

  const documents = [
    {
      id: 1,
      title: 'שמ"פ חירום נוכחי',
      description: 'אישור על שירות מילואים על פי צו חירום',
      icon: 'document',
    },
    {
      id: 2,
      title: 'טופס אישור שירות מילואים מזכה',
      description: 'אישור זה מהווה אסמכתא למשרדי הממשלה ויחידות הסמך וכן למוסדות להשכלה גבוהה. האישור מציג את היקף ימי המילואים שבוצעו, לטובת מימוש זכאויות ייעודיות למשרתי המילואים שביצעו שירות מזכה.',
      icon: 'logo',
    },
  ];

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        {/* Right side - Menu, Line, Icon */}
        <div className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}assets/menu-icon.svg`} alt="תפריט" className="w-6 h-6 cursor-pointer" />
          <div className="h-6 w-px bg-gray-300"></div>
          <img 
            src={`${import.meta.env.BASE_URL}assets/emergency-icon.png`} 
            alt="לוגו" 
            className="w-10 h-10 object-contain"
          />
        </div>
        
        {/* Center - Text */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <span className="text-base font-medium text-gray-800">
            {greeting} {userData?.firstName || '...'}
          </span>
        </div>
        
        {/* Left side - Bell and User icons */}
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}assets/bell-icon.svg`} alt="התראות" className="w-6 h-6 cursor-pointer" />
          <img src={`${import.meta.env.BASE_URL}assets/user-icon.svg`} alt="משתמש" className="w-6 h-6 cursor-pointer" />
        </div>
      </header>

      {/* Title Section as Image */}
      <div className="w-full">
        <img src={`${import.meta.env.BASE_URL}assets/section2.png`} alt="האישורים שלי" className="w-full" />
      </div>

      {/* Section 3 - First Document Card */}
      <div className="w-full cursor-pointer" onClick={handleDownload}>
        <img src={`${import.meta.env.BASE_URL}assets/section3.png`} alt="שמ״פ חירום נוכחי" className="w-full" />
      </div>

      {/* Section 4 - Second Document Card */}
      <div className="w-full cursor-pointer" onClick={handleDownload}>
        <img src={`${import.meta.env.BASE_URL}assets/section4.png`} alt="טופס אישור שירות מילואים מזכה" className="w-full" />
      </div>
    </div>
  );
}