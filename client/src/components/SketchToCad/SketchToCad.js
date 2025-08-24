import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Paper,
  Grid,
  Alert,
  LinearProgress,
  Chip
} from '@mui/material';
import {
  CloudUpload,
  AutoFixHigh,
  Download,
  Info
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

const SketchToCad = () => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [converting, setConverting] = useState(false);
  const [converted, setConverted] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setUploadedFile(acceptedFiles[0]);
        setConverted(false);
      }
    }
  });

  const handleConvert = () => {
    setConverting(true);
    // Simulate conversion process
    setTimeout(() => {
      setConverting(false);
      setConverted(true);
    }, 3000);
  };

  const handleDownload = () => {
    // Simulate download
    const link = document.createElement('a');
    link.href = '#';
    link.download = 'converted-sketch.dwg';
    link.click();
  };

  return (
    <Box>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Sketch to CAD Converter
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Convert hand-drawn sketches and images to CAD format
        </Typography>
      </Box>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Info />
          <Typography variant="body2">
            This is a demo feature. Upload an image file to test the interface.
          </Typography>
        </Box>
      </Alert>

      <Grid container spacing={3}>
        {/* Upload Section */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Upload Sketch
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
                  {isDragActive ? 'Drop sketch here' : 'Drag & drop sketch here'}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  or click to select file
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Supported: PNG, JPG, JPEG, GIF, BMP
                </Typography>
              </Paper>

              {uploadedFile && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Uploaded File:
                  </Typography>
                  <Chip 
                    label={uploadedFile.name}
                    color="primary"
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                  <Box>
                    <Button
                      variant="contained"
                      startIcon={<AutoFixHigh />}
                      onClick={handleConvert}
                      disabled={converting || converted}
                      fullWidth
                    >
                      {converting ? 'Converting...' : converted ? 'Converted!' : 'Convert to CAD'}
                    </Button>
                  </Box>
                </Box>
              )}

              {converting && (
                <Box mt={2}>
                  <LinearProgress />
                  <Typography variant="body2" textAlign="center" mt={1}>
                    Processing sketch... This may take a few moments.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Results Section */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Conversion Results
              </Typography>
              
              {!uploadedFile && (
                <Box textAlign="center" py={4}>
                  <Typography variant="body2" color="text.secondary">
                    Upload a sketch to see conversion results here
                  </Typography>
                </Box>
              )}

              {uploadedFile && !converted && !converting && (
                <Box textAlign="center" py={4}>
                  <Typography variant="body2" color="text.secondary">
                    Click "Convert to CAD" to start the conversion process
                  </Typography>
                </Box>
              )}

              {converted && (
                <Box>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Sketch successfully converted to CAD format!
                  </Alert>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Generated Files:
                  </Typography>
                  
                  <Box mb={2}>
                    <Chip 
                      label="converted-sketch.dwg"
                      color="success"
                      variant="outlined"
                      sx={{ mr: 1, mb: 1 }}
                    />
                    <Chip 
                      label="sketch-vectors.dxf"
                      color="success"
                      variant="outlined"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  </Box>

                  <Button
                    variant="contained"
                    startIcon={<Download />}
                    onClick={handleDownload}
                    fullWidth
                    color="success"
                  >
                    Download CAD Files
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Features Info */}
      <Box mt={4}>
        <Card elevation={1}>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Feature Capabilities (Demo)
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Image Processing
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Advanced edge detection and line recognition
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Vector Conversion
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Convert raster images to vector CAD format
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Multiple Formats
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Export to DWG, DXF, and other CAD formats
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Batch Processing
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Process multiple sketches simultaneously
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default SketchToCad;