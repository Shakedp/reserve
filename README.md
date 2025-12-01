# אישורי מילואים - Reserve Documents

Mobile-first React application for Israeli military reserve documents.

## 🚀 Getting Started

### Installation

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will open automatically at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## 🏗️ Project Structure

```
reserve/
├── src/
│   ├── components/
│   │   └── DocumentCard.jsx    # Document card component with PDF generation
│   ├── pages/
│   │   └── Home.jsx             # Main home page
│   ├── App.jsx                  # Root component
│   ├── main.jsx                 # Entry point
│   └── index.css                # Tailwind CSS imports
├── .vscode/
│   └── launch.json              # VS Code debugging config
├── index.html                   # HTML template
├── vite.config.js               # Vite configuration
├── tailwind.config.js           # Tailwind CSS configuration
└── package.json                 # Dependencies
```

## 🎨 Features

- ✅ Mobile-first responsive design
- ✅ Hebrew RTL support
- ✅ PDF generation for military reserve documents
- ✅ Modern UI with Tailwind CSS
- ✅ Fast development with Vite
- ✅ Lucide icons

## 🔧 Tech Stack

- **React 18** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

## 📝 Usage

The app displays military reserve documents with the ability to generate and download PDFs.
Documents can be customized via URL parameters:

```
http://localhost:3000?firstName=דביר&lastName=כהן&personalNumber=7600783&idNumber=308334127
```

## 🐛 Debugging

Use the VS Code debugger:
1. Press `F5` or go to Run and Debug
2. Select "Launch Chrome against localhost"
3. Set breakpoints and debug your code

## 📱 Mobile Testing

1. Open browser DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M / Cmd+Shift+M)
3. Select a mobile device or set custom dimensions

