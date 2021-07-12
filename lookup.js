const csv = require("csvtojson");
const _ = require("lodash/object");
const manchu = require("./ManchuCore");
const pangu = require("pangu");

const divideByPunctuations = text =>
  text.replace(/[，。？！、【】：；… ]+/, " ").split(" ");
const chars = "^{()}[]$".split();
function realRegex(exp) {
  for (var i = 0; i < chars.length; i++) {
    if (exp.indexOf(chars.i) != -1) return true;
    return false; //plain text
  }
}

const Datastore = require("nedb-promises"),
  db = new Datastore(/*{filename: 'data/db.json', autoload: true}*/);
let newdb = true;
if (newdb) {
csv()
  .fromFile("data/dict1.csv")
  .then(jsonObj => {
    var trimmed = jsonObj.map(i => {
      //i.zh = i.zh.split(" | ");
      i.zh = i.zh.split(" | ").join("；");
      i.m = i.m.replace(/&nbsp;/g, " ").replace(/( |　)./g, " ");
      i.r = i.r.replace(/&nbsp;/g, " ").replace(/( |　)./g, " ");
      return _.pick(i, ["m", "r", "zh"]);
    });
    //db.insert(trimmed, function(err, newDoc) {});
    db.insert(trimmed);
  });

csv()
  .fromFile("data/dict2.csv")
  .then(jsonObj => {
    // in this csv:
    // "m,h,o,d,p,c,g" => "manchu, hergen, original, definition, picture, color, group"
    var trimmed = jsonObj.map(item => {
      //console.log(item)
      item.d = item.d.split("||").join(",");
      item["h"] = item["h"].split("||").join(",");
      item.d = item.d.replace(/([a-z@])(，|,)([a-z@])/g, "$1, $3");
      // item.d = item.d.replace(/(\[)((不)?及)(\] ?)/g, '<b>$2</b> ');
      var obj = {};
      obj.m = item["m"];
      obj.r = item["h"];
      obj.zh = item["d"];
      return obj;
    });
    db.insert(trimmed).then(newDocs =>
      console.log("Database " + newDocs.length + " logs")
    );
  });
}

async function any(term, mode) {
  var t = term.replace(/　/g, " ");
  const segaments = t.split(" ");
  var page = segaments.slice(-1)[0]; //Cannot be a constant!
  page = /^[0-9]+$/.test(page) ? Number(segaments.pop()) : 1; // pop() 删除&返回数组最后一个元素
  t = segaments.join(" ");

  try {
    var statement, newSort;
    if (/[\u4e00-\u9fa5]+/.test(t)) {
      //ニカン語
      //t = await simplify(t);
      console.log(t);
      statement = { zh: new RegExp(t, "gm") };
      newSort = function(array) {
        // Sort with length
        array = array.sort(function(a, b) {
          //return a.zh.join("；").length - b.zh.join("；").length;
          return a.zh.length - b.zh.length;
        });
        // Sort with whole word match
        if (true) {
          //完全匹配
          array = array.sort(function(a, b) {
            //a = a.zh.includes(simplify(t));
            //b = b.zh.includes(simplify(t));
            //TODO: 批量分割
            a = divideByPunctuations(a.zh).includes(t);
            b = divideByPunctuations(b.zh).includes(t);
            return b - a;
          });
        }
        return array;
      };
    } else {
      if (manchu.isManchuScript(t)) {
        statement = { m: new RegExp(t, "g") };
        newSort = function(array) {
          // Sort with whole word match
          array = array.sort(function(a, b) {
            a = a.m
              .replace("/", " ")
              .split(" ")
              .includes(t);
            b = b.m
              .replace("/", " ")
              .split(" ")
              .includes(t);
            //simplify is the func for simplifying Chinese
            return b - a;
          });
          return array;
        };
      } else {
        //romanization
        t = t.toLowerCase();
        statement = { r: new RegExp(t, "g") };
        newSort = function(array) {
          // Sort with whole word match
          array = array.sort(function(a, b) {
            a = a.r
              .replace("/", " ")
              .split(" ")
              .includes(t);
            b = b.r
              .replace("/", " ")
              .split(" ")
              .includes(t);
            return b - a;
          });
          return array;
        };
      }
    }
  } catch (err) {
    console.log(err);
    return "Reg Exp Err"
  }
  var docs = await db.find(statement);
  //Deterimine whether t is a regex or plain text
  if (!realRegex(t)) {
    docs = newSort(docs);
  }
  const l = docs.length;
  const pagelength = 20;
  // 屎山之巅
  if (page <= 1) page = 1;
  const pagecount = Math.ceil(l / pagelength);
  if (page * pagelength > l) page = pagecount;
  // telegram bot 遗留代码
  var o = t.bold() + ": ";
  let numb = "";
  if (l > pagelength) { // Pagination
    var pageend = page == pagecount ? l : pagelength * page;
    docs = docs.slice(pagelength * (page - 1), pageend);
    // numb += `Page ${page} / ${pagecount}, ${pagelength * (page - 1) + 1} ~ ${pagelength * page} <i>of</i> ${l} result`;
  }
  // console.log(docs)
  return docs;
  /*
  // if (l > 1) numb += "s";
  // if (l != 0) numb += "\n";
  // o += numb.italics();
  var docso = "";
  docs.map(e => docso += "- " + [e.m.bold(), "<code>" + e.r + "</code>", pangu.spacing(e.zh)].join(" | ") + "\n");
  if (!realRegex(t)) docso = docso.replace(t, "<u>" + t + "</u>");
  o = o + docso;
  docso = undefined;
  o = o.replace("undefined", "").replace(/［[0-9]+］/g, "");
  o = o.replace(/(@|v)/g, "ū").replace(/(x|S)/g, "š");
  o = o.replace(/\| 〔/, "|〔").replace(/( ?)([\u2460-\u24ff])/, " $2 "); //数字编号的空格
  return o.replace(/  +/, " ");
  */
}

module.exports = { any };