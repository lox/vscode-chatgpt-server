// Import the express library
const express = require('express');

// Import the axios library, to make HTTP requests
const axios = require('axios');

// Import express-session library
const session = require('express-session');

// Import dotenv library to load environment variables
require('dotenv').config();

// Use the environment variables
const clientID = process.env.GITHUB_CLIENT_ID;
const clientSecret = process.env.GITHUB_CLIENT_SECRET;
const sessionSecret = process.env.SESSION_SECRET;

// Create a new express application
const app = express();

// Configure express-session middleware
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, sameSite: true },
  })
);

// Use the express static middleware, to serve all files
// inside the public directory
app.use(express.static(__dirname + '/public'));

app.get('/auth/github', (req, res) => {
  // Redirect the user to GitHub's authorization page
  res.redirect(`https://github.com/login/oauth/authorize?client_id=${clientID}`);
});

app.get('/auth/github/callback', (req, res) => {
  // The req.query object has the query params that
  // were sent to this route. We want the `code` param
  const requestToken = req.query.code;

  axios({
    // make a POST request
    method: 'post',
    // to the Github authentication API, with the client ID, client secret
    // and request token
    url: `https://github.com/login/oauth/access_token?client_id=${clientID}&client_secret=${clientSecret}&code=${requestToken}`,
    // Set the content type header, so that we get the response in JSON
    headers: {
      accept: 'application/json',
    },
  })
    .then((response) => {
      // Once we get the response, extract the access token from
      // the response body
      const accessToken = response.data.access_token;

      // Store the access token in the session object for later use
      req.session.accessToken = accessToken;

      // Redirect the user to the welcome page without including the access token
      res.redirect('/welcome.html');
    })
    .catch((error) => {
      console.log(`Error in /oauth/redirect: ${error}`);
      res.redirect('/error.html');
    });
});

// New endpoint to get user information from GitHub
app.get('/user', (req, res) => {
  const accessToken = req.session.accessToken;

  if (!accessToken) {
    return res.status(401).send('User is not authenticated');
  }

  // Call the GitHub API
  axios({
    method: 'get',
    url: `https://api.github.com/user`,
    headers: {
      accept: 'application/vnd.github.v3+json',
      Authorization: 'token ' + accessToken,
    },
  })
    .then((response) => {
      // Send back the user data
      res.send(response.data);
    })
    .catch((error) => {
      console.error(`Error in /user: ${error}`);
      res.status(500).send('Error retrieving user data');
    });
});

// Start the server on port 8080
app.listen(8080);
