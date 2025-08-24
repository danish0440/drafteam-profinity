const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { PDFDocument } = require('pdf-lib');
const pdf2pic = require('pdf2pic');
const sharp = require('sharp');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/temp');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Generate PDF thumbnail
const generateThumbnail = async (pdfPath, outputPath) => {
  try {
    console.log('Generating thumbnail for:', pdfPath);
    console.log('Output path:', outputPath);
    
    // Ensure output directory exists
    await fs.ensureDir(path.dirname(outputPath));
    
    // Create a simple placeholder thumbnail for now
    // This will be replaced with actual PDF content later
    const placeholderSvg = `
      <svg width="300" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="300" height="400" fill="#f5f5f5" stroke="#ddd" stroke-width="2"/>
        <rect x="20" y="20" width="260" height="30" fill="#e0e0e0"/>
        <rect x="20" y="70" width="200" height="15" fill="#e0e0e0"/>
        <rect x="20" y="100" width="240" height="15" fill="#e0e0e0"/>
        <rect x="20" y="130" width="180" height="15" fill="#e0e0e0"/>
        <rect x="20" y="160" width="220" height="15" fill="#e0e0e0"/>
        <text x="150" y="250" text-anchor="middle" font-family="Arial" font-size="16" fill="#666">PDF Preview</text>
        <text x="150" y="280" text-anchor="middle" font-family="Arial" font-size="12" fill="#999">${path.basename(pdfPath)}</text>
      </svg>
    `;
    
    // Convert SVG to PNG using sharp
    await sharp(Buffer.from(placeholderSvg))
      .png()
      .toFile(outputPath);
    
    console.log('Placeholder thumbnail generated successfully:', outputPath);
    return outputPath;
  } catch (error) {
    console.error('Thumbnail generation error:', error);
    return null;
  }
};

// Upload PDF files with preview
router.post('/upload', upload.array('files', 10), async (req, res) => {
  try {
    const uploadedFiles = [];
    
    for (const file of req.files) {
      const thumbnailName = `${path.parse(file.filename).name}.png`;
      const thumbnailPath = path.join(__dirname, '../public/thumbnails', thumbnailName);
      
      // Generate thumbnail
      const thumbnail = await generateThumbnail(file.path, thumbnailPath);
      
      // Always generate a thumbnail (placeholder for now)
      const thumbnailUrl = thumbnail ? `http://localhost:5000/public/thumbnails/${thumbnailName}` : null;
      
      uploadedFiles.push({
        id: Date.now() + Math.random(),
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        thumbnail: thumbnailUrl,
        uploadedBy: req.user.name,
        uploadedAt: new Date().toISOString()
      });
      
      console.log('File uploaded with thumbnail:', {
        filename: file.originalname,
        thumbnailUrl: thumbnailUrl
      });
    }
    
    res.json({
      success: true,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Merge PDF files
router.post('/merge', async (req, res) => {
  try {
    const { fileIds, outputName, projectId } = req.body;
    
    if (!fileIds || fileIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 files required for merging' });
    }
    
    const mergedPdf = await PDFDocument.create();
    
    // Process each file
    for (const fileId of fileIds) {
      const filePath = path.join(__dirname, '../uploads/temp', fileId);
      
      if (await fs.pathExists(filePath)) {
        const pdfBytes = await fs.readFile(filePath);
        const pdf = await PDFDocument.load(pdfBytes);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        
        pages.forEach((page) => mergedPdf.addPage(page));
      }
    }
    
    const mergedPdfBytes = await mergedPdf.save();
    
    // Save merged file
    const outputFileName = `${outputName || 'merged'}-${Date.now()}.pdf`;
    const outputPath = projectId 
      ? path.join(__dirname, '../uploads/projects', projectId.toString(), outputFileName)
      : path.join(__dirname, '../uploads/converted', outputFileName);
    
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, mergedPdfBytes);
    
    // Generate thumbnail for merged file
    const thumbnailName = `${path.parse(outputFileName).name}.png`;
    const thumbnailPath = path.join(__dirname, '../public/thumbnails', thumbnailName);
    await generateThumbnail(outputPath, thumbnailPath);
    
    // Log activity to project if projectId is provided
    if (projectId) {
      try {
        const axios = require('axios');
        await axios.post(`http://localhost:5000/api/projects/${projectId}/activity`, {
          action: 'pdf_merge',
          details: `Merged ${selectedFiles.length} PDF files into ${outputFileName}`,
          fileInfo: {
            name: outputFileName,
            type: '.pdf',
            size: mergedPdfBytes.length,
            sourceFiles: selectedFiles.length
          }
        }, {
          headers: {
            'Authorization': req.headers.authorization
          }
        });
      } catch (error) {
        console.error('Failed to log PDF merge activity:', error.message);
      }
    }
    
    res.json({
      success: true,
      file: {
        name: outputFileName,
        path: outputPath,
        size: mergedPdfBytes.length,
        thumbnail: `/public/thumbnails/${thumbnailName}`,
        createdBy: req.user.name,
        createdAt: new Date().toISOString(),
        projectId: projectId || null
      }
    });
  } catch (error) {
    console.error('Merge error:', error);
    res.status(500).json({ error: 'Merge failed' });
  }
});

// Split PDF file
router.post('/split', async (req, res) => {
  try {
    const { fileId, ranges, projectId } = req.body;
    
    if (!fileId || !ranges || ranges.length === 0) {
      return res.status(400).json({ error: 'File ID and page ranges required' });
    }
    
    const filePath = path.join(__dirname, '../uploads/temp', fileId);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const pdfBytes = await fs.readFile(filePath);
    const sourcePdf = await PDFDocument.load(pdfBytes);
    const splitFiles = [];
    
    // Process each range
    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i];
      const newPdf = await PDFDocument.create();
      
      // Copy specified pages
      const startPage = Math.max(0, range.start - 1);
      const endPage = Math.min(sourcePdf.getPageCount() - 1, range.end - 1);
      
      const pageIndices = [];
      for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
        pageIndices.push(pageNum);
      }
      
      const pages = await newPdf.copyPages(sourcePdf, pageIndices);
      pages.forEach((page) => newPdf.addPage(page));
      
      const splitPdfBytes = await newPdf.save();
      
      // Save split file
      const outputFileName = `split-${i + 1}-pages-${range.start}-${range.end}-${Date.now()}.pdf`;
      const outputPath = projectId 
        ? path.join(__dirname, '../uploads/projects', projectId.toString(), outputFileName)
        : path.join(__dirname, '../uploads/converted', outputFileName);
      
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeFile(outputPath, splitPdfBytes);
      
      // Generate thumbnail
      const thumbnailName = `${path.parse(outputFileName).name}.png`;
      const thumbnailPath = path.join(__dirname, '../public/thumbnails', thumbnailName);
      await generateThumbnail(outputPath, thumbnailPath);
      
      splitFiles.push({
        name: outputFileName,
        path: outputPath,
        size: splitPdfBytes.length,
        thumbnail: `/public/thumbnails/${thumbnailName}`,
        pages: `${range.start}-${range.end}`,
        createdBy: req.user.name,
        createdAt: new Date().toISOString(),
        projectId: projectId || null
      });
    }
    
    res.json({
      success: true,
      files: splitFiles
    });
  } catch (error) {
    console.error('Split error:', error);
    res.status(500).json({ error: 'Split failed' });
  }
});

// Get file info with thumbnail
router.get('/file/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads/temp', filename);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const stats = await fs.stat(filePath);
    const thumbnailName = `${path.parse(filename).name}.png`;
    const thumbnailPath = `/public/thumbnails/${thumbnailName}`;
    
    res.json({
      filename,
      size: stats.size,
      thumbnail: thumbnailPath,
      modified: stats.mtime
    });
  } catch (error) {
    console.error('File info error:', error);
    res.status(500).json({ error: 'Failed to get file info' });
  }
});

// Download converted file
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads/converted', filename);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.download(filePath, filename);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

// Clean up temporary files
router.delete('/cleanup', async (req, res) => {
  try {
    const tempDir = path.join(__dirname, '../uploads/temp');
    const files = await fs.readdir(tempDir);
    
    // Delete files older than 1 hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtime.getTime() < oneHourAgo) {
        await fs.remove(filePath);
      }
    }
    
    res.json({ success: true, message: 'Cleanup completed' });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

module.exports = router;