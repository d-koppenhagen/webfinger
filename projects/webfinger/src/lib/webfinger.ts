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
  remotestorage: 'remotestorage',
  'http://tools.ietf.org/id/draft-dejong-remotestorage': 'remotestorage',
  'http://www.packetizer.com/rel/share': 'share',
  'http://webfinger.net/rel/profile-page': 'profile',
  me: 'profile',
  vcard: 'vcard',
  blog: 'blog',
  'http://packetizer.com/rel/blog': 'blog',
  'http://schemas.google.com/g/2010#updates-from': 'updates',
  'https://camlistore.org/rel/server': 'camilstore'
};

const LINK_PROPERTIES = {
  avatar: [],
  remotestorage: [],
  blog: [],
  vcard: [],
  updates: [],
  share: [],
  profile: [],
  webfist: [],
  camlistore: []
};

const URIS = ['webfinger', 'host-meta', 'host-meta.json'];

export class WebFinger {
  constructor(public config: IWebFingerConfig) {
    if (!config.tlsOnly) { config.tlsOnly = true; }
    if (!config.webfistFallback) { config.webfistFallback = false; }
    if (!config.uriFallback) { config.uriFallback = false; }
    if (!config.requestTimeout) { config.requestTimeout = 10000; }
  }

  private _err(obj: IWebFingerError) {
    return obj;
  }

  private _isSecure(url: string): boolean {
    if (typeof url !== 'string') {
      return false;
    }
    const parts = url.split('://');
    if (parts[0] === 'https') {
      return true;
    }
    return false;
  }

  private _fetchJRD(url: string, cb: (err, res?) => void) {
    const self = this;
    const xhr = new XMLHttpRequest();

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          if (self._isValidJSON(xhr.responseText)) {
            cb(null, JSON.parse(xhr.responseText));
          } else {
            cb(self._err({
              message: 'invalid json',
              url,
              status: xhr.status
            }));
          }
        } else if (xhr.status === 404) {
          cb(self._err({
            message: 'endpoint unreachable',
            url,
            status: xhr.status
          }));
        } else {
          cb(self._err({
            message: 'error during request',
            url,
            status: xhr.status
          }));
        }
      }
    };

    xhr.open('GET', url, true);
    xhr.timeout = self.config.requestTimeout;
    xhr.setRequestHeader('Accept', 'application/jrd+json, application/json');
    xhr.send();
  }

  private _isValidJSON(str: string) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }

  private _isLocalhost(host: string) {
    return /^localhost(\.localdomain)?(\:[0-9]+)?$/.test(host);
  }

  private _processJRD(JRD: Ijrd, cb: (err, res?) => void) {
    const self = this;

    if (JRD.error) {
      cb(this._err({ message: JRD.error }));
    }

    const links = JRD.links;
    const result = {  // webfinger JRD - object, json, and our own indexing
      object: JRD,
      json: JRD,
      idx: {
        properties: {
          name: null
        },
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
  }

  lookup(address: string, cb: (err, res?) => void) {
    const self = this;
    const parts = address.replace(/ /g, '').split('@');
    let host = parts[1];    // host name for this useraddress
    let uriIndex = 0;      // track which URIS we've tried already
    let protocol = 'https'; // we use https by default

    if (parts.length !== 2) {
      cb(this._err({ message: `invalid user address ${address} (expected format: user@host.com)` }));
      return false;
    } else if (self._isLocalhost(host)) {
      protocol = 'http';
    }

    function _buildURL() {
      return `${protocol}://${host}/.well-known/${URIS[uriIndex]}?resource=acct:${address}`;
    }

    // control flow for failures, what to do in various cases, etc.
    function _fallbackChecks(err: any) {
      if ((self.config.uriFallback) && (host !== 'webfist.org') && (uriIndex !== URIS.length - 1)) { // we have uris left to try
        uriIndex = uriIndex + 1;
        _call();
      } else if ((!self.config.tlsOnly) && (protocol === 'https')) { // try normal http
        uriIndex = 0;
        protocol = 'http';
        _call();
      } else if ((self.config.webfistFallback) && (host !== 'webfist.org')) { // webfist attempt
        uriIndex = 0;
        protocol = 'http';
        host = 'webfist.org';
        // webfist will
        // 1. make a query to the webfist server for the users account
        // 2. from the response, get a link to the actual webfinger json data
        //    (stored somewhere in control of the user)
        // 3. make a request to that url and get the json
        // 4. process it like a normal webfinger response
        self._fetchJRD(_buildURL(), (error: any, data: any) => { // get link to users JRD
          if (error) {
            cb(error);
            return false;
          }
          self._processJRD(data, (errJRD: any, result: any) => {
            if ((typeof result.idx.links.webfist === 'object') &&
                (typeof result.idx.links.webfist[0].href === 'string')) {
              self._fetchJRD(result.idx.links.webfist[0].href, (errJRDFetch: any, JRD: any) => {
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
      self._fetchJRD(_buildURL(), (err: any, JRD: any) => {
        if (err) {
          _fallbackChecks(err);
        } else {
          self._processJRD(JRD, cb);
        }
      });
    }

    setTimeout(_call, 0);
  }

  lookupLink(address: string, rel: string, cb: (err, res?) => void) {
    const that = this;

    if (LINK_PROPERTIES.hasOwnProperty(rel)) {
      that.lookup(address, (err: any, p: any) => {
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
  }

}
