const express = require('express');
const { google } = require('googleapis');
const path = require('path');
const cors = require('cors');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


app.use(express.static(path.join(__dirname, 'src')));

// Load the service account key JSON file
const KEYFILEPATH = path.join(__dirname, 'keys', 'sa.json');

// Define the scopes required
const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets'
];

// Create an authorized client
const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

// Create a route to list files
app.get('/list-files', async (req, res) => {
  try {
    const client = await auth.getClient();
    const drive = google.drive({ version: 'v3', auth: client });

    const response = await drive.files.list({
      pageSize: 10,
      fields: 'files(id, name)',
    });

    res.status(200).json(response.data.files);
  } catch (error) {
    console.error('Error retrieving files:', error);
    res.status(500).send('Error retrieving files');
  }
});

// Create a route to get a file by ID
app.get('/get-file/:fileId', async (req, res) => {
  try {
    const client = await auth.getClient();
    const drive = google.drive({ version: 'v3', auth: client });

    const fileId = req.params.fileId;
    const response = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, size, webViewLink',
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error retrieving file:', error);
    res.status(500).send('Error retrieving file');
  }
});
// Create a route to get the full content of a file by ID
app.get('/download-file/:fileId', async (req, res) => {
  try {
    const client = await auth.getClient();
    const drive = google.drive({ version: 'v3', auth: client });

    const fileId = req.params.fileId;
    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    response.data
      .on('end', () => {
        console.log('File download completed.');
      })
      .on('error', (err) => {
        console.error('Error downloading file:', err);
        res.status(500).send('Error downloading file');
      })
      .pipe(res);
  } catch (error) {
    console.error('Error retrieving file content:', error);
    res.status(500).send('Error retrieving file content');
  }
});

// Create a route to get all data from a Google Sheet
app.get('/sheet-data/:spreadsheetId/:range', async (req, res) => {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const spreadsheetId = req.params.spreadsheetId;
    const range = req.params.range; // e.g., 'Sheet1!A1:W91'

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return res.status(404).send('No data found.');
    }

    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      let rowObject = {};
      headers.forEach((header, index) => {
        rowObject[header] = row[index] || null; // Assign null if the cell is empty
      });
      return rowObject;
    });

    console.log(data.length);

    res.status(200).json(data);
  } catch (error) {
    console.error('Error retrieving sheet data:', error);
    res.status(500).send('Error retrieving sheet data');
  }
});

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', ws => {
  console.log('Client connected');
});

// Endpoint to receive notifications from Google Apps Script
app.post('/notify-change', (req, res) => {
  console.log('Notification received');
  console.log(req.body);
  // Fetch updated data from Google Sheets
  // Notify all connected WebSocket clients
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ message: 'Data updated' }));
    }
  });
  res.status(200).send('Notification received');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});