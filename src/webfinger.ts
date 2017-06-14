/*!
 * Webfinger Library
 *
 * Translated to TypeScript by Danny Koppenhagen <mail@d-koppenhagen.de>
 *
 * Originally developed and maintained by:
 *   Nick Jennings <nick@silverbucket.net> 2012 - 2014
 *   Github: http://github.com/silverbucket/webfinger.js
 * webfinger.js is released under the LGPL (see LICENSE).
 *
 * You don't have to do anything special to choose one license or the other and you don't
 * have to notify anyone which license you are using.
 * Please see the corresponding license file for details of these licenses.
 * You are free to use, modify and distribute this software, but all copyright
 * information must remain.
 *
 */

import { IWebFingerConfig } from './interfaces/webfinger-config';
import { IWebFingerError } from './interfaces/webfinger-error';
import { Ijrd, IjrdLink } from './interfaces/jrd';

const LINK_URI_MAPS = {
  'http://webfist.org/spec/rel': 'webfist',
  'http://webfinger.net/rel/avatar': 'avatar',
  'remotestorage': 'remotestorage',
  'remoteStorage': 'remotestorage',
  'http://www.packetizer.com/rel/share': 'share',
  'http://webfinger.net/rel/profile-page': 'profile',
  'me': 'profile',
  'vcard': 'vcard',
  'blog': 'blog',
  'http://packetizer.com/rel/blog': 'blog',
  'http://schemas.google.com/g/2010#updates-from': 'updates',
  'https://camlistore.org/rel/server': 'camilstore'
};

const LINK_PROPERTIES = {
  'avatar': [],
  'remotestorage': [],
  'blog': [],
  'vcard': [],
  'updates': [],
  'share': [],
  'profile': [],
  'webfist': [],
  'camlistore': []
};

const URIS = ['webfinger', 'host-meta', 'host-meta.json'];

export class WebFinger {
  constructor(public config: IWebFingerConfig) {
    this.config.tlsOnly = config.tlsOnly || true;
    this.config.webfistFallback = config.webfistFallback || false;
    this.config.uriFallback = config.uriFallback || false;
    this.config.requestTimeout = config.requestTimeout || 10000;
  }

  private _err(obj: IWebFingerError) {
    return obj;
  }

  private _fetchJRD(url: string, cb: Function) {
    const self = this;
    const xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          if (self._isValidJSON(xhr.responseText)) {
            cb(null, JSON.parse(xhr.responseText));
          } else {
            cb(self._err({
              message: 'invalid json',
              url: url,
              status: xhr.status
            }));
          }
        } else if (xhr.status === 404) {
          cb(self._err({
            message: 'endpoint unreachable',
            url: url,
            status: xhr.status
          }));
        } else {
          cb(self._err({
            message: 'error during request',
            url: url,
            status: xhr.status
          }));
        }
      }
    };

    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'application/jrd+json, application/json');
    xhr.send();
  };

  private _isValidJSON(str: string) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  };

  private _isLocalhost(host: string) {
    return /^localhost(\.localdomain)?(\:[0-9]+)?$/.test(host);
  };

  private _processJRD(JRD: Ijrd, cb: Function) {
    const self = this;

    if (JRD.error) {
      cb(this._err({ message: JRD.error }));
    }

    const links = JRD.links;
    const result = {  // webfinger JRD - object, json, and our own indexing
      object: JRD,
      json: JRD,
      idx: {
        properties: { name: undefined },
        links: JSON.parse(JSON.stringify(LINK_PROPERTIES))
       }
    };

    // process links
    links.map((link, i) => {
      if (LINK_URI_MAPS.hasOwnProperty(link.rel)) {
        if (result.idx.links[LINK_URI_MAPS[link.rel]]) {
          const entry = {};
          Object.keys(link).map((item, n) => {
            entry[item] = link[item];
          });
          result.idx.links[LINK_URI_MAPS[link.rel]].push(entry);
        }
      }
    });

    // process properties
    const props = JRD.properties;
    for (const key in props) {
      if (props.hasOwnProperty(key)) {
        if (key === 'http://packetizer.com/ns/name') {
          result.idx.properties.name = props[key];
        }
      }
    }
    cb(null, result);
  };

  lookup(address: string, cb: Function) {
    const self = this;
    const parts = address.replace(/ /g, '').split('@');
    let host = parts[1];    // host name for this useraddress
    let uri_index = 0;      // track which URIS we've tried already
    let protocol = 'https'; // we use https by default

    if (parts.length !== 2) {
      cb(this._err({ message: `invalid user address ${address} (expected format: user@host.com)` }));
      return false;
    } else if (self._isLocalhost(host)) {
      protocol = 'http';
    }

    function _buildURL() {
      return `${protocol}://${host}/.well-known/${URIS[uri_index]}?resource=acct:${address}`;
    }

    // control flow for failures, what to do in various cases, etc.
    function _fallbackChecks(err) {
      if ((self.config.uriFallback) && (host !== 'webfist.org') && (uri_index !== URIS.length - 1)) { // we have uris left to try
        uri_index = uri_index + 1;
        _call();
      } else if ((!self.config.tlsOnly) && (protocol === 'https')) { // try normal http
        uri_index = 0;
        protocol = 'http';
        _call();
      } else if ((self.config.webfistFallback) && (host !== 'webfist.org')) { // webfist attempt
        uri_index = 0;
        protocol = 'http';
        host = 'webfist.org';
        // webfist will
        // 1. make a query to the webfist server for the users account
        // 2. from the response, get a link to the actual webfinger json data
        //    (stored somewhere in control of the user)
        // 3. make a request to that url and get the json
        // 4. process it like a normal webfinger response
        self._fetchJRD(_buildURL(), function (error, data) { // get link to users JRD
          if (error) {
            cb(error);
            return false;
          }
          self._processJRD(data, function (errJRD, result) {
            if ((typeof result.idx.links.webfist === 'object') &&
                (typeof result.idx.links.webfist[0].href === 'string')) {
              self._fetchJRD(result.idx.links.webfist[0].href, function (errJRDFetch, JRD) {
                if (errJRDFetch) {
                  cb(errJRD);
                } else {
                  self._processJRD(JRD, cb);
                }
              });
            }
          });
        });
      } else {
        cb(err);
        return false;
      }
    }

    function _call() {
      // make request
      self._fetchJRD(_buildURL(), function (err, JRD) {
        if (err) {
          _fallbackChecks(err);
        } else {
          self._processJRD(JRD, cb);
        }
      });
    }

    setTimeout(_call, 0);
  };

  lookupLink(address: string, rel: string, cb: Function) {
    const that = this;

    if (LINK_PROPERTIES.hasOwnProperty(rel)) {
      that.lookup(address, (err, p) => {
        const links  = p.idx.links[rel];
        if (err) {
          cb (err);
        } else if (links.length === 0) {
          cb (`no links found with rel=${rel}`);
        } else {
          cb (null, links[0]);
        }
      });
    } else {
      cb ('unsupported rel ' + rel);
    }
  };

}
