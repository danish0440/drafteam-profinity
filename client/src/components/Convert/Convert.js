import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Avatar,
  Paper,
  Divider,
  LinearProgress,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import {
  Upload,
  PictureAsPdf,
  Download,
  Delete,
  Merge,
  CallSplit,
  CloudUpload,
  Visibility,
  Save,
  FolderOpen
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker with version matching
try {
  // Use the same version as the installed pdfjs-dist package
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
} catch (error) {
  console.warn('PDF.js worker configuration failed:', error);
  // Fallback to local worker if available
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.js',
      import.meta.url
    ).toString();
  } catch (fallbackError) {
    console.error('All PDF.js worker configurations failed');
  }
}

const Convert = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [projects, setProjects] = useState([]);
  
  // Merge state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeOptions, setMergeOptions] = useState({
    outputName: '',
    projectId: ''
  });
  
  // Split state
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [splitFile, setSplitFile] = useState(null);
  const [splitRanges, setSplitRanges] = useState([{ start: 1, end: 1 }]);
  const [splitOptions, setSplitOptions] = useState({
    projectId: ''
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    setUploading(true);
    const formData = new FormData();
    
    acceptedFiles.forEach(file => {
      formData.append('files', file);
    });
    
    try {
      const response = await axios.post('/api/convert/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        // Generate client-side thumbnails for uploaded files
        const filesWithThumbnails = await Promise.all(
          response.data.files.map(async (fileData, index) => {
            const originalFile = acceptedFiles[index];
            const clientThumbnail = await generatePDFThumbnail(originalFile);
            
            return {
              ...fileData,
              clientThumbnail: clientThumbnail
            };
          })
        );
        
        setUploadedFiles(prev => [...prev, ...filesWithThumbnails]);
        toast.success(`${acceptedFiles.length} PDF file(s) uploaded successfully`);
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
      'application/pdf': ['.pdf']
    },
    multiple: true
  });

  const handleFileSelect = (file) => {
    setSelectedFiles(prev => {
      const isSelected = prev.some(f => f.id === file.id);
      if (isSelected) {
        return prev.filter(f => f.id !== file.id);
      } else {
        return [...prev, file];
      }
    });
  };

  const handleMerge = async () => {
    if (selectedFiles.length < 2) {
      toast.error('Please select at least 2 files to merge');
      return;
    }
    
    setProcessing(true);
    
    try {
      const response = await axios.post('/api/convert/merge', {
        fileIds: selectedFiles.map(f => f.filename),
        outputName: mergeOptions.outputName || 'merged-pdf',
        projectId: mergeOptions.projectId || null
      });
      
      if (response.data.success) {
        toast.success('PDF files merged successfully!');
        setMergeDialogOpen(false);
        setSelectedFiles([]);
        setMergeOptions({ outputName: '', projectId: '' });
        
        // Offer download
        if (response.data.file) {
          const downloadUrl = `/api/convert/download/${response.data.file.name}`;
          window.open(downloadUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('Merge error:', error);
      toast.error('Merge failed: ' + (error.response?.data?.error || 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  const handleSplit = async () => {
    if (!splitFile) {
      toast.error('Please select a file to split');
      return;
    }
    
    if (splitRanges.length === 0) {
      toast.error('Please specify page ranges');
      return;
    }
    
    setProcessing(true);
    
    try {
      const response = await axios.post('/api/convert/split', {
        fileId: splitFile.filename,
        ranges: splitRanges,
        projectId: splitOptions.projectId || null
      });
      
      if (response.data.success) {
        toast.success(`PDF split into ${response.data.files.length} files successfully!`);
        setSplitDialogOpen(false);
        setSplitFile(null);
        setSplitRanges([{ start: 1, end: 1 }]);
        setSplitOptions({ projectId: '' });
      }
    } catch (error) {
      console.error('Split error:', error);
      toast.error('Split failed: ' + (error.response?.data?.error || 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const addSplitRange = () => {
    setSplitRanges(prev => [...prev, { start: 1, end: 1 }]);
  };

  const removeSplitRange = (index) => {
    setSplitRanges(prev => prev.filter((_, i) => i !== index));
  };

  const updateSplitRange = (index, field, value) => {
    setSplitRanges(prev => prev.map((range, i) => 
      i === index ? { ...range, [field]: parseInt(value) || 1 } : range
    ));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Generate PDF thumbnail using PDF.js
  const generatePDFThumbnail = async (file) => {
    try {
      console.log('Starting PDF thumbnail generation for:', file.name);
      
      // Check if PDF.js is properly loaded
      if (!pdfjsLib || !pdfjsLib.getDocument) {
        console.error('PDF.js library not properly loaded');
        return null;
      }
      
      const arrayBuffer = await file.arrayBuffer();
      console.log('File loaded, size:', arrayBuffer.byteLength);
      
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        verbosity: 0 // Reduce console noise
      });
      
      const pdf = await loadingTask.promise;
      console.log('PDF loaded, pages:', pdf.numPages);
      
      const page = await pdf.getPage(1);
      console.log('First page loaded');
      
      const scale = 1.2; // Reduced scale for better performance
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      // Set canvas dimensions
      canvas.height = Math.min(viewport.height, 400); // Limit height
      canvas.width = Math.min(viewport.width, 300);   // Limit width
      
      // Adjust viewport to fit canvas
      const scaleX = canvas.width / viewport.width;
      const scaleY = canvas.height / viewport.height;
      const finalScale = Math.min(scaleX, scaleY) * scale;
      
      const finalViewport = page.getViewport({ scale: finalScale });
      
      const renderContext = {
        canvasContext: context,
        viewport: finalViewport
      };
      
      await page.render(renderContext).promise;
      console.log('PDF page rendered successfully');
      
      const dataUrl = canvas.toDataURL('image/png', 0.7);
      console.log('Thumbnail generated, size:', dataUrl.length);
      
      return dataUrl;
    } catch (error) {
      console.error('Error generating PDF thumbnail:', error.message || error);
      console.error('Error details:', error);
      return null;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          PDF Converter
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Merge and split PDF files with preview and project linking
        </Typography>
      </Box>

      {/* Upload Area */}
      <Card elevation={2} sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" mb={2}>
            Upload PDF Files
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
              transition: 'all 0.2s ease'
            }}
          >
            <input {...getInputProps()} />
            <CloudUpload sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'Drop PDF files here' : 'Drag & drop PDF files here'}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              or click to select files
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Only PDF files are supported
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
        </CardContent>
      </Card>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <Card elevation={2} sx={{ mb: 4 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight="bold">
                Uploaded Files ({uploadedFiles.length})
              </Typography>
              <Box>
                <Button
                  variant="contained"
                  startIcon={<Merge />}
                  onClick={() => setMergeDialogOpen(true)}
                  disabled={selectedFiles.length < 2}
                  sx={{ mr: 1 }}
                >
                  Merge Selected ({selectedFiles.length})
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CallSplit />}
                  onClick={() => {
                    if (selectedFiles.length === 1) {
                      setSplitFile(selectedFiles[0]);
                      setSplitDialogOpen(true);
                    } else {
                      toast.error('Please select exactly one file to split');
                    }
                  }}
                  disabled={selectedFiles.length !== 1}
                >
                  Split Selected
                </Button>
              </Box>
            </Box>
            
            <Grid container spacing={2}>
              {uploadedFiles.map((file) => {
                const isSelected = selectedFiles.some(f => f.id === file.id);
                
                return (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={file.id}>
                    <Card 
                      elevation={isSelected ? 4 : 1}
                      sx={{
                        cursor: 'pointer',
                        border: isSelected ? '2px solid' : '1px solid',
                        borderColor: isSelected ? 'primary.main' : 'grey.300',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => handleFileSelect(file)}
                    >
                      <CardContent sx={{ p: 2 }}>
                        {/* File Preview */}
                        <Box textAlign="center" mb={2}>
                          {(file.clientThumbnail || file.thumbnail) ? (
                            <img
                              src={file.clientThumbnail || file.thumbnail}
                              alt={file.originalName}
                              style={{
                                width: '100%',
                                height: '150px',
                                objectFit: 'cover',
                                borderRadius: '8px',
                                border: '1px solid #e0e0e0'
                              }}
                              onError={(e) => {
                                console.log('Thumbnail failed to load:', file.clientThumbnail || file.thumbnail);
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <Avatar
                            sx={{
                              width: 100,
                              height: 100,
                              bgcolor: 'error.main',
                              mx: 'auto',
                              display: (file.clientThumbnail || file.thumbnail) ? 'none' : 'flex'
                            }}
                          >
                            <PictureAsPdf sx={{ fontSize: 50 }} />
                          </Avatar>
                        </Box>
                        
                        {/* File Info */}
                        <Typography 
                          variant="body2" 
                          fontWeight="bold" 
                          noWrap 
                          title={file.originalName}
                        >
                          {file.originalName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatFileSize(file.size)}
                        </Typography>
                        
                        {/* Selection Indicator */}
                        {isSelected && (
                          <Chip
                            label="Selected"
                            color="primary"
                            size="small"
                            sx={{ mt: 1 }}
                          />
                        )}
                        
                        {/* Actions */}
                        <Box display="flex" justifyContent="space-between" mt={1}>
                          <IconButton 
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Preview functionality could be added here
                            }}
                          >
                            <Visibility />
                          </IconButton>
                          <IconButton 
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFile(file.id);
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Merge Dialog */}
      <Dialog 
        open={mergeDialogOpen} 
        onClose={() => setMergeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Merge PDF Files</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Merging {selectedFiles.length} files
          </Typography>
          
          <TextField
            fullWidth
            label="Output File Name"
            value={mergeOptions.outputName}
            onChange={(e) => setMergeOptions(prev => ({ ...prev, outputName: e.target.value }))}
            placeholder="merged-pdf"
            margin="normal"
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Save to Project (Optional)</InputLabel>
            <Select
              value={mergeOptions.projectId}
              onChange={(e) => setMergeOptions(prev => ({ ...prev, projectId: e.target.value }))}
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
          
          <Typography variant="body2" color="text.secondary" mt={2}>
            Created by: {user.name}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMergeDialogOpen(false)} disabled={processing}>
            Cancel
          </Button>
          <Button 
            onClick={handleMerge}
            variant="contained"
            disabled={processing}
            startIcon={processing ? null : <Merge />}
          >
            {processing ? 'Merging...' : 'Merge Files'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Split Dialog */}
      <Dialog 
        open={splitDialogOpen} 
        onClose={() => setSplitDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Split PDF File</DialogTitle>
        <DialogContent>
          {splitFile && (
            <Typography variant="body2" color="text.secondary" mb={2}>
              Splitting: {splitFile.originalName}
            </Typography>
          )}
          
          <Typography variant="h6" mb={2}>Page Ranges</Typography>
          
          {splitRanges.map((range, index) => (
            <Box key={index} display="flex" alignItems="center" gap={2} mb={2}>
              <TextField
                label="Start Page"
                type="number"
                value={range.start}
                onChange={(e) => updateSplitRange(index, 'start', e.target.value)}
                inputProps={{ min: 1 }}
                size="small"
              />
              <Typography>to</Typography>
              <TextField
                label="End Page"
                type="number"
                value={range.end}
                onChange={(e) => updateSplitRange(index, 'end', e.target.value)}
                inputProps={{ min: 1 }}
                size="small"
              />
              <IconButton 
                color="error"
                onClick={() => removeSplitRange(index)}
                disabled={splitRanges.length === 1}
              >
                <Delete />
              </IconButton>
            </Box>
          ))}
          
          <Button 
            variant="outlined" 
            onClick={addSplitRange}
            sx={{ mb: 2 }}
          >
            Add Range
          </Button>
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Save to Project (Optional)</InputLabel>
            <Select
              value={splitOptions.projectId}
              onChange={(e) => setSplitOptions(prev => ({ ...prev, projectId: e.target.value }))}
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
          
          <Typography variant="body2" color="text.secondary" mt={2}>
            Created by: {user.name}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSplitDialogOpen(false)} disabled={processing}>
            Cancel
          </Button>
          <Button 
            onClick={handleSplit}
            variant="contained"
            disabled={processing}
            startIcon={processing ? null : <CallSplit />}
          >
            {processing ? 'Splitting...' : 'Split File'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Convert;