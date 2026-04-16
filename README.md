# AskMyDocs

A full-stack MERN application that allows users to upload PDF documents and have intelligent conversations with them using AI-powered question answering.

## 🚀 Features

- **Document Upload**: Upload and process PDF documents
- **AI-Powered Chat**: Ask questions about your documents and get contextual answers
- **User Authentication**: Secure login and registration system
- **Document Management**: View and manage your uploaded documents
- **Real-time Chat Interface**: Interactive chat with your documents
- **Vector Search**: Fast semantic search using embeddings
- **Cloud Storage**: Secure document storage on AWS S3

## 🛠️ Tech Stack

### Frontend
- **React** - UI library
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing


## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **MongoDB** (local or cloud instance)
- **AWS Account** (for S3 storage)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd askmydocs
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

## 🚀 Running the Application

### Development Mode

1. **Start the backend server**
   ```bash
   cd server
   npm run dev
   ```

2. **Start the frontend (in a new terminal)**
   ```bash
   cd client
   npm run dev
   ```

3. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

### Production Build

1. **Build the client**
   ```bash
   cd client
   npm run build
   ```

2. **Start the server**
   ```bash
   cd server
   npm start
   ```

## 📁 Project Structure

```
askmydocs/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── utils/         # Utility functions
│   │   └── App.jsx        # Main app component
│   ├── package.json
│   └── vite.config.js
├── server/                 # Node.js backend
│   ├── lib/               # Core utilities
│   │   ├── auth.js        # Authentication logic
│   │   ├── db.js          # Database connection
│   │   ├── embeddings.js  # AI embeddings
│   │   ├── vectorSearch.js # Vector search functionality
│   │   └── storage.js     # File storage utilities
│   ├── models/            # MongoDB schemas
│   ├── routes/            # API routes
│   ├── index.js           # Server entry point
│   └── package.json
├── vercel.json            # Vercel deployment config
└── README.md

```
## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Live Demo**: [https://ask-my-docs-ten.vercel.app](https://ask-my-docs-ten.vercel.app)   
   
