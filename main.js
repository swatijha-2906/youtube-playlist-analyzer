const puppeteer = require("puppeteer");
const pdfkit = require("pdfkit");
const fs= require("fs");
const playlistUrl= "https://youtube.com/playlist?list=PLzkuLC6Yvumv_Rd5apfPRWEcjf9b1JRnq";

let page;
(async function youtubeAnalyzer(){
    try{
        let openBrowser= await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ["--start-maximized"]
        });
        page= await openBrowser.newPage(); 
        await page.goto(playlistUrl);

        await page.waitForSelector("h1#title a");
        let name= await page.evaluate(function(selector){
            return document.querySelector(selector).innerText;
        }, "h1#title");
        console.log("Name of playlist is " + name);

        await page.waitForSelector("div#stats .ytd-playlist-sidebar-primary-info-renderer");
        let playlistData= await page.evaluate(getData , "div#stats .ytd-playlist-sidebar-primary-info-renderer")
        //console.log(playlistData);
        let totalVideos= playlistData.videos.split(" ")[0];
        let totalViews= playlistData.views.split(" ")[0];
        console.log("Total no. of videos are " + totalVideos);
        console.log("Total no. of views are " + totalViews);

        let currentVideos= await findCurrentVideos();
        console.log("Current no. of videos are " + currentVideos);

        while(totalVideos- currentVideos > 50 ){
            await scrollToBottom();
            currentVideos= await findCurrentVideos();
        }
        console.log("Now the current no. of videos are " + currentVideos);
        await page.waitForSelector("div#contents a#video-title");
        await page.waitForSelector("div#contents span#text.style-scope.ytd-thumbnail-overlay-time-status-renderer");

        let videoDetails= await page.evaluate(getVideoDetails, "div#contents a#video-title", "div#contents span#text.style-scope.ytd-thumbnail-overlay-time-status-renderer");
        
        console.log("Size of videoDetails list " + videoDetails.length);
        console.log(videoDetails);

        let pdfDoc = new pdfkit;
        pdfDoc.pipe(fs.createWriteStream('playlist.pdf'));
        pdfDoc.list(videoDetails);
        pdfDoc.moveDown(0.5);
        pdfDoc.end();




    }
    catch(err){
        console.log(err);
    }
})();

function getData(selector)
{
        let dataArr= document.querySelectorAll(selector);
        //console.log(dataArr)  -> not executed in evaluate()
        //return dataArr;     -> not allowed here
        let videos= dataArr[0].innerText;
        let views= dataArr[1].innerText;
        return {
            videos,
            views
        }
}

async function findCurrentVideos(){
    try{
        page.waitForSelector("div#contents img#img.style-scope.yt-img-shadow");
        let currentVideos= await page.evaluate(function(selector){
            let allVideos= document.querySelectorAll(selector);
            return allVideos.length;
        }, "div#contents img#img.style-scope.yt-img-shadow");

        return currentVideos;
    }
    catch(err){
        console.error(err);
    }
    
}

async function scrollToBottom(){
    await page.evaluate(function(){
        window.scrollBy(0, window.innerHeight);
    })
}

function getVideoDetails(videoSelector, durationSelector){

    //get title and duration of each video
    let videoTitleArr= document.querySelectorAll(videoSelector);
    let durationArr= document.querySelectorAll(durationSelector);

    let videoDetailsList= [];

    for(let i=0; i<durationArr.length; i++){
        let videoTitle = videoTitleArr[i].getAttribute('title');
        let videoDuration= durationArr[i].getAttribute('aria-label');
        let videoCount= i+1;
        let videoDetails = {
            videoCount,
            videoTitle, 
            videoDuration
        }
        
        //let videoDetails+= `videoCount: ${videoCount}, videoTitle: ${videoTitle}, videoDuration: ${videoDuration}`;
        //let videoDetails= "videoCount: " + videoCount + ", " + "videoTitle: " + videoTitle + ", " + "videoDuration: " + videoDuration;
        videoDetailsList.push(JSON.stringify(videoDetails));
    }

    return videoDetailsList;
    
}