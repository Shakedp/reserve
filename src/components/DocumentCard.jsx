import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export default function DocumentCard({ document: doc }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const getHebrewMonth = (month) => {
    const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    return months[month];
  };

  const getHebrewDate = (date) => {
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    
    const hebrewMonths = ['טבת', 'שבט', 'אדר', 'ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול', 'תשרי', 'חשוון', 'כסלו'];
    const gematriya = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'יא', 'יב', 'יג', 'יד', 'טו', 'טז', 'יז', 'יח', 'יט', 'כ', 'כא', 'כב', 'כג', 'כד', 'כה', 'כו', 'כז', 'כח', 'כט', 'ל'];
    
    // Approximate Hebrew month based on Gregorian (simplified)
    const hebrewMonthIndex = (month + 3) % 12;
    return `${gematriya[day] || day}' ב${hebrewMonths[hebrewMonthIndex]} תשפ"ה`;
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      // Get placeholder data from URL or use defaults
      const urlParams = new URLSearchParams(window.location.search);
      const firstName = urlParams.get('firstName') || 'דביר';
      const lastName = urlParams.get('lastName') || 'כהן';
      const privateNumber = urlParams.get('privateNumber') || '7600783';
      const idNumber = urlParams.get('idNumber') || '308334127';
      
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const formatDate = (date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      };
      
      const hebrewDate = getHebrewDate(today);
      const englishDate = `${today.getDate()} ב${getHebrewMonth(today.getMonth())} ${today.getFullYear()}`;
      const beginningDate = formatDate(weekAgo);

      // Load the template PDF
      const existingPdfBytes = await fetch('/assets/template.pdf').then(res => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      
      // Get the first page
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { height } = firstPage.getSize();
      
      // Embed a standard font (Helvetica for now, can be customized)
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      // Fill in the placeholders at specific coordinates
      // Note: PDF coordinates start from bottom-left (0,0)
      // You may need to adjust these coordinates based on your template
      
      // Hebrew date - top right area
      firstPage.drawText(hebrewDate, {
        x: 485,
        y: height - 85,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      // English date - below hebrew date
      firstPage.drawText(englishDate, {
        x: 440,
        y: height - 100,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      // ID Number (תעודת זהות) - in the data table
      firstPage.drawText(idNumber, {
        x: 115,
        y: height - 250,
        size: 11,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      // First Name (שם פרטי)
      firstPage.drawText(firstName, {
        x: 225,
        y: height - 250,
        size: 11,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      // Family Name (שם משפחה)
      firstPage.drawText(lastName, {
        x: 310,
        y: height - 250,
        size: 11,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      // Private Number (מספר אישי)
      firstPage.drawText(privateNumber, {
        x: 425,
        y: height - 250,
        size: 11,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      // Beginning date (24/11/2025)
      firstPage.drawText(beginningDate, {
        x: 240,
        y: height - 315,
        size: 11,
        font: font,
        color: rgb(0, 0, 0),
      });

      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      
      // Create blob and download
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `אישור_מילואים_${firstName}_${lastName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setIsGenerating(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setIsGenerating(false);
      alert('שגיאה ביצירת ה-PDF');
    }
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <div className="flex gap-3 items-start">
        {/* Content - Left side */}
        <div className="flex-1 text-right">
          <h3 className="text-base font-bold text-gray-900 mb-2 leading-snug">
            {doc.title}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            {doc.description}
          </p>
        </div>
        
        {/* Icon - Right side */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
            <img 
              src={
                doc.icon === 'document' 
                  ? "/assets/document-icon.png"
                  : doc.icon === 'logo'
                  ? "/assets/logo.png"
                  : "/assets/emergency-icon.png"
              }
              alt={doc.title}
              className="w-12 h-12 object-contain"
            />
          </div>
        </div>
      </div>
      
      {/* Download Button */}
      <div className="flex justify-start mt-4">
        <button
          onClick={generatePDF}
          disabled={isGenerating}
          className="hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-0 p-0"
        >
          {isGenerating ? (
            <div className="flex items-center gap-2 text-[#4CAF50]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="font-medium text-base">הורדה</span>
            </div>
          ) : (
            <img src="/assets/download-button.png" alt="הורדה" className="h-6" />
          )}
        </button>
      </div>
    </div>
  );
}