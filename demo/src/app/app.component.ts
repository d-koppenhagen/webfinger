import { Component } from '@angular/core';
import { WebFinger } from 'webfinger-client';

@Component({
  selector: 'wf-demo-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  response: string;

  constructor(){
    const webfinger = new WebFinger({
      webfistFallback: true,  // defaults to false
      tlsOnly: false,          // defaults to true
      uriFallback: false,     // defaults to false
      requestTimeout: 10000,  // defaults to 10000
    });

    let that = this;

    webfinger.lookup('paulej@packetizer.com', function (err, p) {
      if (err) {
        that.response = err;
      } else {
        that.response = p;
      }
    });
  }
}
