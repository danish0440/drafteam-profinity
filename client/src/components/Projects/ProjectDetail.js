import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Divider,
  Paper,
  Breadcrumbs,
  Link,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import {
  ArrowBack,
  Upload,
  Download,
  Delete,
  InsertDriveFile,
  PictureAsPdf,
  Image,
  Archive,
  Assignment,
  Schedule,
  CheckCircle,
  CloudUpload
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [addingNote, setAddingNote] = useState(false);

  const statusOptions = ['Planning', 'In Progress', 'Completed'];
  const statusColors = {
    'Planning': 'info',
    'In Progress': 'warning',
    'Completed': 'success'
  };

  useEffect(() => {
    fetchProjectData();
    fetchActivities();
  }, [id]);

  const fetchProjectData = async () => {
    try {
      const [projectResponse, filesResponse] = await Promise.all([
        axios.get(`/api/projects/${id}`),
        axios.get(`/api/files/project/${id}`)
      ]);
      
      setProject(projectResponse.data);
      setFiles(filesResponse.data.files || []);
    } catch (error) {
      console.error('Error fetching project data:', error);
      toast.error('Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      setActivitiesLoading(true);
      const response = await axios.get(`/api/projects/${id}/activities`);
      setActivities(response.data.activities || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    setUploading(true);
    const formData = new FormData();
    
    acceptedFiles.forEach(file => {
      formData.append('files', file);
    });
    formData.append('projectId', id);
    
    try {
      const response = await axios.post('/api/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        toast.success(`${acceptedFiles.length} file(s) uploaded successfully`);
        fetchProjectData(); // Refresh file list
        setUploadDialogOpen(false);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed: ' + (error.response?.data?.error || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/octet-stream': ['.dwg', '.dxf', '.skp'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff'],
      'application/zip': ['.zip', '.rar', '.7z']
    },
    multiple: true
  });

  const handleDownload = async (file) => {
    try {
      // Properly encode the filename to handle special characters
      const encodedFilename = encodeURIComponent(file.filename);
      const response = await axios.get(
        `/api/files/download/${id}/${encodedFilename}`,
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('File downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed');
    }
  };

  const handleDelete = async () => {
    if (!fileToDelete) return;
    
    try {
      // Properly encode the filename to handle special characters
      const encodedFilename = encodeURIComponent(fileToDelete.filename);
      await axios.delete(`/api/files/${id}/${encodedFilename}`);
      toast.success('File deleted successfully');
      fetchProjectData(); // Refresh file list
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Delete failed');
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    
    setUpdatingStatus(true);
    try {
      const response = await axios.put(`/api/projects/${id}/status`, {
        status: newStatus
      });
      
      if (response.data.success) {
        setProject(response.data.project);
        toast.success('Project status updated successfully');
      setStatusDialogOpen(false);
       setNewStatus('');
       fetchProjectData();
       fetchActivities(); // Refresh activities
      }
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('Failed to update project status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    setAddingNote(true);
    try {
      const response = await axios.post(`/api/projects/${id}/notes`, {
        note: newNote
      });
      
      if (response.data.success) {
        // Refresh project data to get updated notes
        fetchProjectData();
        toast.success('Note added successfully');
      setNoteDialogOpen(false);
       setNewNote('');
       fetchProjectData();
       fetchActivities(); // Refresh activities
      }
    } catch (error) {
      console.error('Add note error:', error);
      toast.error('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const getFileIcon = (fileType) => {
    switch (fileType.toLowerCase()) {
      case '.pdf':
        return <PictureAsPdf color="error" />;
      case '.dwg':
      case '.dxf':
      case '.dwf':
        return <InsertDriveFile color="primary" />;
      case '.skp':
      case '.3ds':
      case '.obj':
        return <InsertDriveFile color="secondary" />;
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.gif':
      case '.bmp':
      case '.tiff':
        return <Image color="success" />;
      case '.zip':
      case '.rar':
      case '.7z':
        return <Archive color="warning" />;
      default:
        return <InsertDriveFile />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed': return <CheckCircle />;
      case 'In Progress': return <Schedule />;
      case 'Planning': return <Assignment />;
      default: return <Assignment />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'success';
      case 'In Progress': return 'warning';
      case 'Planning': return 'info';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading project...</Typography>
      </Box>
    );
  }

  if (!project) {
    return (
      <Box textAlign="center" py={8}>
        <Typography variant="h6" color="text.secondary">
          Project not found
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => navigate('/projects')}
          sx={{ mt: 2 }}
        >
          Back to Projects
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link 
          color="inherit" 
          href="#" 
          onClick={() => navigate('/projects')}
          sx={{ textDecoration: 'none' }}
        >
          Projects
        </Link>
        <Typography color="text.primary">{project.name}</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box display="flex" alignItems="center" mb={4}>
        <IconButton 
          onClick={() => navigate('/projects')}
          sx={{ mr: 2 }}
        >
          <ArrowBack />
        </IconButton>
        <Box flexGrow={1}>
          <Typography variant="h4" fontWeight="bold">
            {project.name}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Workshop renovation project with 2D drawing and 3D rendering
          </Typography>
        </Box>
        <Chip 
          icon={getStatusIcon(project.status)}
          label={project.status}
          color={getStatusColor(project.status)}
          size="large"
        />
      </Box>

      <Grid container spacing={3}>
        {/* Project Info */}
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                Project Information
              </Typography>
              
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Created Date
                </Typography>
                <Typography variant="body1">
                  {new Date(project.createdDate).toLocaleDateString()}
                </Typography>
              </Box>
              
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Total Files
                </Typography>
                <Typography variant="body1">
                  {files.length} files
                </Typography>
              </Box>
              
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Project Type
                </Typography>
                <Typography variant="body1">
                  Workshop Renovation
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Button
                fullWidth
                variant="contained"
                startIcon={<Upload />}
                onClick={() => setUploadDialogOpen(true)}
                sx={{ mb: 1 }}
              >
                Upload Files
              </Button>
              
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Schedule />}
                onClick={() => {
                  setNewStatus(project.status);
                  setStatusDialogOpen(true);
                }}
                sx={{ mb: 1 }}
              >
                Update Status
              </Button>
              
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Assignment />}
                onClick={() => setNoteDialogOpen(true)}
              >
                Add Note
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Files List */}
        <Grid item xs={12} md={8}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="bold">
                  Project Files
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {files.length} files
                </Typography>
              </Box>
              
              {files.length > 0 ? (
                <List>
                  {files.map((file, index) => (
                    <React.Fragment key={file.id}>
                      <ListItem>
                        <ListItemIcon>
                          {getFileIcon(file.type)}
                        </ListItemIcon>
                        <ListItemText
                          primary={file.originalName}
                          secondary={
                            <>
                              <Typography variant="caption" display="block">
                                {formatFileSize(file.size)} • {file.type.toUpperCase()}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Uploaded: {new Date(file.created).toLocaleDateString()}
                              </Typography>
                            </>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton 
                            edge="end" 
                            onClick={() => handleDownload(file)}
                            sx={{ mr: 1 }}
                          >
                            <Download />
                          </IconButton>
                          <IconButton 
                            edge="end" 
                            onClick={() => {
                              setFileToDelete(file);
                              setDeleteDialogOpen(true);
                            }}
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < files.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box 
                  display="flex" 
                  flexDirection="column" 
                  alignItems="center" 
                  py={8}
                >
                  <Avatar sx={{ bgcolor: 'grey.300', width: 80, height: 80, mb: 2 }}>
                    <InsertDriveFile sx={{ fontSize: 40 }} />
                  </Avatar>
                  <Typography variant="h6" color="text.secondary" mb={1}>
                    No files uploaded yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
                    Upload AutoCAD (.dwg, .dxf), SketchUp (.skp), PDF, or image files
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Upload />}
                    onClick={() => setUploadDialogOpen(true)}
                  >
                    Upload First File
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Project Activities */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="bold">
                  Recent Activities
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {activities.length} activities
                </Typography>
              </Box>
              
              {activitiesLoading ? (
                <LinearProgress />
              ) : activities.length > 0 ? (
                <List>
                  {activities.slice(0, 10).map((activity, index) => (
                    <React.Fragment key={activity.id}>
                      <ListItem>
                        <ListItemIcon>
                          {activity.action === 'file_upload' && <CloudUpload color="primary" />}
                          {activity.action === 'pdf_merge' && <PictureAsPdf color="secondary" />}
                          {activity.action === 'osm_convert' && <InsertDriveFile color="success" />}
                          {activity.action === 'status_update' && <CheckCircle color="info" />}
                          {activity.action === 'note_added' && <Assignment color="warning" />}
                        </ListItemIcon>
                        <ListItemText
                          primary={activity.details}
                          secondary={
                            <>
                              <Typography variant="caption" display="block">
                                {activity.user} • {new Date(activity.timestamp).toLocaleString()}
                              </Typography>
                              {activity.fileInfo && (
                                <Typography variant="caption" color="text.secondary">
                                  {activity.fileInfo.name} ({activity.fileInfo.type})
                                </Typography>
                              )}
                            </>
                          }
                        />
                      </ListItem>
                      {index < Math.min(activities.length - 1, 9) && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                  No activities yet
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Upload Dialog */}
      <Dialog 
        open={uploadDialogOpen} 
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Upload Files to {project.name}</DialogTitle>
        <DialogContent>
          <Paper
            {...getRootProps()}
            sx={{
              p: 4,
              textAlign: 'center',
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              bgcolor: isDragActive ? 'primary.50' : 'grey.50',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <input {...getInputProps()} />
            <CloudUpload sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              or click to select files
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Supported: AutoCAD (.dwg, .dxf), SketchUp (.skp), PDF, Images, Archives
            </Typography>
          </Paper>
          
          {uploading && (
            <Box mt={2}>
              <LinearProgress />
              <Typography variant="body2" textAlign="center" mt={1}>
                Uploading files...
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)} disabled={uploading}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete File</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{fileToDelete?.originalName}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Update Project Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Project Status</InputLabel>
            <Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              label="Project Status"
            >
              {statusOptions.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)} disabled={updatingStatus}>
            Cancel
          </Button>
          <Button 
            onClick={handleStatusUpdate}
            variant="contained"
            disabled={updatingStatus || !newStatus}
          >
            {updatingStatus ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog
        open={noteDialogOpen}
        onClose={() => setNoteDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Project Note</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Note"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note about this project..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialogOpen(false)} disabled={addingNote}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddNote}
            variant="contained"
            disabled={addingNote || !newNote.trim()}
          >
            {addingNote ? 'Adding...' : 'Add Note'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectDetail;