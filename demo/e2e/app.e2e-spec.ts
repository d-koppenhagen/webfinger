import { WebfingerDemoAppPage } from './app.po';

describe('webfinger-demo-app App', () => {
  let page: WebfingerDemoAppPage;

  beforeEach(() => {
    page = new WebfingerDemoAppPage();
  });

  it('should display welcome message', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('Welcome to wf-demo!!');
  });
});
