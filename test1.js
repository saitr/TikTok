/**
 * getImgSrc.js
 *
 * 
 *
 * Copyright (c) 2021 PureSigth LTD. All rights reserved.
 *
 * Author:  Royi Cohen
 * Date:    2021-09-016 09:50
 * Version: 1.0
 * 
 */
const VERSION = "1.0";


const puppeteer = require('puppeteer-firefox');
var fs = require('fs');
const { debug } = require('console');

/***************  CONST       ******************/
const PS_W_SELECTOR_IDLE         = 'div[data-ref] span [data-testid="refresh-large"] svg';
const PS_W_SELECTOR_CANVAS_QR    = '#app .landing-window .landing-main canvas[aria-label]';
const PS_W_SELECTOR_CONTACT_LIST = '#app header[data-testid="chatlist-header"]';



/***************  GLOBAL PARAMETERS ******************/
var g_selectors = [PS_W_SELECTOR_IDLE, PS_W_SELECTOR_CANVAS_QR, PS_W_SELECTOR_CONTACT_LIST];

var g_browser_path = '/usr/bin/google-chrome';
var g_headless     = false;

/*****************************************************/
const DEFAULT_PS_CFG=
{
    url:                  'https://www.tiktok.com/',
    sessionId:            1,
    productId:            1,
    shUser:               1,
    maxUpdateBarcodeTime: 30,
    baseSessionPath:      '/www/social_session/',
    shRunUsersPath:       '/www/social_session/shRunUsers/',
    sessionPath:          '',
    shUserFile:           ''
};

/*****************************************************/
class GetImgSrc {
  constructor() {
    this.psCfg                = DEFAULT_PS_CFG;
    this.updateBarcodeCounter = 1;
    this.barcodeSrc           = '';
    this.shUser               = '';
  }
  
}

/*  DEFAULT_PS_CFG['url'] + '@' + ownerId
 * initParams
 */
async function initParams(obj,myArgs) {
  obj.psCfg.productId       = myArgs[0];
  obj.psCfg.sessionId       = myArgs[1];
  obj.psCfg.shUser          = myArgs[2];
  obj.psCfg.ownerId         = myArgs[3];
  obj.psCfg.hashTag         = myArgs[4];
  obj.psCfg.url             = obj.psCfg.url + '@' + myArgs[3] 
  obj.psCfg.baseSessionPath = obj.psCfg.baseSessionPath + obj.psCfg.productId + "/";
  obj.psCfg.sessionPath     = obj.psCfg.baseSessionPath + "activeSessions/"+ obj.psCfg.sessionId + "/";
  
  obj.psCfg.shUserFile      = obj.psCfg.shRunUsersPath + obj.psCfg.shUser;
  let now = new Date();
  console.log( "==========================================================" );
  console.log( `=== CODE VERSION: ${VERSION}` );
  console.log( `=== PAGE LOADED:  ${now}` );
  console.log( `=== ${obj.psCfg.url}` );
	console.log( "==========================================================" );
	console.log( "Using the following parameters:" );
  for( let parm in obj.psCfg )
  {
    console.log( `> ${parm.padEnd( 20, ' ' )}= '${obj.psCfg[ parm ]}'` );
  }
  console.log( "==========================================================" );

  await fs.writeFile(obj.psCfg.shUserFile, "1", function (err) {
    if (err) throw err;
    debugMsg('Saved shUserFile!');
  });

}
/*
 * debugMsg
 */
async function debugMsg( msg ) {
  var now = new Date();
  await console.log(now.toUTCString(),': ',msg);
}
/*
 * identifyVisibleContent
 */
function identifyVisibleContent(selectors) {
  
  return selectors.findIndex(
    function (selector) {
      if (document.querySelector(selector) != null) {
        console.log("Found selector = ", selector);
        return true;
      }
      return false;
    }
  );
}
/*
 * getObjectBySelector
 */
async function getObjectBySelector(page,selectorPath,action)
{
  selectorPath = await selectorPath.replace(new RegExp('>', 'g'), '');
  var itemFound = await page.evaluate(function (selector) {
    var item = document.querySelector(selector);
    if (item) {
      if (action == 1) {
        item.click();
      }
      return item;
    }
    console.log('did not find selector =' + selector);
    return null;
	},selectorPath);
  debugMsg('return item = '  + itemFound);
  return itemFound;
}
/*
 * evaluateSelector
 */
async function evaluateSelector(page, selectorPath, getItemSrc)
{
  //console.log('evaluateSelector-----' + selectorPath);
  // BOAZ DONT NEED selectorPath = selectorPath.replace(new RegExp('>', 'g'), '');
  var itemFound = await page.evaluate(function (selector, getItemSrc) {
    var item = document.querySelector(selector);
    if (item) {
      if (getItemSrc == 1) // image src
      {
        return item.src;
      }
      else if (getItemSrc == 2) // Canvas
      {
        return item.toDataURL("image/png");
      }
      return true;
    }
    return false;
  }, selectorPath, getItemSrc);

  return itemFound;
}

/*
 * setKeepSesssionAlive
*/
async function setKeepSesssionAlive(page)
{
    
    var rc = await page.evaluate( function () 
        {
          let elementsKeep = document.getElementsByName("rememberMe");
          if (elementsKeep.length > 0) {
            console.log('Found setKeepSesssionAlive ... still alive=',elementsKeep[0].checked);
            return elementsKeep[0].checked;
          }
          return false;
        });
    
    if (rc == false) {
        debugMsg('****** Need to click ******');
        page.evaluate( function () 
        {
          let val = false;
          let elementsKeep = document.getElementsByName("rememberMe");
          if (elementsKeep.length > 0) {
            elementsKeep[0].click();
          }
          return val;
        });
    } else {
          debugMsg('****** NO Need to click ******');
    };
    
}
/*
 * moveBashUserFile
 */
async function moveBashUserFile(obj)
{
  fs.rename(obj.psCfg.shUserFile, obj.psCfg.shUserFile+"_bk", function(err) {
    if ( err ) debugMsg('ERROR: ' + err);
  });
  debugMsg("moveBashUserFile " + obj.psCfg.shUserFile);
}
/*
 * saveBarcode
 */
async function saveBarcode(imgSrc,obj,browser) {
  if (imgSrc != obj.barcodeSrc) {
    debugMsg('***************************');
    debugMsg(obj.updateBarcodeCounter);
    debugMsg('***************************');

    let path = obj.psCfg.sessionPath + 'barcode.png';
    debugMsg('path = ' + path);
    await fs.writeFile(path, imgSrc, function (err) {
      if (err) throw err;
      debugMsg('Saved barcode!');
    });
    
    debugMsg('***********  after write img src ****************');
    path = obj.psCfg.sessionPath + 'data.txt'
    await fs.writeFile(path, obj.updateBarcodeCounter.toString(), function (err) {
      if (err) throw err;
      debugMsg('Saved barcode number!');
    });
    
    obj.barcodeSrc = imgSrc;
    obj.updateBarcodeCounter += 1;
  }
  else {
    debugMsg('**************** same img no updates ****************');
  }

  if (obj.updateBarcodeCounter > obj.psCfg.maxUpdateBarcodeTime) {
    await moveBashUserFile(obj);
    debugMsg('--------------- End loop !! ---------------');
    await browser.close();
  }
}

/*
 * setStatusOk
 */
async function setStatusOk(obj,page) {
    let dataPath = obj.psCfg.sessionPath + 'data.txt';
    await fs.writeFile(dataPath, "OK", function (err) {
      if (err) throw err;
      debugMsg('Saved shUserFile');
    });
    
    //write login user id
    dataPath = obj.psCfg.sessionPath + 'userId.txt'
    let tmp = 'whatsapp_session_'+obj.sessionId;
    
    await fs.writeFile(dataPath, tmp, function (err) {
      if (err) throw err;
      debugMsg('write login user id');
    });
    
    debugMsg('setStatusOk 1 ***************************');
    await page.waitForTimeout(2000);
    console.log('setStatusOk 2 ***************************');

    await page.waitForTimeout(5000);
    await moveBashUserFile(obj);
    
    debugMsg('setStatusOk 3 ***************************');
    
}


(async () => {
  const obj     = await new GetImgSrc();
  await initParams(obj,process.argv.slice(2)); 
  
  const browser = await puppeteer.launch({ /*executablePath: g_browser_path,*/ 
                                           headless : g_headless,
                                           args:['--user-data-dir='+obj.psCfg.sessionPath,
                                                 ] });
  const page    = await browser.newPage();
  await page.goto(obj.psCfg.url, {timeout: 6000000})
  //await page.waitForSelector('/div/div[2]/button[2]');
  //await page.click('/div/div[2]/button[2]');
  //await page.click('/div/div[2]/button[2]');
  await page.click('#header-login-button')
  
  const login_btn = await page.$x('//*[@id="header-login-button"]')
  if (login_btn.length > 0){
  	await login_btn[0].click()
  }
  
  setTimeout( async()=>{
       
         
  	await page.click('.tiktok-18x2367-DivCloseWrapper.e1gjoq3k6')
  	//const element_cookie = page.$x('/html/body/div[2]/div[2]/div/div[2]/div')
  	//await element_cookie.click()
  	/*const cookie_btn = page.$x('/html/body/div[2]/div[2]/div/div[2]/div')
  	if( cookie_btn.length > 0){
  		await cookie_btn[0].click()
  	}*/
  	await page.click('.tiktok-dpfgiv-AButtonLink.eyt76ed11')
  	
  },4000)
  
 /* const login_btn = await page.$x('//*[@id="header-login-button"]')
  if (login_btn.length > 0){
  	await login_btn[0].click
  }
  
  setTimeout( async()=>{
    await page.click('.tiktok-18x2367-DivCloseWrapper.e1gjoq3k6')
    const element_cookie = page.$x('/html/body/div[2]/div[2]/div/div[2]/div/a')
    await element_cookie[0].click()
  	
  },4000)*/
  
  
  
  
  //html/body/div[7]/div[3]/div/div/div[2]
  //tiktok-18x2367-DivCloseWrapper e1gjoq3k6
  //html/body/div[7]/div[3]/div/div/div[2]    -------------------> Close Button
  
  //tiktok-d4rgce-DivRightContainer.eyt76ed3  -------------------> Cookies Button
  //tiktok-dpfgiv-AButtonLink.eyt76ed11
  
  
/*  const clickButton = () => {
  page.click('#header-login-button');
}*/

// Click the button after 10 seconds
// setTimeout(clickButton, 5000);

// Repeat the process 2 times with a 10-second interval
/*let count = 0;
const intervalId = setInterval(() => {
  if (count < 2) {
    clickButton();
    count++;
  } else {
    clearInterval(intervalId);
  }
}, 10000);
  
  
  page.on('console', consoleObj => debugMsg(consoleObj.text()));
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36'
  )

const identifyVisibleContent = (selectors) => {
  for (let i = 0; i < selectors.length; i++) {
    const element = document.querySelector(selectors[i]);
    if (element && element.offsetParent !== null) {
      return i;
    }
  }
  return -1;
};  
  

  await page.goto(obj.psCfg.url);
  
  let index;
  


/*async function getVideoTags() {
  const element = await page.waitForXPath('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div', { timeout: 600000 });
  const videoTags = await page.evaluate(() => {
    const tags = {};
    const videos = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div//a', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (let i = 0; i < videos.snapshotLength; i++) {
      const url = videos.snapshotItem(i).getAttribute('href');
      const tag = videos.snapshotItem(i).getAttribute('title');
      if (tag !== null) {
        tags[url] = tag;
      }
    }
    return tags;
  });
  return videoTags;
}*/

async function getVideoTags() {
  f
 
  
  const videoTags = await page.evaluate(() => {
    console.log("IIIIIIIIIIIIIIIIIIIIIIIIIIIIII")
    const tags = [];
    const videos = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div/div[1]/div/div/a', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (let i = 0; i < videos.snapshotLength; i++) {
    const url_new = videos.snapshotItem(i).getAttribute('href');
 
      tags.push(videos.snapshotItem(i).getAttribute('href'));
    }
    return tags;
  });
  return videoTags;
}
       

//document.querySelectorAll("#main-content-others_homepage/diV/div/div/div/div:nth-child/div/div/div/a/div/div/div/div")
/*async function getHashTags() {
  const element = await page.waitForXPath('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div', { timeout: 600000 });
  let previousHeight;
  while (true) {
    previousHeight = await page.evaluate('document.body.scrollHeight');
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await new Promise(resolve => setTimeout(resolve, 60000));
    const newHeight = await page.evaluate('document.body.scrollHeight');
    if (newHeight === previousHeight) {
      break;
    }
  }
  
const videoTags = await page.evaluate(() => {
  const tags = [];
  
  //const div_check = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div/div[2]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
 // user-post-item-desc
  //*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div[25]
  const videos = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null); 

  //*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div[25]/div[1]/div/div/a --------------> VIDEO URLS
  //*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div/div[2]
  
  
  
  //*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div ------------------------> create for loop1 
  //*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div[1] -----------------> create for loop2 
  // inside for loop2 check if //*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div[1]/div[2] is present or not 
  //*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div[22]/div[2]
  // if present loop this //*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div[1]/div[2]/a and get title attribute
  //else get string 'this is harmful content'
  
 
/*  for (let i = 0; i < videos.snapshotLength; i++) {
   
   const div_checking = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div/div[2]',document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
   for (let i = 0; i< div_checking.snapshotLength;i++){
   console.log('*****************this is div_check*******************************');
    if( div_checking){
    const title_check = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div//a', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for(let i=0;i<title_check.snapshotLength;i++){ 
      tags.push(title_check.snapshotItem(i).getAttribute('title'));
    };
    
  }
  else{
      tags.push('######################Harmful Content Stay Away#########################')
    }
  return tags;
  
}}});*/


/*const videoTags = await page.evaluate(() => {
  const tags = [];

  const videos = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null); 

  for (let i = 0; i < videos.snapshotLength; i++) {
    const div_checking = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div/div[2]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    
    for (let j = 0; j < div_checking.snapshotLength; j++) {
      console.log('*****************this is div_check*******************************');
      
      if (div_checking) {
        const title_check = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div//a', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        
        for (let k = 0; k < title_check.snapshotLength; k++) {
          tags.push(title_check.snapshotItem(k).getAttribute('title'));
        }
      } else {
        tags.push('######################Harmful Content Stay Away#########################');
      }
    }
  }
  
  return tags;
}});


  return videoTags;
  
}*/


  /*const videoTags = await page.evaluate(() => {
  const tags = [];
  const videos = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  for (let i = 0; i < videos.snapshotLength; i++) {
    const videoDiv = videos.snapshotItem(i);
    const div2 = videoDiv.querySelector('div:nth-child(2)');

    
    if (div2) {
    const titleElement = div2.querySelector('a');
    if (titleElement) {
    const title = titleElement.getAttriute('href');
    
    tags.push(title); 
  } else {
    console.log('No div found');
  }
} else {
  tags.push('************Harmful Content**************');
}

  }
  return tags;
});*/

//document.querySelector("#main-content-others_homepage > div > div.tiktok-833rgq-DivShareLayoutMain.ee7zj8d4 > div.tiktok-1qb12g8-DivThreeColumnContainer.eegew6e2 > div > div:nth-child(24) > div.tiktok-5lnynx-DivTagCardDesc.eih2qak1")

//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div[24]/div[2]
 
/*async function getHashTags() {
  const element = await page.waitForXPath('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div', { timeout: 600000 });
  const videoTags = await page.evaluate(() => {
    const tags = [];
    const videos = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null); 
    for (let i = 0; i < videos.snapshotLength; i++) { 
      const text = videos.snapshotItem(i).textContent;
      tags.push(text.trim()+"\n");
    }
    return tags;
  });
  return videoTags;
} */

/*async function getHashTags() {
  const element = await page.waitForXPath('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div', { timeout: 600000 });
  const descriptions = await page.evaluate(() => {
    const descriptions = [];
    const outerElements = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (let i = 0; i < outerElements.snapshotLength; i++) {
      const innerElements = outerElements.snapshotItem(i).XPath('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div[2]');
      for (let j = 0; j < innerElements.length; j++) {
        const text = innerElements[j].textContent.trim();
        if (text) {
          descriptions.push(text);
        }
      }
    }
    return descriptions;
  });
  return descriptions;
}*/

/*async function getHashTags() {
  const element = await page.waitForXPath('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div', { timeout: 600000 });
  const descriptions = await page.evaluate(() => {
    const descriptions = [];
    const outerElements = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (let i = 0; i < outerElements.snapshotLength; i++) {
      const innerElements = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div[' + (i + 1) + ']/div[2]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      for (let j = 0; j < innerElements.snapshotLength; j++) {
        const text = innerElements.snapshotItem(j).textContent.trim();
        if (text) {
          descriptions.push(text);
        }
      }
    }
    return descriptions;
  });
  return descriptions;
}*/



/*async function getHashTags() {
  const element = await page.waitForXPath('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div', { timeout: 600000 });
  let previousHeight;
  while (true) {
    previousHeight = await page.evaluate('document.body.scrollHeight');
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await new Promise(resolve => setTimeout(resolve, 60000));
    const newHeight = await page.evaluate('document.body.scrollHeight');
    if (newHeight === previousHeight) {
      break;
    }
  }
  
  /*const videoTags = await page.evaluate(() => {
    const tags = [];
  
    const videos = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null); 

    for (let i = 0; i < videos.snapshotLength; i++) {
      const div_checking = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div/div[2]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    
      for (let j = 0; j < div_checking.snapshotLength; j++) {
        console.log('*****************this is div_check*******************************');
      
        if (div_checking.snapshotItem(j)) {
          const title_check = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div//a', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        
          for (let k = 0; k < title_check.snapshotLength; k++) {
            tags.push(title_check.snapshotItem(k).getAttribute('title'));
          }
        } else {
          tags.push('######################Harmful Content Stay Away#########################');
        }
      }
    }
  
    return tags;
  });*/
  
  
  

  //return videoTags;
//}*/



/*function getHashTags() {
  return page
    .$x('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div/div[2]/a')
    .then((tagCardTitleElements) => {
      if (tagCardTitleElements.length === 0) {
        return ['Harmful content'];
      } else {
        return tagCardTitleElements[0].getAttribute('title').then((title) => {
          const results = [title];
          return page
            .$x('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div/div[1]/div')
            .then((tagCardDivElements) => {
              if (tagCardDivElements.length === 0) {
                results.push('Harmful content');
              } else {
                for (let i = 0; i < tagCardDivElements.length; i++) {
                  const tagCardDescElement = tagCardDivElements[i].querySelector('div.tiktok-5lnynx-DivTagCardDesc');
                  if (tagCardDescElement) {
                    results.push(tagCardDescElement.textContent.trim());
                  } else {
                    results.push('Harmful content');
                  }
                }
              }
              return results;
            });
        });
      }
    });
}*/

/*async function getHashTags() {
  const results = [];
  const page = await browser.newPage();
  try {
    await page.goto(obj.psCfg.url, { waitUntil: 'domcontentloaded' });
    const parentDiv = await page.$x('//*[@id="main-content-others_homepage"]/div/div[2]');

    if (parentDiv.length > 0) {
      const childDiv = await parentDiv[0].$('div:nth-child(2) > div');

      if (childDiv) {
        const tagCard = await childDiv.$('div > div > div:nth-child(1)');

        if (tagCard) {
          const titleElement = await tagCard.$('div:nth-child(2) > a');

          if (titleElement) {
            const title = await titleElement.evaluate(element => element.getAttribute('title'));
            results.push(title);
          } else {
            results.push('Harmful content');
          }

          const hashTags = await tagCard.$$('div:nth-child(n+3)');

          for (const hashTag of hashTags) {
            const text = await hashTag.evaluate(element => element.textContent.trim());
            results.push(text);
          }
        }
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    await page.close();
  }

  return results;
}*/
//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div//div/div/div/a/div/div[2]


//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div/div/div/div/a/div/div[2]/div/div[2]


//tiktok-1x4dinl-DivWarnInfoContent e7o5pyu4




/*async function getHashTags() {
  const element = await page.waitForXPath('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div', { timeout: 600000 });
  let previousHeight;
  while (true) {
    previousHeight = await page.evaluate('document.body.scrollHeight');
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await new Promise(resolve => setTimeout(resolve, 60000));
    const newHeight = await page.evaluate('document.body.scrollHeight');
    if (newHeight === previousHeight) {
      break;
    }
  }
  
  const videoTags = await page.evaluate(() => {
    const tags = [];
  
    /*const videos = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null); 

    for (let i = 0; i < videos.snapshotLength; i++) {
      const div_checking = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div/div[2]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    
      for (let j = 0; j < div_checking.snapshotLength; j++) {
        console.log('*****************this is div_check*******************************');
      
        if (div_checking.snapshotItem(j)) {
          const title_check = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div//a', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        
          for (let k = 0; k < title_check.snapshotLength; k++) {
            tags.push(title_check.snapshotItem(k).getAttribute('title'));
          }
        } else {
          tags.push('######################Harmful Content Stay Away#########################');
        }
      }
    }*/
    
    //const hastg = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
    /*for (let i = 0 ; i< hastg.snapshotLength;i++){
    const div_check =  document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
    const warn_content = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div/div/div/div/a/div/div[2]/div/div[2]',document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
    for ( let k = 0 ; k<div_check.snapshotLenght;k++){
    if( warn_content === true){
      tags.push("###################### Harmful content ##########################")
    
    }
    else {
    	const hastag_content = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div//a', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
    	 for(let j = 0 ; j<hastag_content.snapshotLength; j++){
    	   tags.push(hastag_content.snapshotItem(j).getAttribute('title'));
    	   
    	   }
    	}
    
    }
    	
    	
    }*/
    
   /* const hastg = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
    for (let i = 0 ; i< hastg.snapshotLength;i++){
    //const div_check =  document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
   // const warn_content = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div/div/div/div/a/div/div[2]/div/div[2]',document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
    for ( let k = 0 ; k<div_check.snapshotLenght;k++){
    if( warn_content === true){
      tags.push("###################### Harmful content ##########################")
    
    }
    else {
    	const hastag_content = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div//a', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
    	 for(let j = 0 ; j<hastag_content.snapshotLength; j++){
    	   tags.push(hastag_content.snapshotItem(j).getAttribute('title'));
    	   
    	   }
    	}
    
    }
    	
    	
    }
  
    return tags;
  });
  
  
  

  return videoTags;
}*/


/*async function getHashTags() {
  const element = await page.waitForXPath('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div', { timeout: 600000 });
  let previousHeight;
  while (true) {
    previousHeight = await page.evaluate('document.body.scrollHeight');
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await new Promise(resolve => setTimeout(resolve, 60000));
    const newHeight = await page.evaluate('document.body.scrollHeight');
    if (newHeight === previousHeight) {
      break;
    }
  }
  
  const videoTags = await page.evaluate(async () => {  
    const tags = [];
    const videos = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null); 
    for (let i = 0; i < videos.snapshotLength; i++) {
    
      const hashtagContent = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div//a', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      for (let j = 0; j < hashtagContent.snapshotLength; j++) {
        tags.push(hashtagContent.snapshotItem(j).getAttribute('title'));
      }
    const div_check = document.querySelectorAll('div.tiktok-1x4dinl-DivWarnInfoContent.e7o5pyu4');
    if (div_check ) {
      tags.push("**** harmful content ****");
    } else {
      
    }

    return tags;
  }});

  return videoTags;
}
*/





async function getHashTags() {
  const element = await page.waitForXPath('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div', { timeout: 600000 });
  let previousHeight;
  while (true) {
    previousHeight = await page.evaluate('document.body.scrollHeight');
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await new Promise(resolve => setTimeout(resolve, 60000));
    const newHeight = await page.evaluate('document.body.scrollHeight');
    if (newHeight === previousHeight) {
      break;
    }
  }
  //*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div
  //*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div
  const videoTags = await page.evaluate(async () => {  
const individual_divs = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

const tags = [];

for (let j= 0; j < individual_divs.snapshotLength; j++) {
  const individual_div = individual_divs.snapshotItem(j);
  const first_div = individual_div.querySelector('.tiktok-x6f6za-DivContainer-StyledDivContainerV2');
  const second_div = individual_div.querySelector('.tiktok-5lnynx-DivTagCardDesc');
  
  if (individual_div.contains(first_div) && individual_div.contains(second_div)) {
    const title_attr = document.evaluate('div[2]/a', individual_div, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    if (title_attr.snapshotLength) {
      const title_element = title_attr.snapshotItem(0);
      const title = title_element.getAttribute('title');
      tags.push(title);
    } else {
      tags.push('***********harmful content***********');
    }
  } else {
    tags.push('!!!!Harmful content!!!!');
  }
}

console.log('these are tags', tags);

return tags;

  });     
 return videoTags;

}

//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div[23]
//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div/div[2]

/*async function getHashTags() {
  const element = await page.waitForXPath('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div', { timeout: 600000 });
  let previousHeight;
  while (true) {
    previousHeight = await page.evaluate('document.body.scrollHeight');
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await new Promise(resolve => setTimeout(resolve, 60000));
    const newHeight = await page.evaluate('document.body.scrollHeight');
    if (newHeight === previousHeight) {
      break;
    }
  }
  
  const videoTags = await page.evaluate(async () => {
    const tags = [];
    
    const divCheck = async () => {
      const div = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div/div[2]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      if (div.snapshotLength > 0 && div.snapshotItem(0)) {
        return true;
      }
      return false;
    };

    const isHarmful = await divCheck();
    if (isHarmful) {
      tags.push("**** harmful content ****");
    } else {
      const hashtagContent = document.evaluate('//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div//a', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      for (let i = 0; i < hashtagContent.snapshotLength; i++) {
        tags.push(hashtagContent.snapshotItem(i).getAttribute('title'));
      }
    }

    return tags;
  });

  return videoTags;
}*/


/*async function textCheck() {
  const div_check = await page.evaluate(() => {
    return document.body.querySelectorAll('div.tiktok-1x4dinl-DivWarnInfoContent.e7o5pyu4').length > 0;
  });
  if (div_check) {
    console.log('******harmful content stay away***********************');
  } else {
    console.log('*********not found harmful text******************');
  }
}


const text_check1 = await textCheck();
console.log('******************this is the harmful content***********************', text_check1);

const hashtag = await getHashTags()
console.log('********************************these are the hastags with harmful******************************',hashtag)*/


//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div[25]
//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div[24]/div[1]/div/div/a


console.log('******************** this is the description ********************',await getHashTags())

  async function getUniqueHashTags() {
  const videoTags = await getHashTags();
  console.log("=======>",videoTags)
  const filteredTags = videoTags.filter(tag => tag !== null );
  console.log('***************filtered tags*****************************',filteredTags)
  //const uniqueTags = [...new Set(filteredTags)];
  return filteredTags;
}
//console.log('***************these are unique tags*****************************',await getHashTags()));
//console.log('**************** these are unique*********************************',await getUniqueHashTags() ));



  
const tags = await getVideoTags();


//const full_data = await getFullTags();
const hash = await getUniqueHashTags(); 
console.log('***********************************************this is the hastag count**********************************',hash.length);
// console.log('Video Tags:', tags);



new_vedio = tags.filter((value)=> value.includes(obj.psCfg.url+"/video")) ///html/body/div[2]/div[2]/div[2]/div/div[2]/div[2]/div/div[10]/div[2]/a/div
console.log('********************************************to check the filter of url************************************',new_vedio)  
result = {}

if (Array.isArray(new_vedio)) {
  new_vedio.forEach((key, i) => {
    result[key] = hash[i]
    
  })
}

hash_arg = obj.psCfg.hashTag
console.log('this is hastag',hash_arg)
//const hasKey = hash_arg in result;

const result_list = []

for (const key in result)
{
	if (key.includes(hash_arg))
	  {
	     console.log("result dict have this key")
	     //console.log(`"${searchKey}" found in key "${key}"`);
	     console.log("this is the key", key)
	     console.log("This is the url",result[key])
	     result_list.push(result[key])
	  }
	
 }


console.log("*****************result",result)

console.log('**************************************************this is the urls of the video*******************************************',tags.filter((value)=> value.includes(obj.psCfg.url+"/video")));
const filteredTags = tags.filter((value) => value.includes(obj.psCfg.url+"/video"));
console.log('*****************************************Count of video urls:***************************', filteredTags.length);
console.log('**************************************************this is the hash*******************************************', hash);






  async function runLoop(obj,browser) { 
    debugMsg("Identify status...");
    try {
      index = await page.evaluate(identifyVisibleContent,g_selectors);
      switch(index) {
        case 0:
          debugMsg("++++++ IDLE QR FOUND ++++++");
          var idleQrObj =  page.click(PS_W_SELECTOR_IDLE);
          debugMsg("------ Click reload  ------",idleQrObj);
          
          break;
        case 1: 
          debugMsg("++++++ QR FOUND ++++++",PS_W_SELECTOR_CANVAS_QR);
          await setKeepSesssionAlive(page);
          var qr =  await evaluateSelector(page,PS_W_SELECTOR_CANVAS_QR,2);
          debugMsg("------ saveBarcode  ------");
          await saveBarcode(qr,obj,browser);
          break;
        case 2:
          debugMsg("++++++ CONTACT LIST FOUND ++++++");
          await setStatusOk(obj,page);
          
          return 1;
      }

    } catch (e) {
      console.log(e);
      return -1;
    }
    //await page.waitForTimeout(1000);
     await new Promise(resolve => setTimeout(resolve, 1000))
    await runLoop(obj,browser);
     
  }
  await runLoop(obj);
  
  await browser.close();
})();




///html/body/div[2]/div[2]/div[2]/div/div[2]/div[2]/div/div[27]/div[2]


//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div[3]/div[2]/a
//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div[37]/div[2]/a
//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div[1]/div[2]/a
//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div[29]/div[2]


//if in this path : //*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div

//this div //*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div//div[2] is present then only we have get title  other wise that title ''


//*[@id="main-content-others_homepage"]/div/div[2]/div[2]/div/div/div[2]





