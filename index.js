const Discord = require("discord.js"), client = new Discord.Client();
const config = require("./config.json");

const channelID = "641478310781517834", tatsumakiID = "172002275412279296";
const delay = 12.5;

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

  errors: 0
};

function getCurrentLevel(nextXP) { return Math.round(3/20 * Math.sqrt(nextXP)); }

function restrictDP(n, dp) { var p = Math.pow(10, dp); return Math.floor(n * p) / p; }


function ttg() { try { client.channels.get(channelID).send("t!tg train"); } catch(err) { data.errors++; } }
client.on("ready", () => { try { console.log("Connected. Let the training commence!"); ttg(); setInterval(ttg, delay * 1000); } catch(err) { data.errors++; } });

client.on("message", message => {
  try {
    if (message.channel.id == channelID) {
      if (message.author.id == tatsumakiID) {
        var e = message.embeds[0];
        if (e) {
          var a = e.author;
          if (!a.iconURL) return;
          if (/avatars\/(\d+)\//.exec(a.iconURL)[1] == client.user.id) {
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
                leveluptext += LUm.toString().padStart(2, "0") + ":";
              } else if (LUm) leveluptext += LUm.toString().padStart(2, "0") + ":";
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
            console.log("AVGs: xp=" + averageFiltered + " s=" + data.count.successes + "/" + tCount + "=" + sRatio + " e=" + data.errors);
          }
        }
      }
    }
  } catch(err) { data.errors++; }
});

client.login(config.token).catch(() => { console.error("Fatal Error: Unable to connect to discord.\nCheck your internet connection and the\naccess token in 'config.json' is correct."); });
