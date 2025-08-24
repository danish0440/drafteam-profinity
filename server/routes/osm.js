const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');
const router = express.Router();

// Configure multer for OSM file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/temp');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'osm-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Accept OSM files (.osm, .osm.xml) and PBF files (.pbf)
    const allowedExtensions = ['.osm', '.xml', '.pbf'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(fileExtension) || 
        file.originalname.toLowerCase().endsWith('.osm.xml')) {
      cb(null, true);
    } else {
      cb(new Error('Only OSM files (.osm, .osm.xml, .pbf) are allowed'), false);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for OSM files
  }
});

// Upload OSM file
router.post('/upload', upload.single('osmFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No OSM file uploaded' });
    }
    
    const fileInfo = {
      id: Date.now() + Math.random(),
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      uploadedBy: req.user.name,
      uploadedAt: new Date().toISOString(),
      type: 'osm'
    };
    
    res.json({
      success: true,
      file: fileInfo
    });
  } catch (error) {
    console.error('OSM upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Convert OSM to DXF
router.post('/convert', async (req, res) => {
  try {
    const { filename, outputName, projectId, options = {} } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }
    
    const inputPath = path.join(__dirname, '../uploads/temp', filename);
    
    if (!await fs.pathExists(inputPath)) {
      return res.status(404).json({ error: 'OSM file not found' });
    }
    
    // Prepare output filename and path
    const outputFileName = `${outputName || 'converted'}-${Date.now()}.dxf`;
    const outputPath = projectId 
      ? path.join(__dirname, '../uploads/projects', projectId.toString(), outputFileName)
      : path.join(__dirname, '../uploads/converted', outputFileName);
    
    await fs.ensureDir(path.dirname(outputPath));
    
    // Prepare Python script arguments
    const scriptPath = path.join(__dirname, '../../osm_to_dxf.py');
    const args = [
      scriptPath,
      '--input', inputPath,
      '--output', outputPath
    ];
    
    // Add optional parameters
    if (options.targetCrs) {
      args.push('--crs', options.targetCrs);
    }
    
    if (options.useColors === false) {
      args.push('--no-colors');
    }
    
    if (options.verbose) {
      args.push('--verbose');
    }
    
    // Execute Python script
    const conversionPromise = new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', args, {
        cwd: path.dirname(scriptPath)
      });
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        }
      });
      
      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });
    
    // Wait for conversion to complete
    const { stdout, stderr } = await conversionPromise;
    
    // Check if output file was created
    if (!await fs.pathExists(outputPath)) {
      throw new Error('DXF file was not created');
    }
    
    const stats = await fs.stat(outputPath);
    
    // Log activity to project if projectId is provided
    if (projectId) {
      try {
        const axios = require('axios');
        await axios.post(`http://localhost:5000/api/projects/${projectId}/activity`, {
          action: 'osm_convert',
          details: `Converted OSM file to DXF: ${outputFileName} (${(stats.size / 1024).toFixed(2)} KB)`,
          fileInfo: {
            name: outputFileName,
            type: '.dxf',
            size: stats.size,
            sourceFile: filename,
            targetCrs: options.targetCrs || 'EPSG:3857'
          }
        }, {
          headers: {
            'Authorization': req.headers.authorization
          }
        });
      } catch (error) {
        console.error('Failed to log OSM conversion activity:', error.message);
      }
    }
    
    const result = {
      success: true,
      file: {
        name: outputFileName,
        path: outputPath,
        size: stats.size,
        createdBy: req.user.name,
        createdAt: new Date().toISOString(),
        projectId: projectId || null,
        conversionLog: stdout,
        warnings: stderr
      }
    };
    
    res.json(result);
  } catch (error) {
    console.error('OSM conversion error:', error);
    res.status(500).json({ 
      error: 'Conversion failed', 
      details: error.message 
    });
  }
});

// Get conversion history
router.get('/history', async (req, res) => {
  try {
    const convertedDir = path.join(__dirname, '../uploads/converted');
    const files = [];
    
    if (await fs.pathExists(convertedDir)) {
      const fileList = await fs.readdir(convertedDir);
      
      for (const filename of fileList) {
        if (filename.endsWith('.dxf')) {
          const filePath = path.join(convertedDir, filename);
          const stats = await fs.stat(filePath);
          
          files.push({
            name: filename,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          });
        }
      }
    }
    
    // Sort by creation date (newest first)
    files.sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.json({
      success: true,
      files
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to get conversion history' });
  }
});

// Download DXF file
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Check in converted files first
    let filePath = path.join(__dirname, '../uploads/converted', filename);
    
    if (!await fs.pathExists(filePath)) {
      // Check in project files
      const projectsDir = path.join(__dirname, '../uploads/projects');
      const projectDirs = await fs.readdir(projectsDir);
      
      for (const projectDir of projectDirs) {
        const projectFilePath = path.join(projectsDir, projectDir, filename);
        if (await fs.pathExists(projectFilePath)) {
          filePath = projectFilePath;
          break;
        }
      }
    }
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'DXF file not found' });
    }
    
    res.download(filePath, filename);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

// Get OSM file info
router.get('/info/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads/temp', filename);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'OSM file not found' });
    }
    
    const stats = await fs.stat(filePath);
    
    // Try to get basic OSM file info
    let osmInfo = {
      filename,
      size: stats.size,
      modified: stats.mtime,
      type: 'osm'
    };
    
    // For small files, try to read basic metadata
    if (stats.size < 10 * 1024 * 1024) { // Only for files < 10MB
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Extract basic OSM metadata
        const boundsMatch = content.match(/<bounds[^>]*>/i);
        if (boundsMatch) {
          osmInfo.bounds = boundsMatch[0];
        }
        
        // Count basic elements (rough estimate)
        const nodeCount = (content.match(/<node/gi) || []).length;
        const wayCount = (content.match(/<way/gi) || []).length;
        const relationCount = (content.match(/<relation/gi) || []).length;
        
        osmInfo.elements = {
          nodes: nodeCount,
          ways: wayCount,
          relations: relationCount
        };
      } catch (parseError) {
        console.log('Could not parse OSM metadata:', parseError.message);
      }
    }
    
    res.json({
      success: true,
      info: osmInfo
    });
  } catch (error) {
    console.error('OSM info error:', error);
    res.status(500).json({ error: 'Failed to get OSM file info' });
  }
});

// Check Python script availability
router.get('/check-script', async (req, res) => {
  try {
    const scriptPath = path.join(__dirname, '../../osm_to_dxf.py');
    const scriptExists = await fs.pathExists(scriptPath);
    
    if (!scriptExists) {
      return res.json({
        available: false,
        error: 'OSM to DXF script not found'
      });
    }
    
    // Test Python availability
    const testPromise = new Promise((resolve) => {
      const pythonProcess = spawn('python', ['--version']);
      
      pythonProcess.on('close', (code) => {
        resolve(code === 0);
      });
      
      pythonProcess.on('error', () => {
        resolve(false);
      });
    });
    
    const pythonAvailable = await testPromise;
    
    res.json({
      available: pythonAvailable,
      scriptPath,
      pythonAvailable
    });
  } catch (error) {
    console.error('Script check error:', error);
    res.status(500).json({ error: 'Failed to check script availability' });
  }
});

module.exports = router;