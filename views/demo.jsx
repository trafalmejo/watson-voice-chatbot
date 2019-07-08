/* eslint no-param-reassign: 0 */
import React, { Component } from 'react';
import Dropzone from 'react-dropzone';
import {
  Icon, Tabs, Pane, Alert,
} from 'watson-react-components';
import recognizeMicrophone from 'watson-speech/speech-to-text/recognize-microphone';
import recognizeFile from 'watson-speech/speech-to-text/recognize-file';
import XMLHttpRequest from 'xmlhttprequest';

import ModelDropdown from './model-dropdown.jsx';
import Transcript from './transcript.jsx';
import { Keywords, getKeywordsSummary } from './keywords.jsx';
import SpeakersView from './speaker.jsx';
import TimingView from './timing.jsx';
import JSONView from './json-view.jsx';
import samples from '../src/data/samples.json';
import cachedModels from '../src/data/models.json';
import voices from '../src/data/voices';
import PropType from 'prop-types';

const ERR_MIC_NARROWBAND = 'Microphone transcription cannot accommodate narrowband voice models, please select a broadband one.';
var sessionId;
var resp = 'Hi';
/**
 * @return {Function} A polyfill for URLSearchParams
 */
const getSearchParams = () => {
  if (typeof URLSearchParams === 'function') {
    return new URLSearchParams();
  }

  // Simple polyfill for URLSearchparams
  const SearchParams = function SearchParams() {
  };

  SearchParams.prototype.set = function set(key, value) {
    this[key] = value;
  };

  SearchParams.prototype.toString = function toString() {
    return Object.keys(this).map(v => `${encodeURI(v)}=${encodeURI(this[v])}`).join('&');
  };

  return new SearchParams();
};

/**
 * Validates that the mimetype is: audio/wav, audio/mpeg;codecs=mp3 or audio/ogg;codecs=opus
 * @param  {String} mimeType The audio mimetype
 * @return {bool} Returns true if the mimetype can be played.
 */
const canPlayAudioFormat = (mimeType) => {
  const audio = document.createElement('audio');
  if (audio) {
    return (typeof audio.canPlayType === 'function' && audio.canPlayType(mimeType) !== '');
  }
  return false;
};

export class Demo extends Component {
  constructor(props) {
    //var sessionId = ''
    super();
    this.state = {
      //assistant
      //sessionId: '',
      messageEndpoint:'http://localhost:3000/api/message',
      sessionEndpoint:'http://localhost:3000/api/session',
      messageReceived: 'Hi',
      //text to speech
      voice: voices[1], // Allison v3 is the first voice
      error: null, // the error from calling /classify
      text: 'Press Start', // default text
      ssml: 'Press Start', // SSML text
      ssml_voice: voices[1].demo.ssml_voice, // Voice SSML text, only some voices support this
      ssmlLabel: 'SSML',
      current_tab: 0,
      loading: false,
      //speech to text
      model: 'en-US_BroadbandModel',
      rawMessages: [],
      formattedMessages: [],
      audioSource: null,
      speakerLabels: false,
      keywords: this.getKeywords('en-US_BroadbandModel'),
      // transcript model and keywords are the state that they were when the button was clicked.
      // Changing them during a transcription would cause a mismatch between the setting sent to the
      // service and what is displayed on the demo, and could cause bugs.
      settingsAtStreamStart: {
        model: '',
        keywords: [],
        speakerLabels: false,
      },
      error: null,
    };

    this.handleSampleClick = this.handleSampleClick.bind(this);
    this.handleSample1Click = this.handleSample1Click.bind(this);
    this.handleSample2Click = this.handleSample2Click.bind(this);
    this.reset = this.reset.bind(this);
    this.captureSettings = this.captureSettings.bind(this);
    this.stopTranscription = this.stopTranscription.bind(this);
    this.getRecognizeOptions = this.getRecognizeOptions.bind(this);
    this.isNarrowBand = this.isNarrowBand.bind(this);
    this.handleMicClick = this.handleMicClick.bind(this);
    this.handleUploadClick = this.handleUploadClick.bind(this);
    this.handleUserFile = this.handleUserFile.bind(this);
    this.handleUserFileRejection = this.handleUserFileRejection.bind(this);
    this.playFile = this.playFile.bind(this);
    this.handleStream = this.handleStream.bind(this);
    this.handleRawMessage = this.handleRawMessage.bind(this);
    this.handleFormattedMessage = this.handleFormattedMessage.bind(this);
    this.handleTranscriptEnd = this.handleTranscriptEnd.bind(this);
    this.getKeywords = this.getKeywords.bind(this);
    this.handleModelChange = this.handleModelChange.bind(this);
    this.supportsSpeakerLabels = this.supportsSpeakerLabels.bind(this);
    this.handleSpeakerLabelsChange = this.handleSpeakerLabelsChange.bind(this);
    this.handleKeywordsChange = this.handleKeywordsChange.bind(this);
    this.getKeywordsArr = this.getKeywordsArr.bind(this);
    this.getKeywordsArrUnique = this.getKeywordsArrUnique.bind(this);
    this.getFinalResults = this.getFinalResults.bind(this);
    this.getCurrentInterimResult = this.getCurrentInterimResult.bind(this);
    this.getFinalAndLatestInterimResult = this.getFinalAndLatestInterimResult.bind(this);
    this.handleError = this.handleError.bind(this);
    //assistant
    this.sendRequest = this.sendRequest.bind(this);
    this.sendText = this.sendText.bind(this);
    this.getSessionId = this.getSessionId.bind(this);
    this.testGET = this.testGET.bind(this);
    this.testPOST = this.testPOST.bind(this);
    this.changeText = this.changeText.bind(this);
    this.getResponse = this.getResponse.bind(this);

    //text to speech
    this.audioElementRef = React.createRef();
    this.onTabChange = this.onTabChange.bind(this);
    this.onTextChange = this.onTextChange.bind(this);
    this.onSsmlChange = this.onSsmlChange.bind(this);
    this.onVoiceSsmlChange = this.onVoiceSsmlChange.bind(this);
    this.onDownload = this.onDownload.bind(this);
    this.onSpeak = this.onSpeak.bind(this);
    this.onResetClick = this.onResetClick.bind(this);
    this.onVoiceChange = this.onVoiceChange.bind(this);
    this.onAudioLoaded = this.onAudioLoaded.bind(this);
    this.setupParamsFromState = this.setupParamsFromState.bind(this);
    this.downloadDisabled = this.downloadDisabled.bind(this);
    this.speakDisabled = this.speakDisabled.bind(this);
    this.downloadAllowed = this.downloadAllowed.bind(this);
    this.handleAudioError = this.handleAudioError.bind(this);

  }
  testGET(){

    fetch('http://localhost:3000/api/test/?results=10')
  .then(function(response) {
    return response.json();
  })
  .then(function(myJson) {
    console.log(JSON.stringify(myJson));
  });

  }
  testPOST(){
    const url = 'http://localhost:3000/api/test';
    // The data we are going to send in our request
    let data = {
        name: 'Sara'
    }
    // Create our request constructor with all the parameters we need
    var request = new Request(url, {
        method: 'POST', 
        body: data, 
        headers: new Headers()
    });

    fetch(request)
    .then(function() {
        // Handle response we get from the API
    })
  }
  sendText(response) {
    var http = new XMLHttpRequest.XMLHttpRequest();
    http.open("POST", speechEndpoint, true);
    http.responseType = 'arraybuffer';
    http.setRequestHeader("Content-type", "application/json");
    http.onreadystatechange = function () { 
        if (http.readyState == 4 && http.status == 200) {
            //var json = JSON.parse(http.responseText);
            //console.log('response positive: ', http.response)
            context.decodeAudioData(http.response, function(buffer) {
              dogBarkingBuffer = buffer;
              playMessage(buffer)
            }, null);
               
        }
    }
    var data = JSON.stringify({"text":response,"accept":"audio/wav","voice":"en-US/AllisonVoice"});
    http.send(data);
  }

  // Send a message request to the server
   sendRequest(text) {
    console.log('session: ', sessionId)
    var jsonSession = JSON.parse(sessionId)
    // Build request payload
    var payloadToWatson = {
      session_id: jsonSession.session_id
    };

    payloadToWatson.input = {
      message_type: 'text',
      text: text,
    };
    var that = this;
    fetch('http://localhost:3000/api/message/?text='+text+"&&session="+jsonSession.session_id)
    .then(function(response) {
      //console.log('1')
      return response.json();
    })
    .then(function(myJson) {
      //console.log('2')
      var jsonResponse = JSON.stringify(myJson)
      var text = myJson.output.generic[0].text
      console.log(text);
      resp = text;
      that.setState({ messageReceived: text});

      //SYNTHETIZE
      const params = that.setupParamsFromState(true);
      const audio = that.audioElementRef.current;
      audio.setAttribute('type', 'audio/ogg;codecs=opus');
      audio.setAttribute('src', `/api/v1/synthesize?${params.toString()}`);
      that.setState({ loading: true, hasAudio: false });
    });
  }

  getSessionId() {
    console.log('getting session');
    var http = new XMLHttpRequest.XMLHttpRequest();
    http.open('GET', this.state.sessionEndpoint, true);
    http.setRequestHeader('Content-type', 'application/json');
    http.onreadystatechange = function () {
      if (http.readyState == 4 && http.status == 200) {
        var res = JSON.parse(http.responseText);
        console.log('parsing.. ', http.responseText)
        sessionId = http.responseText;
        //this.sendRequest('');
      }
    };
    http.send();
  }
//
  componentDidMount() {
    if (this.audioElementRef.current) {
      this.audioElementRef.current.addEventListener('play', this.onAudioLoaded);
      this.audioElementRef.current.addEventListener('error', this.handleAudioError);
    }
  }

  componentWillUnmount() {
    if (this.audioElementRef.current) {
      this.audioElementRef.current.removeEventListener('play', this.onAudioLoaded);
      this.audioElementRef.current.removeEventListener('error', this.handleAudioError);
    }
  }

  onTabChange(idx) {
    this.setState({ current_tab: idx });
  }

  onTextChange(event) {
    console.log('Text Changed')
    this.setState({ text: event.target.value });
  }

  onSsmlChange(event) {
    this.setState({ ssml: event.target.value });
  }

  onVoiceSsmlChange(event) {
    this.setState({ ssml_voice: event.target.value });
  }

  onAudioLoaded() {
    this.setState({ loading: false, hasAudio: true });
    //PLAY
    console.log("Play..")
    this.audioElementRef.current.play;
  }

  onDownload(event) {
    event.target.blur();
    const params = this.setupParamsFromState(true);
    window.location.href = `/api/v1/synthesize?${params.toString()}`;
  }

  onSpeak(event) {
    console.log("Button Speak Pressed")
    event.target.blur();
    const params = this.setupParamsFromState(true);

    const audio = this.audioElementRef.current;
    audio.setAttribute('type', 'audio/ogg;codecs=opus');
    audio.setAttribute('src', `/api/v1/synthesize?${params.toString()}`);

    this.setState({ loading: true, hasAudio: false });
  }


  changeText(){
    this.setState({
      text: response
    });
  }
  onResetClick() {
    // pause audio, if it's playing.
    document.querySelector('audio#audio').pause();
    const { voice } = this.state;
    this.setState({
      error: null,
      hasAudio: false,
      text: voice.demo.text,
      ssml: voice.demo.ssml,
      ssml_voice: voice.demo.ssml_voice,
    });
  }

  onVoiceChange(event) {
    const voice = voices[voices.map(v => v.name).indexOf(event.target.value)];
    const label = voice.name.indexOf('en-US_Allison') === 0 ? 'Expressive SSML' : 'SSML';
    this.setState({
      voice,
      error: null,
      text: voice.demo.text,
      ssml: voice.demo.ssml,
      ssml_voice: voice.demo.ssml_voice,
      ssmlLabel: label,
    });
  }

  setupParamsFromState(doDownload) {
    const {
      text, voice, current_tab, ssmlLabel, ssml_voice, ssml,
    } = this.state;

    const params = getSearchParams();
    if (this.state && current_tab === 0) {
      params.set('text', resp);
      params.set('voice', voice.name);
    } else if (this.state && current_tab === 1) {
      params.set('text', ssml);
      params.set('voice', voice.name);
      params.set('ssmlLabel', ssmlLabel);
    } else if (this.state && current_tab === 2) {
      params.set('text', ssml_voice);
      params.set('voice', voice.name);
    }
    params.set('download', doDownload);

    if (canPlayAudioFormat('audio/mp3')) {
      params.set('accept', 'audio/mp3');
    } else if (canPlayAudioFormat('audio/ogg;codec=opus')) {
      params.set('accept', 'audio/ogg;codec=opus');
    } else if (canPlayAudioFormat('audio/wav')) {
      params.set('accept', 'audio/wav');
    }
    console.log(JSON.stringify(params));
    return params;
  }

  handleAudioError(error) {
    console.error(error);
    this.setState({ error: { error: 'Could not play audio' }, loading: false });
    setTimeout(() => this.setState({ error: null }), 5000);
  }

  downloadDisabled() {
    return !this.downloadAllowed();
  }

  speakDisabled() {
    return this.downloadDisabled();
  }

  downloadAllowed() {
    const {
      ssml, ssml_voice, current_tab, text,
    } = this.state;
    return (
      (ssml_voice && current_tab === 2)
      || (ssml && current_tab === 1)
      || (current_tab === 0 && text)
    );
  }

  //SPEECH TO TEXT
  reset() {
    if (this.state.audioSource) {
      this.stopTranscription();
    }
    this.setState({ rawMessages: [], formattedMessages: [], error: null });
  }

  /**
     * The behavior of several of the views depends on the settings when the
     * transcription was started. So, this stores those values in a settingsAtStreamStart object.
     */
  captureSettings() {
    const { model, speakerLabels } = this.state;
    this.setState({
      settingsAtStreamStart: {
        model,
        keywords: this.getKeywordsArrUnique(),
        speakerLabels,
      },
    });
  }

  stopTranscription() {
    if (this.stream) {
      this.stream.stop();
      // this.stream.removeAllListeners();
      // this.stream.recognizeStream.removeAllListeners();
    }
    this.setState({ audioSource: null });
  }

  getRecognizeOptions(extra) {
    const keywords = this.getKeywordsArrUnique();
    return Object.assign({
      // formats phone numbers, currency, etc. (server-side)
      access_token: this.state.accessToken,
      token: this.state.token,
      smart_formatting: true,
      format: true, // adds capitals, periods, and a few other things (client-side)
      model: this.state.model,
      objectMode: true,
      interim_results: true,
      // note: in normal usage, you'd probably set this a bit higher
      word_alternatives_threshold: 0.01,
      keywords,
      keywords_threshold: keywords.length
        ? 0.01
        : undefined, // note: in normal usage, you'd probably set this a bit higher
      timestamps: true, // set timestamps for each word - automatically turned on by speaker_labels
      // includes the speaker_labels in separate objects unless resultsBySpeaker is enabled
      speaker_labels: this.state.speakerLabels,
      // combines speaker_labels and results together into single objects,
      // making for easier transcript outputting
      resultsBySpeaker: this.state.speakerLabels,
      // allow interim results through before the speaker has been determined
      speakerlessInterim: this.state.speakerLabels,
      url: this.state.serviceUrl,
    }, extra);
  }

  isNarrowBand(model) {
    model = model || this.state.model;
    return model.indexOf('Narrowband') !== -1;
  }

  handleMicClick() {
    if (this.state.audioSource === 'mic') {
      const messages = this.getFinalAndLatestInterimResult();

      const results = messages.map(msg => msg.results.map((result, i) => (
        <span key={`result-${msg.result_index + i}`}>{result.alternatives[0].transcript}</span>
      ))).reduce((a, b) => a.concat(b), []); // the reduce() call flattens the array
      
      console.log('Results: ', results.length)
      // if(results.length > 0){
        var recordText = results[0].props.children;
        console.log('sending: ', recordText)
        this.sendRequest(recordText, null);
       //this.sendRequest(results[0].props.children);
      // }      
     // this.sendRequest(results);
      this.stopTranscription();
      return;
    }
    this.reset();
    this.setState({ audioSource: 'mic' });

    // The recognizeMicrophone() method is a helper method provided by the watson-speech package
    // It sets up the microphone, converts and downsamples the audio, and then transcribes it
    // over a WebSocket connection
    // It also provides a number of optional features, some of which are enabled by default:
    //  * enables object mode by default (options.objectMode)
    //  * formats results (Capitals, periods, etc.) (options.format)
    //  * outputs the text to a DOM element - not used in this demo because it doesn't play nice
    // with react (options.outputElement)
    //  * a few other things for backwards compatibility and sane defaults
    // In addition to this, it passes other service-level options along to the RecognizeStream that
    // manages the actual WebSocket connection.
    this.handleStream(recognizeMicrophone(this.getRecognizeOptions()));
  }

  handleUploadClick() {
    if (this.state.audioSource === 'upload') {
      this.stopTranscription();
    } else {
      this.dropzone.open();
    }
  }

  handleUserFile(files) {
    const file = files[0];
    if (!file) {
      return;
    }
    this.reset();
    this.setState({ audioSource: 'upload' });
    this.playFile(file);
  }

  handleUserFileRejection() {
    this.setState({ error: 'Sorry, that file does not appear to be compatible.' });
  }

  handleSample1Click() {
    this.handleSampleClick(1);
  }

  handleSample2Click() {
    this.handleSampleClick(2);
  }


  handleSampleClick(which) {
    if (this.state.audioSource === `sample-${which}`) {
      this.stopTranscription();
    } else {
      const filename = samples[this.state.model] && samples[this.state.model][which - 1].filename;
      if (!filename) {
        this.handleError(`No sample ${which} available for model ${this.state.model}`, samples[this.state.model]);
      }
      this.reset();
      this.setState({ audioSource: `sample-${which}` });
      this.playFile(`audio/${filename}`);
    }
  }

  /**
   * @param {File|Blob|String} file - url to an audio file or a File
   * instance fro user-provided files.
   */
  playFile(file) {
    // The recognizeFile() method is a helper method provided by the watson-speach package
    // It accepts a file input and transcribes the contents over a WebSocket connection
    // It also provides a number of optional features, some of which are enabled by default:
    //  * enables object mode by default (options.objectMode)
    //  * plays the file in the browser if possible (options.play)
    //  * formats results (Capitals, periods, etc.) (options.format)
    //  * slows results down to realtime speed if received faster than realtime -
    // this causes extra interim `data` events to be emitted (options.realtime)
    //  * combines speaker_labels with results (options.resultsBySpeaker)
    //  * outputs the text to a DOM element - not used in this demo because it doesn't play
    //  nice with react (options.outputElement)
    //  * a few other things for backwards compatibility and sane defaults
    // In addition to this, it passes other service-level options along to the RecognizeStream
    // that manages the actual WebSocket connection.
    this.handleStream(recognizeFile(this.getRecognizeOptions({
      file,
      play: true, // play the audio out loud
      // use a helper stream to slow down the transcript output to match the audio speed
      realtime: true,
    })));
  }

  

  handleStream(stream) {
    console.log('Stream: ', stream);
    // cleanup old stream if appropriate
    if (this.stream) {
      this.stream.stop();
      this.stream.removeAllListeners();
      this.stream.recognizeStream.removeAllListeners();
    }
    this.stream = stream;
    this.captureSettings();

    // grab the formatted messages and also handle errors and such
    stream.on('data', this.handleFormattedMessage).on('end', this.handleTranscriptEnd).on('error', this.handleError);

    // when errors occur, the end event may not propagate through the helper streams.
    // However, the recognizeStream should always fire a end and close events
    stream.recognizeStream.on('end', () => {
      if (this.state.error) {
        this.handleTranscriptEnd();
      }
    });

    // grab raw messages from the debugging events for display on the JSON tab
    stream.recognizeStream
      .on('message', (frame, json) => this.handleRawMessage({ sent: false, frame, json }))
      .on('send-json', json => this.handleRawMessage({ sent: true, json }))
      .once('send-data', () => this.handleRawMessage({
        sent: true, binary: true, data: true, // discard the binary data to avoid waisting memory
      }))
      .on('close', (code, message) => this.handleRawMessage({ close: true, code, message }));

    // ['open','close','finish','end','error', 'pipe'].forEach(e => {
    //     stream.recognizeStream.on(e, console.log.bind(console, 'rs event: ', e));
    //     stream.on(e, console.log.bind(console, 'stream event: ', e));
    // });
  }

  handleRawMessage(msg) {
    const { rawMessages } = this.state;
    this.setState({ rawMessages: rawMessages.concat(msg) });
  }

  handleFormattedMessage(msg) {
    const { formattedMessages } = this.state;
    this.setState({ formattedMessages: formattedMessages.concat(msg) });
  }

  handleTranscriptEnd() {
    // note: this function will be called twice on a clean end,
    // but may only be called once in the event of an error
    this.setState({ audioSource: null });

  }

  componentDidMount() {
    this.fetchToken();
    // tokens expire after 60 minutes, so automatcally fetch a new one ever 50 minutes
    // Not sure if this will work properly if a computer goes to sleep for > 50 minutes
    // and then wakes back up
    // react automatically binds the call to this
    // eslint-disable-next-line
    this.setState({ tokenInterval: setInterval(this.fetchToken, 50 * 60 * 1000) });
    console.log('this: ',this)
    //var request = this.sendRequest('', null);
    this.getSessionId();
    // this.testGET();
    // this.testPOST();
   // this.sendRequest('');
    //this.getSessionId(this.sendRequest);
  }

  componentWillUnmount() {
    clearInterval(this.state.tokenInterval);
  }

  fetchToken() {
    return fetch('/api/v1/credentials').then((res) => {
      if (res.status !== 200) {
        throw new Error('Error retrieving auth token');
      }
      return res.json();
    }) // todo: throw here if non-200 status
      .then(creds => this.setState({ ...creds })).catch(this.handleError);
  }

  getKeywords(model) {
    // a few models have more than two sample files, but the demo can only handle
    // two samples at the moment
    // so this just takes the keywords from the first two samples
    const files = samples[model];
    return (files && files.length >= 2 && `${files[0].keywords}, ${files[1].keywords}`) || '';
  }

  handleModelChange(model) {
    this.reset();
    this.setState({
      model,
      keywords: this.getKeywords(model),
      speakerLabels: this.supportsSpeakerLabels(model),
    });

    // clear the microphone narrowband error if it's visible and a broadband model was just selected
    if (this.state.error === ERR_MIC_NARROWBAND && !this.isNarrowBand(model)) {
      this.setState({ error: null });
    }

    // clear the speaker_lables is not supported error - e.g.
    // speaker_labels is not a supported feature for model en-US_BroadbandModel
    if (this.state.error && this.state.error.indexOf('speaker_labels is not a supported feature for model') === 0) {
      this.setState({ error: null });
    }
  }

  supportsSpeakerLabels(model) {
    model = model || this.state.model;
    // todo: read the upd-to-date models list instead of the cached one
    return cachedModels.some(m => m.name === model && m.supported_features.speaker_labels);
  }

  handleSpeakerLabelsChange() {
    this.setState(prevState => ({ speakerLabels: !prevState.speakerLabels }));
  }

  handleKeywordsChange(e) {
    this.setState({ keywords: e.target.value });
  }

  // cleans up the keywords string into an array of individual, trimmed, non-empty keywords/phrases
  getKeywordsArr() {
    return this.state.keywords.split(',').map(k => k.trim()).filter(k => k);
  }

  // cleans up the keywords string and produces a unique list of keywords
  getKeywordsArrUnique() {
    return this.state.keywords
      .split(',')
      .map(k => k.trim())
      .filter((value, index, self) => self.indexOf(value) === index);
  }

  getFinalResults() {
    return this.state.formattedMessages.filter(r => r.results
      && r.results.length && r.results[0].final);
  }

  getCurrentInterimResult() {
    const r = this.state.formattedMessages[this.state.formattedMessages.length - 1];

    // When resultsBySpeaker is enabled, each msg.results array may contain multiple results.
    // However, all results in a given message will be either final or interim, so just checking
    // the first one still works here.
    if (!r || !r.results || !r.results.length || r.results[0].final) {
      return null;
    }
    return r;
  }

  getFinalAndLatestInterimResult() {
    const final = this.getFinalResults();
    const interim = this.getCurrentInterimResult();
    if (interim) {
      final.push(interim);
    }
    return final;
  }
  getResponse(){
    return resp
  }
  handleError(err, extra) {
    console.error(err, extra);
    if (err.name === 'UNRECOGNIZED_FORMAT') {
      err = 'Unable to determine content type from file name or header; mp3, wav, flac, ogg, opus, and webm are supported. Please choose a different file.';
    } else if (err.name === 'NotSupportedError' && this.state.audioSource === 'mic') {
      err = 'This browser does not support microphone input.';
    } else if (err.message === '(\'UpsamplingNotAllowed\', 8000, 16000)') {
      err = 'Please select a narrowband voice model to transcribe 8KHz audio files.';
    } else if (err.message === 'Invalid constraint') {
      // iPod Touch does this on iOS 11 - there is a microphone, but Safari claims there isn't
      err = 'Unable to access microphone';
    }
    this.setState({ error: err.message || err });
  }

  render() {
    const {
      token, accessToken, audioSource, error, model, speakerLabels, settingsAtStreamStart, messageReceived, 
      formattedMessages, rawMessages, ssml, ssml_voice, voice, loading, hasAudio, ssmlLabel, text,
    } = this.state;

    const buttonsEnabled = !!token || !!accessToken;
    const buttonClass = buttonsEnabled
      ? 'base--button'
      : 'base--button base--button_black';

    let micIconFill = '#000000';
    let micButtonClass = buttonClass;
    if (audioSource === 'mic') {
      micButtonClass += ' mic-active';
      micIconFill = '#FFFFFF';
    } else if (!recognizeMicrophone.isSupported) {
      micButtonClass += ' base--button_black';
    }

    const err = error
      ? (
        <Alert type="error" color="red">
          <p className="base--p">
            {error}
          </p>
        </Alert>
      )
      : null;

    const messages = this.getFinalAndLatestInterimResult();
    var messageResponse = this.getResponse();
    //this.askAssistantFunction(messages)
    //console.log('Mesages: ', messages)




    const micBullet = (typeof window !== 'undefined' && recognizeMicrophone.isSupported)
      ? <li className="base--li">Use your microphone to record audio. For best results, use broadband models for microphone input.</li>
      : <li className="base--li base--p_light">Use your microphone to record audio. (Not supported in current browser)</li>;// eslint-disable-line

    return (

      <Dropzone
        onDropAccepted={this.handleUserFile}
        onDropRejected={this.handleUserFileRejection}
        maxSize={200 * 1024 * 1024}
        accept="audio/wav, audio/mp3, audio/mpeg, audio/l16, audio/ogg, audio/flac, .mp3, .mpeg, .wav, .ogg, .opus, .flac" // eslint-disable-line
        disableClick
        className="dropzone _container _container_large"
        activeClassName="dropzone-active"
        rejectClassName="dropzone-reject"
        ref={(node) => {
          this.dropzone = node;
        }}
      >
{/* 
        <div className="drop-info-container">
          <div className="drop-info">
            <h1>Drop an audio file here.</h1>
            <p>Watson Speech to Text supports .mp3, .mpeg, .wav, .opus, and
              .flac files up to 200mb.
            </p>
          </div>
        </div> */}

        {/* <h2 className="base--h2">Transcribe Audio</h2>

        <ul className="base--ul">
          {micBullet}
          <li className="base--li">Upload pre-recorded audio (.mp3, .mpeg, .wav, .flac, or .opus only).</li>
          <li className="base--li">Play one of the sample audio files.*</li>
        </ul>

        <div className="smalltext">
          *Both US English broadband sample audio files are covered under the
          Creative Commons license.
        </div>

        <div style={{
          paddingRight: '3em',
          paddingBottom: '2em',
        }}
        >
          The returned result includes the recognized text, {' '}
          <a className="base--a" href="https://cloud.ibm.com/docs/services/speech-to-text?topic=speech-to-text-output#word_alternatives">word alternatives</a>, {' '}
          and <a className="base--a" href="https://cloud.ibm.com/docs/services/speech-to-text?topic=speech-to-text-output#keyword_spotting">spotted keywords</a>. {' '}
          Some models can <a className="base--a" href="https://cloud.ibm.com/docs/services/speech-to-text?topic=speech-to-text-output#speaker_labels">detect multiple speakers</a>; this may slow down performance.
        </div> */}
        <div className="flex setup">
          <div className="column">

            {/* <p>Voice Model:
              <ModelDropdown
                model={model}
                token={token || accessToken}
                onChange={this.handleModelChange}
              />
            </p> */}

            <p className={this.supportsSpeakerLabels() ? 'base--p' : 'base--p_light'}>
              <input
                className="base--checkbox"
                type="checkbox"
                checked={speakerLabels}
                onChange={this.handleSpeakerLabelsChange}
                disabled={!this.supportsSpeakerLabels()}
                id="speaker-labels"
              />
              {/* <label className="base--inline-label" htmlFor="speaker-labels">
                Detect multiple speakers {this.supportsSpeakerLabels() ? '' : ' (Not supported on current model)'}
              </label> */}
            </p>

          </div>
          <div className="column">

            {/* <p>Keywords to spot: <input
              value={this.getKeywordsArrUnique().join()}
              onChange={this.handleKeywordsChange}
              type="text"
              id="keywords"
              placeholder="Type comma separated keywords here (optional)"
              className="base--input"
            />
            </p> */}

          </div>
        </div>


        <div className="flex buttons">

          <button type="button" className={micButtonClass} onClick={this.handleMicClick}>
            <Icon type={audioSource === 'mic' ? 'stop' : 'microphone'} fill={micIconFill} /> Record Audio
          </button>

          {/* <button type="button" className={buttonClass} onClick={this.handleUploadClick}>
            <Icon type={audioSource === 'upload' ? 'stop' : 'upload'} /> Upload Audio File
          </button>

          <button type="button" className={buttonClass} onClick={this.handleSample1Click}>
            <Icon type={audioSource === 'sample-1' ? 'stop' : 'play'} /> Play Sample 1
          </button>

          <button type="button" className={buttonClass} onClick={this.handleSample2Click}>
            <Icon type={audioSource === 'sample-2' ? 'stop' : 'play'} /> Play Sample 2
          </button> */}

        </div>

        {err}

        <Tabs selected={0}>
          <Pane label="Text">
            {settingsAtStreamStart.speakerLabels
              ? <SpeakersView messages={messages} />
              : <Transcript messages={messages} />}
          </Pane>
          {/* <Pane label="Word Timings and Alternatives">
            <TimingView messages={messages} />
          </Pane>
          <Pane label={`Keywords ${getKeywordsSummary(settingsAtStreamStart.keywords, messages)}`}>
            <Keywords
              messages={messages}
              keywords={settingsAtStreamStart.keywords}
              isInProgress={!!audioSource}
            />
          </Pane>
          <Pane label="JSON">
            <JSONView raw={rawMessages} formatted={formattedMessages} />
          </Pane> */}
        </Tabs>
        <div className="voice-input">
      <select
        name="voice"
        className="base--select"
        onChange={this.onVoiceChange}
        value={voice.name}
      >
        {voices.map(v => (
          <option key={v.name} value={v.name}>
            {v.option}
          </option>
        ))}
      </select>
    </div>
    <Tabs selected={0} onChange={this.onTabChange}>
            <Pane label="Text">
              {/* {messageResponse} */}
              <Transcript messages={messageReceived} />
              {/* <textarea onChange={this.onTextChange} className="base--textarea textarea" spellCheck="false" value={text || ''} /> */}
            </Pane>
            {/* <Pane label={ssmlLabel}>
              <textarea onChange={this.onSsmlChange} className="base--textarea textarea" spellCheck="false" value={ssml || ''} />
            </Pane>
            <Pane label="Voice Transformation SSML">
              <textarea readOnly={!ssml_voice} onChange={this.onVoiceSsmlChange} className="base--textarea textarea" spellCheck="false" value={ssml_voice || 'Voice Transformation not currently supported for this voice.'} />
            </Pane> */}
          </Tabs>
          <div className="output-container">
            <div className="controls-container">
              <div className="buttons-container">
                {/* <button
                  type="button"
                  onClick={this.onDownload}
                  disabled={this.downloadDisabled()}
                  className="base--button download-button hidden"
                >
                  Download
                </button> */}
                <ConditionalSpeakButton
                  loading={loading}
                  onClick={this.onSpeak}
                  disabled={this.speakDisabled()}
                />
              </div>
              {/* <div className={!loading && hasAudio ? 'reset-container' : 'reset-container dimmed'}>
                <Icon type="reset" />
                <a
                  href="#reset"
                  className="base--a reset-button"
                  onClick={this.onResetClick}
                >
                  Reset
                </a>
              </div> */}
            </div>
            {/* <div className={`errorMessage ${error ? '' : 'hidden'}`}>
              <Icon type="error" />
              <p className="base--p service-error--message">
                {error ? error.error : ''}
              </p>
            </div>
            <div className={`text-center loading ${loading ? '' : 'hidden'}`}>
              <Icon type="loader" />
            </div> */}
            <audio ref={this.audioElementRef} autoPlay id="audio" className={`audio ${hasAudio ? '' : 'hidden'}`} controls="controls">
              Your browser does not support the audio element.
            </audio>
          </div>
      </Dropzone>
      
    );
  }
};

class ConditionalSpeakButton extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    this.checkBrowser();
  }

  checkBrowser() {
    this.setState({ canPlay: canPlayAudioFormat('audio/ogg;codecs=opus') });
  }

  render() {
    const { onClick, loading, disabled } = this.props;
    const { canPlay } = this.state;
    return (canPlay) ? (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={loading ? 'base--button speak-button loading' : 'base--button speak-button'}
      >
        Speak
      </button>
    ) : (
      <button
        type="button"
        onClick={onClick}
        className="base--button speak-button speak-disabled"
        title="Only available on Chrome and Firefox"
        disabled
      >
        Speak
      </button>
    );
  }
}

ConditionalSpeakButton.defaultProps = {
  disabled: false,
  onClick: s => s,
  loading: false,
};

ConditionalSpeakButton.propTypes = {
  disabled: PropType.bool,
  onClick: PropType.func,
  loading: PropType.bool,
};

export default Demo;
