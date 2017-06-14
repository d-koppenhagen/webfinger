import { browser, by, element } from 'protractor';

export class WebfingerDemoAppPage {
  navigateTo() {
    return browser.get('/');
  }

  getParagraphText() {
    return element(by.css('wf-demo-root h1')).getText();
  }
}
