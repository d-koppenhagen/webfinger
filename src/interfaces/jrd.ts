/**
 * This interfaces are following the specification from RFC-7033
 * See: https://tools.ietf.org/html/rfc7033#section-4.4
 * In addition it specifies also the `error`-Object key which will
 * may be sent by some servers when an error occured.
 */

export interface Ijrd {
  properties?: {
    [link: string]: string | null
  };
  links: IjrdLink[];
  subject?: string;
  aliases?: string[];
  error?: any;
}

export interface IjrdLink {
  rel: string;
  type?: string;
  href?: string;
  titles?: [{
    [languageTag: string]: string
  }];
  properties?: {
    [link: string]: string | null
  };
}
