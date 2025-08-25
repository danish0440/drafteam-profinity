const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Global storage for conversion jobs
const conversionJobs = {};
const conversionHistory = [];

// Conversion job class
class ConversionJob {
  constructor(jobId, filename, outputName, projectId, options, user) {
    this.jobId = jobId;
    this.filename = filename;
    this.outputName = outputName;
    this.projectId = projectId;
    this.options = options;
    this.user = user;
    this.planType = options.planType || 'key-plan';
    this.projection = options.projection || 'EPSG:3857';
    
    // Configure settings based on plan type
    if (this.planType === 'key-plan') {
      this.useColors = false;  // Monochrome for professional look
      this.includeFootpaths = false;  // Simplified
      this.includeMinorRoads = true;
      this.includeBuildings = true;
      this.buildingStyle = 'outline';
    } else {  // location-plan
      this.useColors = true;   // Colored for detailed analysis
      this.includeFootpaths = true;   // Full detail
      this.includeMinorRoads = true;
      this.includeBuildings = true;
      this.buildingStyle = 'filled';
    }
    
    this.status = 'pending'; // pending, processing, completed, error
    this.progress = 0;
    this.message = 'Job created';
    this.createdAt = new Date();
    this.completedAt = null;
    this.errorMessage = null;
    this.outputFile = null;
    this.stats = {};
  }
}

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
      cb(new Error('Invalid file type. Please upload .osm, .osm.xml, or .pbf files'));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Helper function to detect available Python command
const detectPythonCommand = async () => {
  const commands = ['python', 'python3', 'py'];
  
  for (const cmd of commands) {
    try {
      await new Promise((resolve, reject) => {
        const process = spawn(cmd, ['--version'], { stdio: 'pipe' });
        process.on('close', (code) => {
          if (code === 0) resolve();
          else reject();
        });
        process.on('error', reject);
      });
      return cmd;
    } catch (error) {
      continue;
    }
  }
  return null;
};

// Background conversion function
const performConversion = async (jobId) => {
  const job = conversionJobs[jobId];
  
  try {
    job.status = 'processing';
    job.message = 'Starting conversion...';
    job.progress = 10;
    
    const inputPath = path.join(__dirname, '../uploads/temp', job.filename);
    const outputDir = path.join(__dirname, '../uploads/converted');
    const outputFilename = `${path.parse(job.filename).name}_${jobId}.dxf`;
    const outputPath = path.join(outputDir, outputFilename);
    const statsPath = path.join(outputDir, `${path.parse(job.filename).name}_${jobId}_stats.json`);
    
    // Ensure output directory exists
    await fs.ensureDir(outputDir);
    
    if (!await fs.pathExists(inputPath)) {
      throw new Error('OSM file not found');
    }
    
    job.message = 'Detecting Python environment...';
    job.progress = 20;
    
    // Detect Python command
    const pythonCmd = await detectPythonCommand();
    if (!pythonCmd) {
      throw new Error('Python not found. Please install Python 3.x');
    }
    
    job.message = 'Preparing conversion...';
    job.progress = 30;
    
    // Prepare Python script arguments
    const scriptPath = path.join(__dirname, '../scripts/osm_to_dxf.py');
    const args = [
      scriptPath,
      inputPath,
      '--output', outputPath,
      '--plan-type', job.planType,
      '--projection', job.projection,
      '--stats-output', statsPath
    ];
    
    // Add no-colors flag for key-plan
    if (!job.useColors) {
      args.push('--no-colors');
    }
    
    job.message = 'Starting Python conversion process...';
    job.progress = 40;
    
    // Execute Python script
    const pythonProcess = spawn(pythonCmd, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.dirname(scriptPath)
    });
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      // Update progress based on output
      if (stdout.includes('Parsing OSM data')) {
        job.progress = 50;
        job.message = 'Parsing OSM data...';
      } else if (stdout.includes('Processing') && stdout.includes('nodes')) {
        job.progress = 65;
        job.message = 'Processing nodes...';
      } else if (stdout.includes('Processing') && stdout.includes('ways')) {
        job.progress = 80;
        job.message = 'Processing ways...';
      } else if (stdout.includes('Generating DXF')) {
        job.progress = 90;
        job.message = 'Generating DXF...';
      }
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Wait for Python process to complete
    await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        }
      });
      
      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });
    
    job.message = 'Finalizing conversion...';
    job.progress = 95;
    
    // Verify output file exists
    if (!await fs.pathExists(outputPath)) {
      throw new Error('DXF output file was not created');
    }
    
    // Read statistics if available
    let conversionStats = {};
    if (await fs.pathExists(statsPath)) {
      try {
        const statsContent = await fs.readFile(statsPath, 'utf8');
        conversionStats = JSON.parse(statsContent);
      } catch (error) {
        console.warn('Failed to read conversion statistics:', error.message);
      }
    }
    
    const outputFileStats = await fs.stat(outputPath);
    
    // Log activity to project if projectId is provided (non-blocking)
    if (job.projectId) {
      const axios = require('axios');
      axios.post(`http://localhost:5000/api/projects/${job.projectId}/activity`, {
        action: 'osm_convert',
        details: `Converted OSM file to DXF: ${outputFilename} (${(outputFileStats.size / 1024).toFixed(2)} KB)`,
        fileInfo: {
          name: outputFilename,
          type: '.dxf',
          size: outputFileStats.size,
          sourceFile: job.filename,
          planType: job.planType,
          projection: job.projection,
          stats: conversionStats
        }
      }, {
        headers: {
          'Authorization': `Bearer ${job.user.token}`
        },
        timeout: 5000
      })
      .catch(error => {
        console.error('Failed to log OSM conversion activity:', error.message);
      });
    }
    
    // Complete job
    job.status = 'completed';
    job.message = 'Conversion completed successfully!';
    job.progress = 100;
    job.completedAt = new Date();
    job.outputFile = outputFilename;
    job.stats = {
      fileSize: outputFileStats.size,
      planType: job.planType,
      projection: job.projection,
      ...conversionStats
    };
    
    // Add to history
    conversionHistory.unshift({
      name: outputFilename,
      size: outputFileStats.size,
      created: new Date().toISOString(),
      createdBy: job.user.name,
      planType: job.planType,
      projectId: job.projectId,
      projectName: job.projectName
    });
    
    // Keep only last 50 entries
    if (conversionHistory.length > 50) {
      conversionHistory.splice(50);
    }
    
  } catch (error) {
    console.error('OSM conversion error:', error);
    job.status = 'error';
    job.message = `Conversion failed: ${error.message}`;
    job.errorMessage = error.message;
    job.progress = 0;
  }
};

// Upload OSM file
router.post('/upload', upload.single('osmFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
      success: true,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        uploadedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Convert OSM to DXF (returns job ID immediately)
router.post('/convert', upload.single('osmFile'), async (req, res) => {
  try {
    const { planType = 'key-plan', projection = 'EPSG:3857', projectId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'OSM file is required' });
    }
    
    const filename = req.file.filename;
    const outputName = `${path.parse(req.file.originalname).name}_converted.dxf`;
    
    // Generate unique job ID
    const jobId = uuidv4().substring(0, 8);
    
    // Create conversion job with plan type options
    const options = {
      planType,
      projection
    };
    
    const job = new ConversionJob(jobId, filename, outputName, projectId, options, {
      name: req.user.name,
      token: req.headers.authorization?.split(' ')[1]
    });
    conversionJobs[jobId] = job;
    
    // Start conversion in background
    setImmediate(() => {
      performConversion(jobId);
    });
    
    res.json({
      success: true,
      jobId: jobId,
      message: 'Conversion started. Use the job ID to check status.',
      status: 'pending',
      planType: planType
    });
  } catch (error) {
    console.error('OSM conversion error:', error);
    res.status(500).json({ 
      error: 'Failed to start conversion', 
      details: error.message 
    });
  }
});

// Get conversion job status
router.get('/status/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!conversionJobs[jobId]) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const job = conversionJobs[jobId];
    
    const response = {
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      message: job.message,
      createdAt: job.createdAt.toISOString(),
      stats: job.stats,
      planType: job.planType
    };
    
    if (job.completedAt) {
      response.completedAt = job.completedAt.toISOString();
      response.duration = (job.completedAt - job.createdAt) / 1000; // seconds
    }
    
    if (job.errorMessage) {
      response.error = job.errorMessage;
    }
    
    if (job.outputFile) {
      response.downloadUrl = `/api/osm/download/${job.outputFile}`;
      response.file = {
        name: job.outputFile,
        size: job.stats.fileSize,
        createdBy: job.user.name,
        createdAt: job.completedAt?.toISOString(),
        projectId: job.projectId || null
      };
    }
    
    res.json(response);
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

// Get active jobs
router.get('/jobs', (req, res) => {
  try {
    const activeJobs = Object.values(conversionJobs)
      .filter(job => job.status === 'processing' || job.status === 'pending')
      .map(job => ({
        jobId: job.jobId,
        filename: job.filename,
        status: job.status,
        progress: job.progress,
        message: job.message,
        createdAt: job.createdAt.toISOString(),
        createdBy: job.user.name
      }));
    
    res.json({ jobs: activeJobs });
  } catch (error) {
    console.error('Jobs fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch active jobs' });
  }
});

// Get conversion history
router.get('/history', (req, res) => {
  try {
    res.json({ files: conversionHistory });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch conversion history' });
  }
});

// Download converted DXF file
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security check - only allow downloading DXF files
    if (!filename.endsWith('.dxf')) {
      return res.status(400).json({ error: 'Invalid file type' });
    }
    
    // Check in converted folder first, then project folders
    let filePath = path.join(__dirname, '../uploads/converted', filename);
    
    if (!await fs.pathExists(filePath)) {
      // Search in project folders
      const projectsDir = path.join(__dirname, '../uploads/projects');
      const projects = await fs.readdir(projectsDir).catch(() => []);
      
      for (const projectId of projects) {
        const projectFilePath = path.join(projectsDir, projectId, filename);
        if (await fs.pathExists(projectFilePath)) {
          filePath = projectFilePath;
          break;
        }
      }
    }
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Download failed' });
        }
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

// Check script availability
router.get('/check-script', async (req, res) => {
  try {
    const pythonCommand = await detectPythonCommand();
    res.json({ 
      available: !!pythonCommand,
      pythonCommand: pythonCommand || null,
      message: pythonCommand ? 'OSM converter is available' : 'Python not found'
    });
  } catch (error) {
    console.error('Script check error:', error);
    res.json({ 
      available: false, 
      error: error.message 
    });
  }
});

// Clean up old jobs (run periodically)
setInterval(() => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  Object.keys(conversionJobs).forEach(jobId => {
    const job = conversionJobs[jobId];
    if (job.createdAt < oneHourAgo && (job.status === 'completed' || job.status === 'error')) {
      delete conversionJobs[jobId];
    }
  });
}, 30 * 60 * 1000); // Run every 30 minutes

module.exports = router;