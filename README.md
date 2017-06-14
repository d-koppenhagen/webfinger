# webfinger-client

A webfinger client that runs both in the browser and in node.js.
The Client is based on Nick Jennings library [webfinger.js](https://github.com/silverbucket/webfinger.js) but has been rewritten in TypeScript.

## IMPORTANT NOTE
This client library may doesn't work in the current version and is still in development

## Features

* defaults to TLS only
* optional URI fallback (for older services which use `host-meta` or `host-meta.json` URI endpoints)
* optional support for [WebFist](http://webfist.org)

## Demo
clone this repository, navigate into the `demo`-folder, run `npm install` and finally `npm start`

## Install
Install the client as a dependency:

```bash
npm install --save webfinger-client
```

## Usage
### Import
You have to import the module before using it:

```typescript
import { WebFinger } from 'webfinger';
```

### Use
```typescript
  let webfinger = new WebFinger({
    webfistFallback: true,  // defaults to false
    tlsOnly: true,          // defaults to true
    uriFallback: false,     // defaults to false
    requestTimeout: 10000,  // defaults to 10000
  });

  webfinger.lookup('alice@example.org', function (err, p) {
    if (err) {
      console.log('error: ', err.message);
    } else {
      console.log(p);
    }
  });


// example output:
// {
//   idx: {
//     properties: {
//       name: "Alice Henderson"
//     },
//     links: {
//       avatar: [{ href: '<url>' }],
//       blog: [{ href: '<url>' }],
//       vcard: [href: '<url' }]
//       ... etc.
//     },
//   }
//   json: { ... raw json output ... }
//   object: { ... unformatted but parsed into native javascript object ... }
// }

  webfinger.lookupLink('alice@example.org', 'remotestorage' function (err, p) {
    if (err) {
      console.log('error: ', err.message);
    } else {
      console.log(p);
    }
  });

// example output (if at least one link with rel="remotestorage" exists):
// {
//   href: 'https://storage.5apps.com/alice',
//   rel : 'remotestorage',
//   properties: {
//     'http://remotestorage.io/spec/version': 'draft-dejong-remotestorage-02',
//     'http://tools.ietf.org/html/rfc6749#section-4.2': 'https://5apps.com/rs/oauth/alice',
//     'http://tools.ietf.org/html/rfc6750#section-2.3': false,
//     'http://tools.ietf.org/html/rfc2616#section-14.16': false
//   }
// }
```

## Development
The library is built with Webpack. Notes for building and serving can be fount in 
[DEVELOPMENT](DEVELOPMENT).
