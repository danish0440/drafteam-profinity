# DraftTeam - Workshop Renovation Management System

A production-ready web application for managing workshop renovation projects with 2D/3D drawings, PDF conversion tools, and OSM to DXF conversion.

## Features

### 🏗️ Project Management
- Manage 46 workshop renovation projects
- Upload and organize AutoCAD (.dwg, .dxf), SketchUp (.skp), and PDF files
- Track project progress and status
- Team collaboration with file access tracking

### 📄 PDF Converter
- Merge multiple PDF files into one
- Split PDF files by page ranges
- File preview with thumbnails
- Save converted files to specific projects
- Track conversion history with user attribution

### 🗺️ Key&Loc (OSM to DXF)
- Convert OpenStreetMap data to AutoCAD DXF format
- Support for .osm, .osm.xml, and .pbf files
- Multiple coordinate reference systems
- Layer organization by feature type
- Integration with existing Python conversion script

### 👥 Team Authentication
- Simple team-based login system
- Shared password: `drafteamprofinity`
- Team members: Adip (Senior), Elyas, Syahmi, Alip (Juniors)
- User activity tracking

## Technology Stack

### Frontend
- **React 18** with TypeScript support
- **Material-UI (MUI)** for modern UI components
- **React Router** for navigation
- **Axios** for API communication
- **React Dropzone** for file uploads
- **React PDF** for PDF preview
- **React Toastify** for notifications

### Backend
- **Node.js** with Express.js
- **Multer** for file upload handling
- **PDF-lib** for PDF manipulation
- **pdf2pic** for PDF thumbnails
- **Sharp** for image processing
- **Child Process** for Python script integration

### File Processing
- **Python** OSM to DXF converter (existing script)
- **PDF manipulation** with merge/split capabilities
- **Thumbnail generation** for file previews
- **File type validation** and size limits

## Installation

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+ with required packages:
  ```bash
  pip install ezdxf osmium pyproj Flask Flask-CORS
  ```

### Setup

1. **Install all dependencies:**
   ```bash
   npm run install-all
   ```

2. **Start development servers:**
   ```bash
   npm run dev
   ```
   This starts both backend (port 5000) and frontend (port 3000)

3. **Or start individually:**
   ```bash
   # Backend only
   npm run server
   
   # Frontend only
   npm run client
   ```

## Project Structure

```
drafteam3/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── Auth/       # Login components
│   │   │   ├── Dashboard/  # Dashboard components
│   │   │   ├── Projects/   # Project management
│   │   │   ├── Convert/    # PDF conversion tools
│   │   │   ├── KeyLoc/     # OSM to DXF converter
│   │   │   └── Layout/     # Layout components
│   │   ├── contexts/       # React contexts
│   │   └── App.js         # Main app component
│   ├── public/            # Static files
│   └── package.json       # Frontend dependencies
├── server/                # Node.js backend
│   ├── routes/            # API routes
│   │   ├── convert.js     # PDF conversion APIs
│   │   ├── osm.js         # OSM conversion APIs
│   │   └── files.js       # File management APIs
│   ├── uploads/           # File storage
│   │   ├── projects/      # Project files
│   │   ├── converted/     # Converted files
│   │   └── temp/          # Temporary files
│   ├── index.js           # Server entry point
│   └── package.json       # Backend dependencies
├── osm_to_dxf.py          # Python OSM converter
├── requirements.txt       # Python dependencies
└── package.json           # Root package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Team member login
- `GET /api/team` - Get team members

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project details

### File Management
- `POST /api/files/upload` - Upload files to project
- `GET /api/files/project/:id` - Get project files
- `GET /api/files/download/:projectId/:filename` - Download file
- `DELETE /api/files/:projectId/:filename` - Delete file

### PDF Conversion
- `POST /api/convert/upload` - Upload PDF files
- `POST /api/convert/merge` - Merge PDF files
- `POST /api/convert/split` - Split PDF file
- `GET /api/convert/download/:filename` - Download converted file

### OSM Conversion
- `POST /api/osm/upload` - Upload OSM file
- `POST /api/osm/convert` - Convert OSM to DXF
- `GET /api/osm/history` - Get conversion history
- `GET /api/osm/download/:filename` - Download DXF file

## Deployment to Contabo VPS

### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python and pip
sudo apt install python3 python3-pip -y

# Install Python dependencies
pip3 install ezdxf osmium pyproj Flask Flask-CORS

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y
```

### 2. Application Deployment
```bash
# Clone repository
git clone <your-repo-url> /var/www/drafteam
cd /var/www/drafteam

# Install dependencies
npm run install-all

# Build frontend
npm run build

# Start with PM2
pm2 start server/index.js --name "drafteam-server"
pm2 startup
pm2 save
```

### 3. Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Serve React build files
    location / {
        root /var/www/drafteam/client/build;
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy API requests to Node.js
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Serve uploaded files
    location /uploads {
        alias /var/www/drafteam/server/uploads;
    }
    
    # File upload size limit
    client_max_body_size 200M;
}
```

### 4. SSL with Let's Encrypt
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Environment Variables

Create `.env` file in server directory:
```env
PORT=5000
NODE_ENV=production
UPLOAD_PATH=/var/www/drafteam/server/uploads
```

## Team Members

- **Adip** - Senior Draftsman
- **Elyas** - Junior Draftsman  
- **Syahmi** - Junior Draftsman
- **Alip** - Junior Draftsman

**Shared Password:** `drafteamprofinity`

## Workshop Projects (46 Total)

1. R-Tune Auto
2. RAB Ceria
3. Amran Quality
4. MFN Utara
5. ZRS Garage
... (and 41 more)

## Support

For technical support or questions about the DraftTeam system, contact the development team.

## License

MIT License - Built for DraftTeam workshop renovation management.