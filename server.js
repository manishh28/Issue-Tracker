'use strict';

require('dotenv').config();
const express    = require('express');
const bodyParser = require('body-parser');
const cors       = require('cors');
const mongoose   = require('mongoose');

const apiRoutes        = require('./routes/api.js');
const fccTestingRoutes = require('./routes/fcctesting.js');

const app = express();

app.use('/public', express.static(process.cwd() + '/public'));
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err.message));

app.route('/').get((_req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

fccTestingRoutes(app);
apiRoutes(app);

app.use((_req, res) => res.status(404).type('text').send('Not Found'));

const PORT = process.env.PORT || 3000;
const listener = app.listen(PORT, () => {
  console.log('Listening on port ' + listener.address().port);
});

module.exports = app;
