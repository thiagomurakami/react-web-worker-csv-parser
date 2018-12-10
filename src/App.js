import React, { Component } from 'react'
import Dropzone from 'react-dropzone'
import csv from 'csvtojson'
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles'
import LinearProgress from '@material-ui/core/LinearProgress'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Switch from '@material-ui/core/Switch'

import sonic from './sonic.gif'
import CsvWorker from './Csv.worker.js'
import './App.css'

const theme = createMuiTheme({
  palette: {
    type: 'dark',
  },
})

const batchSize = 1000

class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      withWebWorker: true,
      isProcessing: false,
      currentProgress: 0,
      total: 0,
    }
  }
  componentDidMount() {
    this.worker = new CsvWorker()
    this.worker.addEventListener('message', this.handleMessageFromCsvWorker)
  }

  componentWillUnmount() {
    if (this.worker) {
      this.worker.terminate()
    }
  }

  handleChange = name => event => {
    function mySlowFunction(baseNumber) {
      console.time('mySlowFunction');
      var result = 0;
      for (var i = Math.pow(baseNumber, 10); i >= 0; i--) {
        result += Math.atan(i) * Math.tan(i);
      };
      console.timeEnd('mySlowFunction');
      return result;
    }

    mySlowFunction(5);
    this.setState({ [name]: event.target.checked })
  }

  handleMessageFromCsvWorker = message => {
    this.setState(prevState => ({
      ...prevState,
      currentProgress: prevState.currentProgress + message.data.processed,
    }))
  }

  onDropWithWorker = acceptedFiles => {
    acceptedFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = async () => {
        const fileAsBinaryString = reader.result
        const total = fileAsBinaryString.trim().split(/\r\n|\r|\n/).length - 1 // Considering header and last line as empty.
        console.log('number of entries: ', total)
        this.setState({
          isProcessing: true,
          total,
        })
        this.worker.postMessage({ csv: fileAsBinaryString })
        // do whatever you want with the file content
        // console.log(await csv().fromString(fileAsBinaryString))
      }
      reader.onabort = () => console.log('file reading was aborted')
      reader.onerror = () => console.log('file reading has failed')

      reader.readAsBinaryString(file)
    })
  }

  onDropWithoutWorker = acceptedFiles => {
    acceptedFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = async () => {
        const fileAsBinaryString = reader.result
        let processed = 0
        this.setState({
          isProcessing: true,
          total: fileAsBinaryString.split(/\r\n|\r|\n/).length - 2,
        })
        csv()
          .fromString(fileAsBinaryString)
          .subscribe(json => {
            return new Promise((resolve, reject) => {
              processed = processed + 1
              if (processed > batchSize) {
                this.setState(prevState => ({
                  ...prevState,
                  currentProgress: prevState.currentProgress + processed,
                }))
                processed = 0
              }
              resolve(json)
            })
          })
          .on('done', err => {
            if (!err) {
              this.setState(prevState => ({
                ...prevState,
                currentProgress: prevState.currentProgress + processed,
              }))
            }
          })
        // do whatever you want with the file content
        // console.log(await csv().fromString(fileAsBinaryString))
      }
      reader.onabort = () => console.log('file reading was aborted')
      reader.onerror = () => console.log('file reading has failed')

      reader.readAsBinaryString(file)
    })
  }

  render() {
    return (
      <MuiThemeProvider theme={theme}>
        <div className="App">
          <header className="App-header">
            <div className="App-logo-container">
            <img src={sonic} className="App-logo" alt="logo" />
            </div>
            {this.state.isProcessing && (
              <div style={{ width: 500, margin: 50 }}>
                <p>
                  {this.state.currentProgress} / {this.state.total}
                </p>
                <LinearProgress
                  variant="determinate"
                  value={(this.state.currentProgress / this.state.total) * 100}
                />
              </div>
            )}
            <div style={{ color: 'white' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={this.state.withWebWorker}
                    onChange={this.handleChange('withWebWorker')}
                    value="withWorker"
                    color="primary"
                  />
                }
                label="With Web Worker"
              />
            </div>
            <div
              style={{
                width: 450,
                height: 450,
                fontSize: '1rem',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Dropzone
                accept=".csv"
                onDrop={
                  this.state.withWebWorker
                    ? this.onDropWithWorker
                    : this.onDropWithoutWorker
                }
              >
                <p>
                  Try dropping some files here, or click to select files to
                  upload.
                </p>
                <p>
                  {' '}
                  This will be processed{' '}
                  {`${!this.state.withWebWorker ? 'without ' : ''}`}using
                  service workers!{' '}
                </p>
                <p>Only .csv</p>
              </Dropzone>
            </div>
          </header>
        </div>
      </MuiThemeProvider>
    )
  }
}

export default App
