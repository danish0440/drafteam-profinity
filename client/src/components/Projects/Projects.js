import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  TextField,
  InputAdornment,
  MenuItem,
  Avatar,
  LinearProgress,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Search,
  FilterList,
  Add,
  FolderOpen,
  Assignment,
  CheckCircle,
  Schedule,
  Warning,
  Visibility
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const Projects = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const statusOptions = ['All', 'Planning', 'In Progress', 'Completed'];
  const statusColors = {
    'Planning': 'info',
    'In Progress': 'warning',
    'Completed': 'success'
  };

  const statusIcons = {
    'Planning': <Assignment />,
    'In Progress': <Schedule />,
    'Completed': <CheckCircle />
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [projects, searchTerm, statusFilter]);

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProjects = () => {
    let filtered = projects;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'All') {
      filtered = filtered.filter(project => project.status === statusFilter);
    }

    setFilteredProjects(filtered);
  };

  const handleProjectClick = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  const getProjectProgress = (project) => {
    // Simple progress calculation based on status
    switch (project.status) {
      case 'Planning': return 10;
      case 'In Progress': return 50;
      case 'Completed': return 100;
      default: return 0;
    }
  };

  const getProjectDescription = (projectName) => {
    // Generate description based on project name
    return `Workshop renovation project for ${projectName}. Includes 2D drawing and 3D rendering.`;
  };

  const handleCreateProject = () => {
    // For now, just close dialog - in real app would create new project
    setCreateDialogOpen(false);
    setNewProjectName('');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading projects...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Workshop Renovation Projects
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Manage your AutoCAD, SketchUp, and PDF files for all renovation projects
        </Typography>
      </Box>

      {/* Filters */}
      <Box mb={4}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="Filter by Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FilterList />
                  </InputAdornment>
                ),
              }}
            >
              {statusOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box display="flex" justifyContent="flex-end">
              <Typography variant="body2" color="text.secondary">
                {filteredProjects.length} of {projects.length} projects
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Projects Grid */}
      <Grid container spacing={3}>
        {filteredProjects.map((project) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={project.id}>
            <Card 
              elevation={2}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                {/* Project Header */}
                <Box display="flex" alignItems="center" mb={2}>
                  <Avatar 
                    sx={{ 
                      bgcolor: statusColors[project.status] + '.main',
                      width: 40,
                      height: 40,
                      mr: 1
                    }}
                  >
                    {statusIcons[project.status] || <FolderOpen />}
                  </Avatar>
                  <Box flexGrow={1}>
                    <Typography variant="h6" fontWeight="bold" noWrap>
                      {project.name}
                    </Typography>
                    <Chip 
                      label={project.status}
                      color={statusColors[project.status]}
                      size="small"
                    />
                  </Box>
                </Box>

                {/* Project Description */}
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  mb={2}
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {getProjectDescription(project.name)}
                </Typography>

                {/* Progress */}
                <Box mb={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" color="text.secondary">
                      Progress
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {getProjectProgress(project)}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={getProjectProgress(project)}
                    sx={{ height: 6, borderRadius: 3 }}
                    color={statusColors[project.status]}
                  />
                </Box>

                {/* Project Info */}
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Created: {new Date(project.createdDate).toLocaleDateString()}
                  </Typography>
                  <br />
                  <Typography variant="caption" color="text.secondary">
                    Files: {project.files?.length || 0}
                  </Typography>
                </Box>
              </CardContent>

              <CardActions sx={{ p: 2, pt: 0 }}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<Visibility />}
                  onClick={() => handleProjectClick(project.id)}
                >
                  View Project
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* No Results */}
      {filteredProjects.length === 0 && (
        <Box 
          display="flex" 
          flexDirection="column" 
          alignItems="center" 
          justifyContent="center" 
          minHeight="300px"
        >
          <Avatar sx={{ bgcolor: 'grey.300', width: 80, height: 80, mb: 2 }}>
            <FolderOpen sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h6" color="text.secondary" mb={1}>
            No projects found
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            {searchTerm || statusFilter !== 'All' 
              ? 'Try adjusting your search or filter criteria'
              : 'No projects available yet'
            }
          </Typography>
        </Box>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add project"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24
        }}
        onClick={() => setCreateDialogOpen(true)}
      >
        <Add />
      </Fab>

      {/* Create Project Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            fullWidth
            variant="outlined"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="e.g., New Workshop Auto"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateProject}
            variant="contained"
            disabled={!newProjectName.trim()}
          >
            Create Project
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Projects;