import { Component, OnInit } from '@angular/core';
import { WebFinger } from '../../projects/webfinger/src/public-api';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  webfinger: WebFinger;
  response: string;
  resource = 'paulej@packetizer.com';

  constructor() {
    this.webfinger = new WebFinger({
      webfistFallback: true,  // defaults to false
      tlsOnly: false,          // defaults to true
      uriFallback: false,     // defaults to false
      requestTimeout: 10000,  // defaults to 10000
    });
  }

  ngOnInit() {
    this.checkResource();
  }

  checkResource() {
    this.webfinger.lookup(this.resource, (err, res) => {
      if (err) {
        this.response = err;
      } else {
        this.response = res;
      }
    });
  }

}
