# Blu-ray MPLS Database

Simple JSON REST API front-end for [Cinema Squid](http://www.cinemasquid.com/), written in Node.js.

## Running

```bash
npm install
node app
```

## API

Currently, only one API function is available:

```/api/v1/mpls?query=QUERY&mpls=SIZE1&mpls=SIZE2&mpls=...```.

Where ```query``` is the name of the movie you wish to find, and ```mpls``` is
the track size in bytes of each .mpls file you wish to consider.

**NOTE**: You can pass multiple ```mpls``` params, and the first one that matches will be returned.

### Examples

Start the app (run ```node app``` at the command line) and point your Web browser to
[http://localhost:3000/](http://localhost:3000/) for a list of example API calls and their return values.
