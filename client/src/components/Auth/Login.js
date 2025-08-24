import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  MenuItem,
  Alert,
  CircularProgress,
  Container,
  Avatar,
  Chip
} from '@mui/material';
import { Person, Lock, Business } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const { login, loading, teamMembers } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!formData.username || !formData.password) {
      setError('Please select your name and enter the password');
      setIsLoading(false);
      return;
    }

    try {
      const result = await login(formData.username, formData.password);
      
      if (!result.success) {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (memberName) => {
    setFormData({ username: memberName, password: 'drafteamprofinity' });
    setError('');
    setIsLoading(true);

    try {
      const result = await login(memberName, 'drafteamprofinity');
      
      if (!result.success) {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}
    >
      <Container maxWidth="sm">
        <Card 
          elevation={10}
          sx={{ 
            borderRadius: 3,
            overflow: 'visible',
            position: 'relative'
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {/* Logo/Header */}
            <Box textAlign="center" mb={4}>
              <img
                src="/logo.png"
                alt="DraftTeam Logo"
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '8px',
                  objectFit: 'cover',
                  margin: '0 auto 16px auto',
                  display: 'block'
                }}
              />
              <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
                DraftTeam
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Workshop Renovation Drawing Management
              </Typography>
            </Box>

            {/* Quick Login Buttons */}
            <Box mb={3}>
              <Typography variant="h6" gutterBottom textAlign="center">
                Quick Login
              </Typography>
              <Box 
                display="flex" 
                flexWrap="wrap" 
                gap={1} 
                justifyContent="center"
                mb={2}
              >
                {teamMembers.map((member) => (
                  <Chip
                    key={member.id}
                    label={`${member.name} (${member.role.split(' ')[0]})`}
                    onClick={() => handleQuickLogin(member.name)}
                    disabled={isLoading}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'primary.light',
                        color: 'white'
                      }
                    }}
                    variant={formData.username === member.name ? 'filled' : 'outlined'}
                    color={formData.username === member.name ? 'primary' : 'default'}
                  />
                ))}
              </Box>
            </Box>

            <Typography variant="body2" textAlign="center" color="text.secondary" mb={3}>
              Or login manually
            </Typography>

            {/* Login Form */}
            <form onSubmit={handleSubmit}>
              <TextField
                select
                fullWidth
                label="Select Your Name"
                name="username"
                value={formData.username}
                onChange={handleChange}
                margin="normal"
                disabled={isLoading}
                InputProps={{
                  startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />
                }}
              >
                {teamMembers.map((member) => (
                  <MenuItem key={member.id} value={member.name}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography>{member.name}</Typography>
                      <Chip 
                        label={member.role} 
                        size="small" 
                        variant="outlined"
                        color={member.role.includes('Senior') ? 'primary' : 'default'}
                      />
                    </Box>
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth
                type="password"
                label="Team Password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                margin="normal"
                disabled={isLoading}
                placeholder="drafteamprofinity"
                InputProps={{
                  startAdornment: <Lock sx={{ mr: 1, color: 'action.active' }} />
                }}
              />

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{ 
                  mt: 3, 
                  mb: 2,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 'bold'
                }}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Login to DraftTeam'
                )}
              </Button>
            </form>

            {/* Team Info */}
            <Box mt={3} p={2} bgcolor="grey.50" borderRadius={2}>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                <strong>Team Members:</strong> {teamMembers.map(m => m.name).join(', ')}
                <br />
                <strong>Password:</strong> Same for all team members
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default Login;