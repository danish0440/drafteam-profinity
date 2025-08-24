import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Button,
  Paper
} from '@mui/material';
import {
  FolderOpen,
  Assignment,
  People,
  TrendingUp,
  FilePresent,
  Transform,
  Map,
  CheckCircle,
  Schedule,
  Warning
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, teamMembers } = useAuth();
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    projectFiles: 0,
    convertedFiles: 0,
    fileTypes: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [projectsRes, statsRes] = await Promise.all([
        axios.get('/api/projects'),
        axios.get('/api/files/stats')
      ]);
      
      setProjects(projectsRes.data);
      setStats(statsRes.data.stats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProjectStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'success';
      case 'In Progress': return 'warning';
      case 'Planning': return 'info';
      default: return 'default';
    }
  };

  const getProjectStatusIcon = (status) => {
    switch (status) {
      case 'Completed': return <CheckCircle />;
      case 'In Progress': return <Schedule />;
      case 'Planning': return <Assignment />;
      default: return <Warning />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const recentProjects = projects.slice(0, 5);
  const projectStatusCounts = projects.reduce((acc, project) => {
    acc[project.status] = (acc[project.status] || 0) + 1;
    return acc;
  }, {});

  const completionRate = projects.length > 0 
    ? ((projectStatusCounts['Completed'] || 0) / projects.length * 100).toFixed(1)
    : 0;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Welcome back, {user.name}!
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Here's an overview of your team's progress
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Projects
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {projects.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                  <FolderOpen />
                </Avatar>
              </Box>
              <Box mt={1} height={6}>
                {/* Spacer to match completion rate card height */}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Team Members
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {teamMembers.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'secondary.main', width: 56, height: 56 }}>
                  <People />
                </Avatar>
              </Box>
              <Box mt={1} height={6}>
                {/* Spacer to match completion rate card height */}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Files
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.totalFiles}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                  <FilePresent />
                </Avatar>
              </Box>
              <Box mt={1} height={6}>
                {/* Spacer to match completion rate card height */}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Completion Rate
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {completionRate}%
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56 }}>
                  <TrendingUp />
                </Avatar>
              </Box>
              <Box mt={1}>
                <LinearProgress 
                  variant="determinate" 
                  value={parseFloat(completionRate)} 
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Projects */}
        <Grid item xs={12} md={8}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="bold">
                  Recent Projects
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => navigate('/projects')}
                >
                  View All
                </Button>
              </Box>
              
              <List>
                {recentProjects.map((project, index) => (
                  <React.Fragment key={project.id}>
                    <ListItem 
                      button 
                      onClick={() => navigate(`/projects/${project.id}`)}
                      sx={{ borderRadius: 1, mb: 1 }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: getProjectStatusColor(project.status) + '.main' }}>
                          {getProjectStatusIcon(project.status)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={project.name}
                        secondary={`Created: ${new Date(project.createdDate).toLocaleDateString()}`}
                      />
                      <Chip 
                        label={project.status} 
                        color={getProjectStatusColor(project.status)}
                        size="small"
                      />
                    </ListItem>
                    {index < recentProjects.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
              
              {recentProjects.length === 0 && (
                <Typography color="text.secondary" textAlign="center" py={4}>
                  No projects yet. Start by creating your first project!
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions & Stats */}
        <Grid item xs={12} md={4}>
          {/* Quick Actions */}
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                Quick Actions
              </Typography>
              
              <Box display="flex" flexDirection="column" gap={1}>
                <Button
                  variant="contained"
                  startIcon={<FolderOpen />}
                  onClick={() => navigate('/projects')}
                  fullWidth
                >
                  Manage Projects
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<Transform />}
                  onClick={() => navigate('/convert')}
                  fullWidth
                >
                  Convert PDFs
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<Map />}
                  onClick={() => navigate('/keyloc')}
                  fullWidth
                >
                  OSM to DXF
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* File Statistics */}
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                File Statistics
              </Typography>
              
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Total Storage Used
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {formatFileSize(stats.totalSize)}
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Project Files</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {stats.projectFiles}
                </Typography>
              </Box>
              
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2">Converted Files</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {stats.convertedFiles}
                </Typography>
              </Box>
              
              {Object.keys(stats.fileTypes).length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    File Types
                  </Typography>
                  {Object.entries(stats.fileTypes).map(([type, count]) => (
                    <Box key={type} display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2">{type.toUpperCase()}</Typography>
                      <Typography variant="body2" fontWeight="bold">{count}</Typography>
                    </Box>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;