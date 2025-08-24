const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();

// Configure multer for project file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const projectId = req.body.projectId || 'temp';
    const uploadPath = path.join(__dirname, '../uploads/projects', projectId.toString());
    fs.ensureDirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, uniqueSuffix + '-' + originalName);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Accept AutoCAD, SketchUp, PDF, and common image files
    const allowedExtensions = [
      '.dwg', '.dxf', '.dwf', // AutoCAD files
      '.skp', '.3ds', '.obj', // SketchUp and 3D files
      '.pdf', // PDF files
      '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', // Image files
      '.zip', '.rar', '.7z' // Archive files
    ];
    
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${fileExtension} not allowed. Allowed types: ${allowedExtensions.join(', ')}`), false);
    }
  },
  limits: {
    fileSize: 200 * 1024 * 1024 // 200MB limit
  }
});

// Upload files to project
router.post('/upload', upload.array('files', 20), async (req, res) => {
  try {
    const { projectId } = req.body;
    const axios = require('axios');
    
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    
    const uploadedFiles = [];
    
    for (const file of req.files) {
      // Move file from temp to correct project folder if needed
      let finalPath = file.path;
      if (file.path.includes('temp')) {
        const projectDir = path.join(__dirname, '../uploads/projects', projectId.toString());
        fs.ensureDirSync(projectDir);
        finalPath = path.join(projectDir, file.filename);
        await fs.move(file.path, finalPath);
      }
      
      const fileInfo = {
        id: Date.now() + Math.random(),
        originalName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
        filename: file.filename,
        path: finalPath,
        size: file.size,
        type: path.extname(file.originalname).toLowerCase(),
        uploadedBy: req.user.name,
        uploadedAt: new Date().toISOString(),
        projectId: parseInt(projectId)
      };
      
      uploadedFiles.push(fileInfo);
      
      // Log activity to project if projectId is provided
      if (projectId && projectId !== 'general') {
        try {
          await axios.post(`http://localhost:5000/api/projects/${projectId}/activity`, {
            action: 'file_upload',
            details: `Uploaded ${Buffer.from(file.originalname, 'latin1').toString('utf8')} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
            fileInfo: {
              name: Buffer.from(file.originalname, 'latin1').toString('utf8'),
              type: path.extname(file.originalname).toLowerCase(),
              size: file.size
            }
          }, {
            headers: {
              'Authorization': req.headers.authorization
            }
          });
        } catch (error) {
          console.error('Failed to log file upload activity:', error.message);
        }
      }
    }
    
    res.json({
      success: true,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Get files for a project
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const projectDir = path.join(__dirname, '../uploads/projects', projectId);
    
    if (!await fs.pathExists(projectDir)) {
      return res.json({
        success: true,
        files: []
      });
    }
    
    const files = [];
    const fileList = await fs.readdir(projectDir);
    
    for (const filename of fileList) {
      const filePath = path.join(projectDir, filename);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        // Extract original name from filename (remove timestamp prefix)
        const originalName = filename.replace(/^\d+-\d+-/, '');
        
        files.push({
          id: filename,
          originalName,
          filename,
          size: stats.size,
          type: path.extname(filename).toLowerCase(),
          created: stats.birthtime,
          modified: stats.mtime,
          projectId: parseInt(projectId)
        });
      }
    }
    
    // Sort by creation date (newest first)
    files.sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.json({
      success: true,
      files
    });
  } catch (error) {
    console.error('Get project files error:', error);
    res.status(500).json({ error: 'Failed to get project files' });
  }
});

// Download file
router.get('/download/:projectId/:filename', async (req, res) => {
  try {
    const { projectId, filename } = req.params;
    const filePath = path.join(__dirname, '../uploads/projects', projectId, filename);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Extract original name for download
    const originalName = filename.replace(/^\d+-\d+-/, '');
    
    res.download(filePath, originalName);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

// Delete file
router.delete('/:projectId/:filename', async (req, res) => {
  try {
    const { projectId, filename } = req.params;
    const decodedFilename = decodeURIComponent(filename);
    const filePath = path.join(__dirname, '../uploads/projects', projectId, decodedFilename);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    await fs.remove(filePath);
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// Get file info
router.get('/info/:projectId/:filename', async (req, res) => {
  try {
    const { projectId, filename } = req.params;
    const filePath = path.join(__dirname, '../uploads/projects', projectId, filename);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const stats = await fs.stat(filePath);
    const originalName = filename.replace(/^\d+-\d+-/, '');
    
    res.json({
      success: true,
      file: {
        originalName,
        filename,
        size: stats.size,
        type: path.extname(filename).toLowerCase(),
        created: stats.birthtime,
        modified: stats.mtime,
        projectId: parseInt(projectId)
      }
    });
  } catch (error) {
    console.error('File info error:', error);
    res.status(500).json({ error: 'Failed to get file info' });
  }
});

// Get all files across all projects
router.get('/all', async (req, res) => {
  try {
    const projectsDir = path.join(__dirname, '../uploads/projects');
    const allFiles = [];
    
    if (await fs.pathExists(projectsDir)) {
      const projectDirs = await fs.readdir(projectsDir);
      
      for (const projectDir of projectDirs) {
        const projectPath = path.join(projectsDir, projectDir);
        const projectStats = await fs.stat(projectPath);
        
        if (projectStats.isDirectory()) {
          const files = await fs.readdir(projectPath);
          
          for (const filename of files) {
            const filePath = path.join(projectPath, filename);
            const fileStats = await fs.stat(filePath);
            
            if (fileStats.isFile()) {
              const originalName = filename.replace(/^\d+-\d+-/, '');
              
              allFiles.push({
                id: filename,
                originalName,
                filename,
                size: fileStats.size,
                type: path.extname(filename).toLowerCase(),
                created: fileStats.birthtime,
                modified: fileStats.mtime,
                projectId: parseInt(projectDir),
                projectName: `Project ${projectDir}`
              });
            }
          }
        }
      }
    }
    
    // Sort by creation date (newest first)
    allFiles.sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.json({
      success: true,
      files: allFiles
    });
  } catch (error) {
    console.error('Get all files error:', error);
    res.status(500).json({ error: 'Failed to get all files' });
  }
});

// Search files
router.get('/search', async (req, res) => {
  try {
    const { q, type, projectId } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const projectsDir = path.join(__dirname, '../uploads/projects');
    const searchResults = [];
    
    if (await fs.pathExists(projectsDir)) {
      const projectDirs = await fs.readdir(projectsDir);
      
      for (const projectDir of projectDirs) {
        // Skip if specific project ID is requested and this doesn't match
        if (projectId && projectDir !== projectId) {
          continue;
        }
        
        const projectPath = path.join(projectsDir, projectDir);
        const projectStats = await fs.stat(projectPath);
        
        if (projectStats.isDirectory()) {
          const files = await fs.readdir(projectPath);
          
          for (const filename of files) {
            const filePath = path.join(projectPath, filename);
            const fileStats = await fs.stat(filePath);
            
            if (fileStats.isFile()) {
              const originalName = filename.replace(/^\d+-\d+-/, '');
              const fileType = path.extname(filename).toLowerCase();
              
              // Check if file matches search criteria
              const matchesQuery = originalName.toLowerCase().includes(q.toLowerCase()) ||
                                 filename.toLowerCase().includes(q.toLowerCase());
              const matchesType = !type || fileType === type.toLowerCase();
              
              if (matchesQuery && matchesType) {
                searchResults.push({
                  id: filename,
                  originalName,
                  filename,
                  size: fileStats.size,
                  type: fileType,
                  created: fileStats.birthtime,
                  modified: fileStats.mtime,
                  projectId: parseInt(projectDir),
                  projectName: `Project ${projectDir}`
                });
              }
            }
          }
        }
      }
    }
    
    // Sort by relevance (exact matches first, then by date)
    searchResults.sort((a, b) => {
      const aExact = a.originalName.toLowerCase() === q.toLowerCase();
      const bExact = b.originalName.toLowerCase() === q.toLowerCase();
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      return new Date(b.created) - new Date(a.created);
    });
    
    res.json({
      success: true,
      files: searchResults,
      query: q,
      total: searchResults.length
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get storage statistics
router.get('/stats', async (req, res) => {
  try {
    const projectsDir = path.join(__dirname, '../uploads/projects');
    const convertedDir = path.join(__dirname, '../uploads/converted');
    
    const stats = {
      totalFiles: 0,
      totalSize: 0,
      projectFiles: 0,
      convertedFiles: 0,
      fileTypes: {}
    };
    
    // Count project files
    if (await fs.pathExists(projectsDir)) {
      const projectDirs = await fs.readdir(projectsDir);
      
      for (const projectDir of projectDirs) {
        const projectPath = path.join(projectsDir, projectDir);
        const projectStats = await fs.stat(projectPath);
        
        if (projectStats.isDirectory()) {
          const files = await fs.readdir(projectPath);
          
          for (const filename of files) {
            const filePath = path.join(projectPath, filename);
            const fileStats = await fs.stat(filePath);
            
            if (fileStats.isFile()) {
              stats.totalFiles++;
              stats.projectFiles++;
              stats.totalSize += fileStats.size;
              
              const fileType = path.extname(filename).toLowerCase();
              stats.fileTypes[fileType] = (stats.fileTypes[fileType] || 0) + 1;
            }
          }
        }
      }
    }
    
    // Count converted files
    if (await fs.pathExists(convertedDir)) {
      const files = await fs.readdir(convertedDir);
      
      for (const filename of files) {
        const filePath = path.join(convertedDir, filename);
        const fileStats = await fs.stat(filePath);
        
        if (fileStats.isFile()) {
          stats.totalFiles++;
          stats.convertedFiles++;
          stats.totalSize += fileStats.size;
          
          const fileType = path.extname(filename).toLowerCase();
          stats.fileTypes[fileType] = (stats.fileTypes[fileType] || 0) + 1;
        }
      }
    }
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get storage statistics' });
  }
});

module.exports = router;