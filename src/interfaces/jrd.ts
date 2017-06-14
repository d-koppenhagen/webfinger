export interface Ijrd {
  properties?: {
    [link: string] : string | null
  },
  links: IjrdLink[],
  subject?: string;
  aliases?: string[];
  error?: any;
}

export interface IjrdLink {
  rel: string;
  type?: string;
  href?: string;
  titles?: [{
    [languageTag: string] : string
  }];
  properties?: {
    [link: string] : string | null
  };
}
