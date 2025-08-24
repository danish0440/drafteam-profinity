import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  CloudUpload,
  Transform,
  Download,
  Map,
  Settings,
  History,
  CheckCircle,
  Error,
  Warning,
  ExpandMore,
  Info
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const KeyLoc = () => {
  const { user } = useAuth();
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [projects, setProjects] = useState([]);
  const [conversionHistory, setConversionHistory] = useState([]);
  const [scriptAvailable, setScriptAvailable] = useState(false);
  const [checkingScript, setCheckingScript] = useState(true);
  
  const [conversionOptions, setConversionOptions] = useState({
    outputName: '',
    projectId: '',
    targetCrs: 'EPSG:3857',
    useColors: true,
    verbose: false
  });
  
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  const crsOptions = [
    { value: 'EPSG:3857', label: 'Web Mercator (EPSG:3857)' },
    { value: 'EPSG:4326', label: 'WGS84 (EPSG:4326)' },
    { value: 'EPSG:3395', label: 'World Mercator (EPSG:3395)' },
    { value: 'EPSG:32633', label: 'UTM Zone 33N (EPSG:32633)' },
    { value: 'EPSG:32648', label: 'UTM Zone 48N (EPSG:32648)' }
  ];

  useEffect(() => {
    checkScriptAvailability();
    fetchProjects();
    fetchConversionHistory();
  }, []);

  const checkScriptAvailability = async () => {
    try {
      const response = await axios.get('/api/osm/check-script');
      setScriptAvailable(response.data.available);
      
      if (!response.data.available) {
        toast.error('OSM to DXF converter is not available');
      }
    } catch (error) {
      console.error('Error checking script availability:', error);
      setScriptAvailable(false);
    } finally {
      setCheckingScript(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchConversionHistory = async () => {
    try {
      const response = await axios.get('/api/osm/history');
      setConversionHistory(response.data.files || []);
    } catch (error) {
      console.error('Error fetching conversion history:', error);
    }
  };

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0]; // Only take the first file
    setUploading(true);
    
    const formData = new FormData();
    formData.append('osmFile', file);
    
    try {
      const response = await axios.post('/api/osm/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        setUploadedFile(response.data.file);
        toast.success('OSM file uploaded successfully');
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
      'application/xml': ['.osm', '.xml'],
      'application/octet-stream': ['.pbf']
    },
    multiple: false,
    maxFiles: 1
  });

  const handleConvert = async () => {
    if (!uploadedFile) {
      toast.error('Please upload an OSM file first');
      return;
    }
    
    setConverting(true);
    
    try {
      const response = await axios.post('/api/osm/convert', {
        filename: uploadedFile.filename,
        outputName: conversionOptions.outputName || 'converted-map',
        projectId: conversionOptions.projectId || null,
        options: {
          targetCrs: conversionOptions.targetCrs,
          useColors: conversionOptions.useColors,
          verbose: conversionOptions.verbose
        }
      });
      
      if (response.data.success) {
        toast.success('OSM file converted to DXF successfully!');
        setConvertDialogOpen(false);
        fetchConversionHistory();
        
        // Offer download
        if (response.data.file) {
          const downloadUrl = `/api/osm/download/${response.data.file.name}`;
          window.open(downloadUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('Conversion error:', error);
      toast.error('Conversion failed: ' + (error.response?.data?.error || 'Unknown error'));
    } finally {
      setConverting(false);
    }
  };

  const handleDownload = async (filename) => {
    try {
      const response = await axios.get(
        `/api/osm/download/${filename}`,
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('DXF file downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (checkingScript) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Checking OSM converter availability...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Key&Loc - OSM to DXF Converter
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Convert OpenStreetMap data to AutoCAD DXF format for your projects
        </Typography>
      </Box>

      {/* Script Status Alert */}
      {!scriptAvailable && (
        <Alert severity="error" sx={{ mb: 4 }}>
          <Typography variant="body2">
            OSM to DXF converter is not available. Please ensure Python and required dependencies are installed.
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Upload Section */}
        <Grid item xs={12} md={8}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                Upload OSM File
              </Typography>
              
              <Paper
                {...getRootProps()}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  border: '2px dashed',
                  borderColor: isDragActive ? 'primary.main' : 'grey.300',
                  bgcolor: isDragActive ? 'primary.50' : 'grey.50',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  mb: 2
                }}
              >
                <input {...getInputProps()} />
                <CloudUpload sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {isDragActive ? 'Drop OSM file here' : 'Drag & drop OSM file here'}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  or click to select file
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Supported: .osm, .osm.xml, .pbf files
                </Typography>
              </Paper>
              
              {uploading && (
                <Box mb={2}>
                  <LinearProgress />
                  <Typography variant="body2" textAlign="center" mt={1}>
                    Uploading file...
                  </Typography>
                </Box>
              )}
              
              {/* Uploaded File Info */}
              {uploadedFile && (
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent sx={{ p: 2 }}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ bgcolor: 'success.main' }}>
                        <Map />
                      </Avatar>
                      <Box flexGrow={1}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {uploadedFile.originalName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatFileSize(uploadedFile.size)} • Uploaded by {uploadedFile.uploadedBy}
                        </Typography>
                      </Box>
                      <Chip label="Ready" color="success" />
                    </Box>
                  </CardContent>
                </Card>
              )}
              
              {/* Convert Button */}
              <Box display="flex" gap={2}>
                <Button
                  variant="contained"
                  startIcon={<Transform />}
                  onClick={() => setConvertDialogOpen(true)}
                  disabled={!uploadedFile || !scriptAvailable}
                  size="large"
                >
                  Convert to DXF
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<History />}
                  onClick={() => setHistoryDialogOpen(true)}
                >
                  View History
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Info Section */}
        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                About OSM to DXF
              </Typography>
              
              <Typography variant="body2" color="text.secondary" mb={2}>
                Convert OpenStreetMap data to AutoCAD DXF format with proper layer organization.
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Supported Formats"
                    secondary="OSM, OSM.XML, PBF"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Output Format"
                    secondary="AutoCAD DXF"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Layer Organization"
                    secondary="Automatic by feature type"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Coordinate Systems"
                    secondary="Multiple CRS support"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
          
          {/* Recent Conversions */}
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                Recent Conversions
              </Typography>
              
              {conversionHistory.length > 0 ? (
                <List dense>
                  {conversionHistory.slice(0, 3).map((file, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={file.name}
                        secondary={`${formatFileSize(file.size)} • ${new Date(file.created).toLocaleDateString()}`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          size="small"
                          onClick={() => handleDownload(file.name)}
                        >
                          <Download />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No conversions yet
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Convert Dialog */}
      <Dialog 
        open={convertDialogOpen} 
        onClose={() => setConvertDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Convert OSM to DXF</DialogTitle>
        <DialogContent>
          {uploadedFile && (
            <Typography variant="body2" color="text.secondary" mb={2}>
              Converting: {uploadedFile.originalName}
            </Typography>
          )}
          
          <TextField
            fullWidth
            label="Output File Name"
            value={conversionOptions.outputName}
            onChange={(e) => setConversionOptions(prev => ({ ...prev, outputName: e.target.value }))}
            placeholder="converted-map"
            margin="normal"
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Save to Project (Optional)</InputLabel>
            <Select
              value={conversionOptions.projectId}
              onChange={(e) => setConversionOptions(prev => ({ ...prev, projectId: e.target.value }))}
              label="Save to Project (Optional)"
            >
              <MenuItem value="">
                <em>Don't save to project</em>
              </MenuItem>
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {/* Advanced Options */}
          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle1">Advanced Options</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <FormControl fullWidth margin="normal">
                <InputLabel>Coordinate Reference System</InputLabel>
                <Select
                  value={conversionOptions.targetCrs}
                  onChange={(e) => setConversionOptions(prev => ({ ...prev, targetCrs: e.target.value }))}
                  label="Coordinate Reference System"
                >
                  {crsOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={conversionOptions.useColors}
                    onChange={(e) => setConversionOptions(prev => ({ ...prev, useColors: e.target.checked }))}
                  />
                }
                label="Use colors for layers"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={conversionOptions.verbose}
                    onChange={(e) => setConversionOptions(prev => ({ ...prev, verbose: e.target.checked }))}
                  />
                }
                label="Verbose logging"
              />
            </AccordionDetails>
          </Accordion>
          
          <Typography variant="body2" color="text.secondary" mt={2}>
            Created by: {user.name}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConvertDialogOpen(false)} disabled={converting}>
            Cancel
          </Button>
          <Button 
            onClick={handleConvert}
            variant="contained"
            disabled={converting}
            startIcon={converting ? null : <Transform />}
          >
            {converting ? 'Converting...' : 'Convert to DXF'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog 
        open={historyDialogOpen} 
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Conversion History</DialogTitle>
        <DialogContent>
          {conversionHistory.length > 0 ? (
            <List>
              {conversionHistory.map((file, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={file.name}
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          {formatFileSize(file.size)} • DXF File
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Created: {new Date(file.created).toLocaleDateString()}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton 
                      edge="end"
                      onClick={() => handleDownload(file.name)}
                    >
                      <Download />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box textAlign="center" py={4}>
              <Avatar sx={{ bgcolor: 'grey.300', width: 80, height: 80, mx: 'auto', mb: 2 }}>
                <History sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography variant="h6" color="text.secondary" mb={1}>
                No conversion history
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your converted DXF files will appear here
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default KeyLoc;