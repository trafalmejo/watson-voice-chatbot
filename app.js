/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY npmKIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const express = require('express');
const app = express();
const SpeechToTextV1 = require('ibm-watson/speech-to-text/v1');
const AuthorizationV1 = require('ibm-watson/authorization/v1');
const IamTokenManagerV1 = require('ibm-watson/iam-token-manager/v1');
const TextToSpeechV1 = require('ibm-watson/text-to-speech/v1');
const AssistantV2 = require('ibm-watson/assistant/v2');
var bodyParser = require('body-parser'); // parser for post requests

var urlencodedParser = bodyParser.urlencoded({ extended: true }); // for parsing form data
app.use(urlencodedParser); 

const getFileExtension = (acceptQuery) => {
  const accept = acceptQuery || '';
  switch (accept) {
    case 'audio/ogg;codecs=opus':
    case 'audio/ogg;codecs=vorbis':
      return 'ogg';
    case 'audio/wav':
      return 'wav';
    case 'audio/mpeg':
      return 'mpeg';
    case 'audio/webm':
      return 'webm';
    case 'audio/flac':
      return 'flac';
    default:
      return 'mp3';
  }
};

// Bootstrap application settings
require('./config/express')(app);

// Create the token manager
//let textToSpeech;
let tokenManager;
let tokenTextToSpeech;
let instanceType;
const serviceUrl = process.env.SPEECH_TO_TEXT_URL || 'https://stream.watsonplatform.net/speech-to-text/api';


const textToSpeech = new TextToSpeechV1({
  username: process.env.TEXT_TO_SPEECH_USERNAME,
  password: process.env.TEXT_TO_SPEECH_PASSWORD,
  url: process.env.TEXT_TO_SPEECH_URL
});
const assistant = new AssistantV2({
  version: '2019-05-05',
  username: process.env.ASSISTANT_USERNAME,
  password: process.env.ASSISTANT_PASSWORD,
  url: process.env.ASSISTANT_URL
});

if (process.env.SPEECH_TO_TEXT_IAM_APIKEY && process.env.SPEECH_TO_TEXT_IAM_APIKEY !== '') {
  instanceType = 'iam';
  tokenManager = new IamTokenManagerV1({
    iamApikey: process.env.SPEECH_TO_TEXT_IAM_APIKEY || '<iam_apikey>',
    iamUrl: process.env.SPEECH_TO_TEXT_IAM_URL || 'https://iam.bluemix.net/identity/token',
  });
} else {
  instanceType = 'cf';
  const speechService = new SpeechToTextV1({
    username: process.env.SPEECH_TO_TEXT_USERNAME || '<username>',
    password: process.env.SPEECH_TO_TEXT_PASSWORD || '<password>',
    url: serviceUrl,
  });
  tokenManager = new AuthorizationV1(speechService.getServiceCredentials());
}

app.get('/', (req, res) => res.render('index'));

// Get credentials using your credentials
app.get('/api/v1/credentials', (req, res, next) => {
  tokenManager.getToken((err, token) => {
    if (err) {
      next(err);
    } else {
      let credentials;
      if (instanceType === 'iam') {
        credentials = {
          accessToken: token,
          serviceUrl,
        };
      } else {
        credentials = {
          token: token.token,
          serviceUrl,
        };
      }
      res.json(credentials);
    }
  });
});
app.get('/api/message', function (req, res) {
  //console.log('received request: ', req.query);
  var assistantId = process.env.ASSISTANT_ID || '<assistant-id>';
  if (!assistantId || assistantId === '<assistant-id>') {
    return res.json({
      'output': {
        'text': 'The app has not been configured with a <b>ASSISTANT_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/assistant-simple">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/assistant-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
      }
    });
  }
  var textIn = '';

  if(req.query.text) {
    textIn = req.query.text;
  }

  var payload = {
    assistant_id: assistantId,
    session_id: req.query.session,
    input: {
      message_type : 'text',
      text : textIn
    }
  };
    // Send the input to the assistant service
    assistant.message(payload, function (err, data) {
      if (err) {
        const status = (err.code  !== undefined && err.code > 0)? err.code : 500;
        return res.status(status).json(err);
      }
      return res.json(data);
    });
})
// Endpoint to be call from the client side
app.post('/api/message', function (req, res) {
  console.log('received request: ', req.query);
  var assistantId = process.env.ASSISTANT_ID || '<assistant-id>';
  if (!assistantId || assistantId === '<assistant-id>') {
    return res.json({
      'output': {
        'text': 'The app has not been configured with a <b>ASSISTANT_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/assistant-simple">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/assistant-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
      }
    });
  }

  var textIn = '';

  if(req.body.input) {
    textIn = req.body.input.text;
  }

  var payload = {
    assistant_id: assistantId,
    session_id: req.body.session_id,
    input: {
      message_type : 'text',
      text : textIn
    }
  };
  // Send the input to the assistant service
  assistant.message(payload, function (err, data) {
    if (err) {
      const status = (err.code  !== undefined && err.code > 0)? err.code : 500;
      return res.status(status).json(err);
    }
    return res.json(data);
  });
});
app.get('/api/session', function (req, res) {
  //console.log('Getting Session...', req)
  assistant.createSession({
    assistant_id: process.env.ASSISTANT_ID || '{assistant_id}',
  }, function (error, response) {
    if (error) {
      console.log('Session error: ', error)
      return res.send(error);
    } else {
      console.log('Session success: ', response)
      return res.send(response);
    }
  });
});
app.get('/api/test', (req, res, next) => {
  console.log("test: ", req.query)
});
app.post('/api/test', (req, res, next) => {
  console.log("test: ", req.body)
});
/**
 * Pipe the synthesize method
 */
app.get('/api/v1/synthesize', (req, res, next) => {

  console.log('Req: ', req.query)
  textToSpeech.synthesize(req.query)
  .then(audio => {
    // console.log('yes')
    audio.pipe(res);
    //audio.pipe(fs.createWriteStream('hello_world.wav'));
  })
  .catch(err => {
    console.log('error:', err);
  });
  // var transcript = textToSpeech.synthesize(req.query);
  // console.log(transcript)
  // transcript.then('response', (response) => {
  //   console.log('response: ', response)
  //   if (req.query.download) {
  //     response.headers['content-disposition'] = `attachment; filename=transcript.${getFileExtension(req.query.accept)}`;
  //   }
  // });
  // transcript.on('error', next);
  // transcript.pipe(res);
});

// Return the list of voices
app.get('/api/v1/voices', (req, res, next) => {
  textToSpeech.voices(null, (error, voices) => {
    if (error) {
      return next(error);
    }
    return res.json(voices);
  });
});

module.exports = app;
