const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create necessary directories
const createDirectories = async () => {
  const dirs = [
    'uploads',
    'uploads/projects',
    'uploads/converted',
    'uploads/temp',
    'public/thumbnails'
  ];
  
  for (const dir of dirs) {
    await fs.ensureDir(path.join(__dirname, dir));
  }
};

// Team members data
const teamMembers = [
  { id: 1, name: 'Adip', role: 'Senior Draftsman' },
  { id: 2, name: 'Elyas', role: 'Junior Draftsman' },
  { id: 3, name: 'Syahmi', role: 'Junior Draftsman' },
  { id: 4, name: 'Alip', role: 'Junior Draftsman' }
];

// Projects data
const projects = [
  'R-Tune Auto', 'RAB Ceria', 'Amran Quality', 'MFN Utara', 'ZRS Garage',
  'Pahlawan Aircond', 'Peroda Autowork', 'ZL Autowork', 'Splendid Auto', 'Sinar Maju',
  'Rast Maju', 'EJ Workshop', 'Bangi Motorsport', 'Speedway Motors', 'Precision Auto',
  'N-Rich Tyres', 'Aman Autopart', 'Cyber Pitwork', 'Auto Garage II', 'FZ AUTO',
  'QCar Autocare', 'Borneo NMK', 'The Big Bang Auto', 'Expert Auto', 'ZF Auto',
  'Albin Workshop', 'Azwa Automotive', 'Zahra Energy', 'Magnitude', 'ZL Auto',
  'Monkeysepana', 'Automech Service', 'The Big Bang', 'Freskool', 'Iman Auto',
  'MNI Auto', 'WMH Auto', 'Dynamic Auto', 'Supreme Motors', 'Velocity Garage',
  'Apex Auto', 'Thunder Motors', 'Fusion Auto', 'Quantum Garage', 'Phoenix Motors',
  'Summit Motors'
].map((name, index) => ({
  id: index + 1,
  name,
  status: 'Planning',
  createdDate: new Date().toISOString(),
  files: []
}));

// Authentication middleware
const authenticateUser = (req, res, next) => {
  const { authorization } = req.headers;
  
  if (!authorization) {
    return res.status(401).json({ error: 'No authorization header' });
  }
  
  const token = authorization.split(' ')[1];
  
  try {
    // Simple token validation (username:password base64)
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [username, password] = decoded.split(':');
    
    if (password !== 'drafteamprofinity') {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    const user = teamMembers.find(member => 
      member.name.toLowerCase() === username.toLowerCase()
    );
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Routes
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (password !== 'drafteamprofinity') {
    return res.status(401).json({ error: 'Invalid password' });
  }
  
  const user = teamMembers.find(member => 
    member.name.toLowerCase() === username.toLowerCase()
  );
  
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  
  const token = Buffer.from(`${username}:${password}`).toString('base64');
  
  res.json({
    success: true,
    user,
    token
  });
});

app.get('/api/team', authenticateUser, (req, res) => {
  res.json(teamMembers);
});

app.get('/api/projects', authenticateUser, (req, res) => {
  res.json(projects);
});

app.get('/api/projects/:id', authenticateUser, (req, res) => {
  const project = projects.find(p => p.id === parseInt(req.params.id));
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json(project);
});

// Update project status
app.put('/api/projects/:id/status', authenticateUser, (req, res) => {
  const { status } = req.body;
  const project = projects.find(p => p.id === parseInt(req.params.id));
  
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  const validStatuses = ['Planning', 'In Progress', 'Completed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  project.status = status;
  project.lastUpdated = new Date().toISOString();
  project.updatedBy = req.user.name;
  
  res.json({
    success: true,
    project
  });
});

// Add project notes/comments
app.post('/api/projects/:id/notes', authenticateUser, (req, res) => {
  const { note } = req.body;
  const project = projects.find(p => p.id === parseInt(req.params.id));
  
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  if (!project.notes) {
    project.notes = [];
  }
  
  const newNote = {
    id: Date.now(),
    text: note,
    author: req.user.name,
    timestamp: new Date().toISOString()
  };
  
  project.notes.push(newNote);
  
  res.json({
    success: true,
    note: newNote
  });
});

// Track file operations and project activities
app.post('/api/projects/:id/activity', authenticateUser, (req, res) => {
  const { action, details, fileInfo } = req.body;
  const project = projects.find(p => p.id === parseInt(req.params.id));
  
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  if (!project.activities) {
    project.activities = [];
  }
  
  const activity = {
    id: Date.now(),
    action: action, // 'file_upload', 'pdf_convert', 'osm_convert', 'file_delete', etc.
    details: details,
    fileInfo: fileInfo,
    user: req.user.name,
    timestamp: new Date().toISOString()
  };
  
  project.activities.push(activity);
  
  // Keep only last 100 activities to prevent memory issues
  if (project.activities.length > 100) {
    project.activities = project.activities.slice(-100);
  }
  
  res.json({
    success: true,
    activity: activity
  });
});

// Get project activities
app.get('/api/projects/:id/activities', authenticateUser, (req, res) => {
  const project = projects.find(p => p.id === parseInt(req.params.id));
  
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  res.json({
    activities: project.activities || []
  });
});

// Import route handlers
const convertRoutes = require('./routes/convert');
const osmRoutes = require('./routes/osm');
const fileRoutes = require('./routes/files');

app.use('/api/convert', authenticateUser, convertRoutes);
app.use('/api/osm', authenticateUser, osmRoutes);
app.use('/api/files', authenticateUser, fileRoutes);

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const startServer = async () => {
  try {
    await createDirectories();
    app.listen(PORT, () => {
      console.log(`🚀 DraftTeam Server running on port ${PORT}`);
      console.log(`📁 Upload directories created`);
      console.log(`👥 Team members: ${teamMembers.map(m => m.name).join(', ')}`);
      console.log(`📋 Projects loaded: ${projects.length}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();