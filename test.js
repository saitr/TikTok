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
  obj.psCfg.url             = obj.psCfg.url + '@' + myArgs[3] + '/video/' + myArgs[4]
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
 
 
 async function scrape(browser, url) {
  const page = await browser.newPage();
  await page.goto(url);

  // get all the video urls from the profile page
  const videoUrls = await page.$$eval('a[href^="/p/"]', links =>
    links.map(link => link.href)
  );

  // loop through each video url and get the video tags
  for (const videoUrl of videoUrls) {
    await page.goto(videoUrl);

    const tags = await page.$$eval('.xil3i', elements =>
      elements.map(element => element.textContent)
    );
    console.log(tags);
  }

  await browser.close();
}




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
  
  console.log("#####################################",obj.psCfg.sessionPath)
  page.on('console', consoleObj => debugMsg(consoleObj.text()));
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36'
  )


  
  

  await page.goto(obj.psCfg.url);
  
  let index;

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

