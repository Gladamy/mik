const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000; // Vercel provides the port via the environment variable

const filePath = './threads.json';

// Configure multer storage
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // Limit file size to 10MB (adjust as needed)
});

let threads = [];

// Load threads from JSON file
function loadThreads() {
  if (fs.existsSync(filePath)) {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading threads.json:', err);
        threads = [];
      } else {
        try {
          threads = JSON.parse(data);
          console.log('Threads loaded successfully!');
        } catch (err) {
          console.error('Error parsing threads.json:', err);
          threads = [];
        }
      }
    });
  } else {
    console.error('threads.json file not found.');
  }
}

// Save threads to JSON file
function saveThreads() {
  fs.writeFile(filePath, JSON.stringify(threads, null, 2), err => {
    if (err) {
      console.error('Error saving threads:', err);
      throw err;
    }
    console.log('Threads saved successfully!');
  });
}

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post('/upload', upload.single('image'), (req, res) => {
  const { name, title, content, tags } = req.body;
  const image = req.file ? req.file.filename : '';

  const newThread = {
    id: Date.now().toString(),
    name,
    title,
    content,
    tags,
    image,
    timestamp: new Date().toISOString(),
    comments: []
  };
  threads.push(newThread);
  saveThreads();

  console.log('Thread uploaded:', newThread);
  res.redirect('/');
});

app.get('/threads', (req, res) => {
  res.json(threads);
});

app.get('/threads/:id', (req, res) => {
  const { id } = req.params;
  const thread = threads.find(thread => thread.id === id);
  if (thread) {
    res.json(thread);
  } else {
    res.status(404).send('Thread not found.');
  }
});

app.get('/threads/:id/comments', (req, res) => {
  const { id } = req.params;
  const thread = threads.find(thread => thread.id === id);
  if (thread) {
    res.json(thread.comments || []);
  } else {
    res.status(404).send('Thread not found.');
  }
});

// Adjusted /threads/:id/comments endpoint to handle comments with images
app.post('/threads/:id/comments', upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { name, content, parentId } = req.body;
    const image = req.file ? req.file.filename : ''; // Handle image upload
  
    const thread = threads.find(thread => thread.id === id);
    if (thread) {
      const newComment = {
        id: Date.now().toString(),
        name,
        content,
        image,
        timestamp: new Date().toISOString()
      };
  
      if (parentId) {
        const parentComment = findCommentById(thread.comments, parentId);
        if (parentComment) {
          if (!parentComment.replies) {
            parentComment.replies = [];
          }
          parentComment.replies.push(newComment);
        }
      } else {
        thread.comments.push(newComment);
      }
  
      saveThreads();
      console.log('Comment added:', newComment); // Log the added comment
      res.status(201).json(newComment);
    } else {
      res.status(404).send('Thread not found.');
    }
  });
  
function findCommentById(comments, id) {
  for (const comment of comments) {
    if (comment.id === id) {
      return comment;
    }
    if (comment.replies) {
      const found = findCommentById(comment.replies, id);
      if (found) return found;
    }
  }
  return null;
}

app.delete('/threads/:id', (req, res) => {
  const { id } = req.params;
  const index = threads.findIndex(thread => thread.id === id);
  if (index !== -1) {
    threads.splice(index, 1);
    saveThreads();
    res.status(200).send('Thread deleted successfully.');
  } else {
    res.status(404).send('Thread not found.');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  loadThreads();
});
