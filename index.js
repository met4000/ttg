const Discord = require("discord.js"), client = new Discord.Client();
const fs = require("fs");

const DiscordRPClientInit = require("discord-rich-presence");
var DiscordRPClient;

function handle(err) { if (err.code != "MODULE_NOT_FOUND") throw err; }

var clientToken;
try { clientToken = require("./token.json").token; } catch(err) {
  handle(err);
  
  fs.writeFileSync("./token.json", null, "utf8");
  fs.writeFileSync("./token.json", JSON.stringify({ "token": "INSERT_YOUR_DISCORD_ACCOUNT_TOKEN_HERE" }), "utf8");
  console.error("FATAL ERROR: Unable to find token file.\nOne has been generated in the working\ndirectory.");
  process.exit(1);
}

if (!clientToken) {
  console.error("FATAL ERROR: Unable to get client token.\nCheck that the token file is valid.");
  process.exit(1);
}

var config;
try { config = require("./config.json"); } catch(err) {
  handle(err);
  
  fs.writeFileSync("./config.json", null, "utf8");
  fs.writeFileSync("./config.json", JSON.stringify({ "channelID": "000000000000000000" }), "utf8");
  console.error("FATAL ERROR: Unable to find config file.\nOne has been generated in the working\ndirectory.");
  process.exit(1);
}

if ((typeof config.channelID != "string") || parseInt(config.channelID) <= 0) {
  console.error("FATAL ERROR: Invalid config file.\nCheck that the channelID is correct.");
  process.exit(1);
}


const channelID = config.channelID, tatsumakiID = config.tatsumakiID || "172002275412279296";
const delay = parseFloat(config.delay) || 12.5;

const datalogging = true;   // requires the user to have a custom discord pfp
var data = {
  initialXP: 0,

  currentXP: 0,
  nextXP: 0,

  dXPdt: 0,
  dXPdtime: new Date().valueOf(),

  currentLevel: 1,

  count: {
    successes: 0,
    failures: 0
  },

  errors: 0,

  misses: 0,
  missTime: 0,
};

function getCurrentLevel(nextXP) { return Math.round(3/20 * Math.sqrt(nextXP)); }

function restrictDP(n, dp) { var p = Math.pow(10, dp); return Math.floor(n * p) / p; }


function ttg() { try { client.channels.get(channelID).send("t!tg train"); } catch(err) { data.errors++; } }
client.on("ready", () => {
  // try {
    console.log("Connected. Let the training commence!");

    DiscordRPClient = DiscordRPClientInit(client.id);

    DiscordRPClient.updatePresence({
      state: 'slithering',
      details: '🐍',
      startTimestamp: Date.now(),
      endTimestamp: Date.now() + 1337,
      // largeImageKey: 'snek_large',
      // smallImageKey: 'snek_small',
      instance: true,
    });

    setInterval(ttg, delay * 1000);
    ttg();
  // } catch(err) { data.errors++; }
});

client.on("message", message => {
  try {
    if (message.channel.id == channelID) {
      if (message.author.id == tatsumakiID) {
        var e = message.embeds[0];
        if (e) {
          var a = e.author;
          if ((/avatars\/(\d+)\//.exec(a.iconURL) || [])[1] == client.user.id) {
            message.acknowledge();
            if (a.name == "Success!") {
              data.count.successes++;


              var d = /(\d+)\s+exp\s+\[(\d+)\/(\d+)\]/.exec(e.description);

              data.currentXP = d[2];
              if (!data.initialXP) data.initialXP = data.currentXP;

              data.dXPdt = d[1] / ((new Date() - data.dXPtime) / 1000) * 60;
              data.dXPtime = new Date().valueOf();

              if (d[3] > data.nextXP) { // new level
                data.nextXP = d[3];
                data.currentLevel = getCurrentLevel(data.nextXP);
              }
            } else {
              data.count.failures++;
            }


            // data logging
            if (datalogging) {
              console.clear();

              var tCount = data.count.successes + data.count.failures;
              var averageRaw = (data.currentXP - data.initialXP) / (tCount - 1);
              var averageFiltered = (data.currentXP - data.initialXP) / (data.count.successes - 1);

              if (data.count.successes > 1) {
                var leveluptext = Math.floor((data.nextXP - data.currentXP) / averageRaw * delay);
                var LUh = Math.floor(leveluptext / 3600);
                var LUm = Math.floor((leveluptext - (LUh * 3600)) / 60);
                var LUs = leveluptext - (LUh * 3600) - (LUm * 60);
                leveluptext = "";
                if (LUh) {
                  leveluptext += LUh.toString().padStart(2, "0") + ":";
                }
                leveluptext += LUm.toString().padStart(2, "0") + ":";
                leveluptext += LUs.toString().padStart(2, "0");
              }

              var xp_p_min = 60 / delay * averageRaw;

              // restrict dp for displaying
              averageRaw = restrictDP(averageRaw, 2);
              averageFiltered = restrictDP(averageFiltered, 2);
              xp_p_min = restrictDP(xp_p_min, 2);
              var dXPdt = restrictDP(data.dXPdt, 2);
              var sRatio = restrictDP(data.count.successes / tCount, 2);

              console.log("Tatsugotchi Training Bot - Stats");
              if (data.count.successes >= 2) {
                console.log("LVL: " + data.currentLevel + " (approx " + leveluptext + " until next level)");
                console.log("EXP: " + data.currentXP + "/" + data.nextXP + " (" + xp_p_min + " per min)"); //, " + dXPdt + " rn)");
              }
              console.log("AVGs: xp=" + averageFiltered + " s=" + data.count.successes + "/" + tCount + "=" + sRatio + " e=" + data.errors + " m=" + data.misses);
            }
          }
        } else {
          var r = /\*\*(.+)\*\*, \*\*please wait (\d{1,2}) seconds before attempting to train your/.exec(message.content);
          if (r) {
            if (r[1] == client.user.username) {
              data.misses++;
              data.missTime += parseInt(r[2]);
            }
          }
        }
      }
    }
  } catch(err) { data.errors++; }
});

client.login(clientToken).catch(() => { console.error("FATAL ERROR: Unable to connect to discord.\nCheck your internet connection and the\naccess token in 'config.json' is correct."); });
