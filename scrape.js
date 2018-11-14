const request = require('request')
const cheerio = require('cheerio')
const fs = require('fs')
// index of existing scraped data
//var scrapelist = require('./scrapelist.json')
var minIdx = 233 // there are no sign listings with lower id numbers
var maxIdx = 7100 // 7031 is highest number as of 13th nov 2018
//var maxAge = 30; //days

function fetchMeta(idx, onMetaAvailable) {
  var url = "https://nzsl.vuw.ac.nz/signs/"+parseInt(idx);
  //console.log("Requesting: " + url)
  request(url, (error, response, html) => {
    if (!error && response.statusCode == 200) {
      var web = cheerio.load(html)
      var images = []
      var videos = []
      videos.push(web(".main_video.normal source").attr('src'))

      // extract the stuff that has a static quantity
      var meta = {
        nzsl_id: idx,
        gloss: {
          english:
            web(".videos .glosses-container.glosses .main_gloss").first().text().split(',').map((x) => x.trim()),
          english_secondary:
            web(".videos .glosses-container.glosses .secondary_gloss").first().text().split(',').map((x) => x.trim()),
          maori:
            web(".videos .glosses-container.glosses .maori-gloss").first().text().split(',').map((x) => x.trim()),
          attributes:
            web(".videos .glosses-container.glosses .word_gloss").first().text().split(',').map((x) => x.trim())
        },
        video: web(".main_video.normal source").attr('src').split('/').slice(-1)[0],
        usage: [],
        attributes: {},
        image: web("img.main-image").attr('src').split('/').slice(-1)[0],
      }

      // extract the usage videos, if any
      web(".examples-container div.videos").each((i, div) => {
        div = web(div)
        var videoURL = div.find("video.example_video.normal source").attr("src")
        var use = {
          video: videoURL.split('/').slice(-1)[0],
          signs: [],
          translation: div.find(".secondary_gloss").last().text().trim()
        }
        // traverse the signs listing for this example and append to signs listing
        div.find(".secondary_gloss").first().contents().each((i2, obj) => {
          if (obj.type == 'text' && obj.data.toString().trim().length > 0) { // plain text gloss
            obj.data.toString().trim().split(' ').forEach((str) => use.signs.push(str))
          } else if (obj.type == 'tag' && obj.name == 'strong') { // self reference
            use.signs.push(meta.nzsl_id)
          } else if (obj.type == 'tag' && obj.name == 'a') { // cross link to another sign listing
            var url = obj.attribs.href
            var localLinkMatch = url.match(/https:\/\/nzsl\.vuw\.ac\.nz\/signs\/(\d+)/)
            if (localLinkMatch) {
              use.signs.push(parseInt(localLinkMatch[1]))
            } else {
              use.signs.push(url)
            }
          }
        })

        meta.usage.push(use);
        videos.push(videoURL)
      })

      // extract attributes (handshapes, locations)
      web(".sign_attributes img").each((i, img) => {
        var src = web(img).attr('src')
        var kind = src.match(/assets\/([a-z]+)\//)[1]
        var value = src.split('/').slice(-1)[0]
        meta.attributes[kind] = meta.attributes[kind] || []
        meta.attributes[kind].push(value);
        images.push("https://nzsl.vuw.ac.nz" + src);
      })
      // add image to download list
      images.push("https://nzsl.vuw.ac.nz" + web("img.main-image").attr('src'))

      onMetaAvailable(null, meta, videos, images)
    } else {
      //console.log("Error: HTTP Code" + response.statusCode)
      //console.log(error)
      onMetaAvailable("Missing")
    }
  })
}

// download any new files, sequentially
function download(queue, cb) {
  // skip existing files
  if (fs.existsSync(queue[0].writeTo)) {
    if (queue.length > 1) return download(queue.slice(1), cb);
    else return cb(null)
  }

  request({url: queue[0].url, encoding: null}, (err, response, body) => {
    if (response.statusCode == 200) {
      fs.writeFile(queue[0].writeTo, body, null, (err) => {
        if (!err) {
          if (queue.length > 1) {
            download(queue.slice(1), cb);
          } else {
            cb(null);
          }
        } else {
          cb(err);
        }
      })
    } else {
      cb(err);
    }
  })
}

// version that downloaded all media concurrently, which runs faster, but caused
// dns errors for me.
// function download(inputQueue, cb) {
//   // skip existing files
//   var queue = inputQueue.filter((q)=> !fs.existsSync(q.writeTo))
//   var requests = queue.length;
//   var errors = [];
//   //console.log("starting dl: " + requests);
//
//   // check if time to return
//   var maybeReturn = function() {
//     //console.log("remaining requests: "+requests)
//     if (requests < 1) {
//       if (errors.length == 0) cb();
//       else {
//         console.error(JSON.stringify(errors));
//         cb(errors);
//       }
//     }
//   }
//
//   if (queue.length < 1) return cb();
//   else queue.forEach((q)=> {
//     request({url: q.url, encoding: null}, (err, response, body) => {
//       if (!err && response.statusCode == 200) {
//         fs.writeFile(q.writeTo, body, null, (err) => {
//           requests -= 1
//           if (err) errors.push(err)
//           maybeReturn();
//         })
//       } else {
//         requests -= 1
//         console.error("HTTP Asset Error: " + err)
//         errors.push(err)
//         maybeReturn()
//       }
//     })
//   })
// }

function fetchAndSave(idx, fasCB) {
  fetchMeta(idx, (err, meta, videos, images) => {
    if (!err) {
      var jsonTxt = JSON.stringify(meta, null, 2)
      fs.writeFileSync(`./data/${meta.nzsl_id}.json`, jsonTxt)
      //console.log(jsonTxt)
      //if (!fs.existsSync(`./image/${meta.nzsl_id}`)) fs.mkdirSync(`./image/${meta.nzsl_id}`)
      if (!fs.existsSync(`./video/${meta.nzsl_id}`)) fs.mkdirSync(`./video/${meta.nzsl_id}`)

      // download files that don't exist yet
      var downloadList = [];
      var videoDownloads = videos.map((url) => {
        return {
          url: url,
          writeTo: `./video/${meta.nzsl_id}/${url.split('/').slice(-1)[0]}`
        }
      })
      var imageDownloads = images.map((url) => {
        return {
          url: url,
          writeTo: `./image/${url.split('/').slice(-1)[0]}`
        }
      })
      // download images, then videos
      download(imageDownloads, (err)=> {
        if (err) return fasCB(err)
        download(videoDownloads, (err)=> fasCB(err))
      })
    } else {
      fasCB(err)
    }
  })
}

function iter(idx, max) {
  if (idx <= max) {
    fetchAndSave(idx, (err) => {
      if (!err) {
        console.log(" ok - " + idx)
      } else {
        console.error(" ERR: " + idx + ": " + err.toString())
      }
      iter(idx + 1, max)
    })
  } else {
    console.log("Finished!")
  }
}

// download a specific list of nzsl_id's
function fetchList(list, cb) {
  if (list.length > 0) {
    fetchAndSave(list[0], (err)=> {
      console.log(`Fetched ${list[0]}: ${err}`)
      if (err) return cb(err)
      else fetchList(list.slice(1), cb)
    })
  } else {
    cb()
  }
}

// scan through range specified at top
iter(minIdx, maxIdx);


// generate a list of signs with the space corruption in usage sign lists
// var updateList = []
// for (var idx = 0; idx < 8000; idx++) {
//   if (fs.existsSync(`./data/${idx}.json`)) {
//     var meta = JSON.parse(fs.readFileSync(`./data/${idx}.json`))
//     var needsUpdate = false
//     meta.usage.forEach((usage)=> {
//       usage.signs.forEach((sign)=> {
//         if (sign.toString().split(' ').length > 1) needsUpdate = true
//       })
//     })
//     if (needsUpdate) updateList.push(idx)
//   }
// }
//
// // fetch a list of specific NZSL sign id's
// fetchList(updateList, (err)=>
//   console.log("Finished List! Errors: ", err)
// )
