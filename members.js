"use strict";

const express = require("express");
const path = require("path");
const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const systems = {
  milipro: {
    title: "ミリプロ", group: "generation", groupLabel: "所属ユニット・期", extra: "color", extraLabel: "担当カラー",
    initial: [
      { id: 1, name: "甘狼このみ", generation: "ミリプロ0期生", debut_date: "2022-12-23", channel_url: "https://www.youtube.com/@AmakamiKonomi", color: null },
      { id: 2, name: "音ノ乃のの", generation: "ミリプロ1期生", debut_date: "2023-06-03", channel_url: "https://www.youtube.com/@nonononono", color: null },
      { id: 3, name: "あくび・でもんすぺーど", generation: "ミリプロ2期生", debut_date: "2024-01-09", channel_url: "https://www.youtube.com/@Akubi.demonspade", color: null },
      { id: 4, name: "小廻こま", generation: "ミリプロ3期生", debut_date: "2025-03-22", channel_url: "https://www.youtube.com/@小廻こま", color: null },
      { id: 5, name: "ゆらぎゆら", generation: "ミリプロNOVA", debut_date: "2024-06-09", channel_url: "https://www.youtube.com/@_YuraYuragi", color: null }
    ]
  },
  hololive: {
    title: "ホロライブ", group: "generation", groupLabel: "所属期・グループ", extra: "main_content", extraLabel: "主な配信内容",
    initial: [
      ["ときのそら", "0期生", "2017-09-07", "歌・配信", "https://www.youtube.com/channel/UCp6993wxpyDPHUpavwDFqgg"],
      ["さくらみこ", "0期生", "2018-08-01", "ゲーム配信・歌", "https://www.youtube.com/channel/UC-hM6YJuNYVAmUWxeIr9FeA"],
      ["星街すいせい", "0期生", "2018-03-22", "歌・音楽", "https://www.youtube.com/channel/UC5CwaMl1eIgY8h02uZw7u8A"],
      ["兎田ぺこら", "3期生", "2019-07-17", "ゲーム配信", "https://www.youtube.com/channel/UC1DCedRgGHBdm81E1llLhOQ"],
      ["がうる・ぐら", "holoMyth", "2020-09-13", "ゲーム配信・歌", null]
    ]
  },
  nijisanji: {
    title: "にじさんじ", group: "unit", groupLabel: "所属ユニット・区分", extra: "main_content", extraLabel: "主な配信内容",
    initial: [
      ["月ノ美兎", "1期生", null, "雑談・ゲーム配信", "https://www.youtube.com/@TsukinoMito"],
      ["樋口楓", "1期生", null, "歌・ゲーム配信", "https://www.youtube.com/@HiguchiKaede"],
      ["葛葉", "にじさんじゲーマーズ", null, "ゲーム配信", "https://www.youtube.com/@Kuzuha"],
      ["叶", "にじさんじゲーマーズ", null, "ゲーム配信・雑談", "https://www.youtube.com/@Kanae"],
      ["壱百満天原サロメ", "にじさんじ", null, "雑談・ゲーム配信", "https://www.youtube.com/channel/UCgIfLpQvelloDi8I0Ycbwpg"]
    ]
  }
};

// データはシステムごとに配列で管理し、再起動時に初期状態へ戻る。
for (const system of Object.values(systems)) {
  system.members = system.initial.map((entry, index) => {
    if (!Array.isArray(entry)) return { ...entry };
    const [name, group, debut_date, extra, channel_url] = entry;
    return { id: index + 1, name, [system.group]: group, debut_date,
      channel_url, [system.extra]: extra };
  });
  system.nextId = Math.max(0, ...system.members.map((member) => member.id)) + 1;
}

app.get("/", (req, res) => res.render("members_home", { systems }));


function findMember(key, id) {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return null;
  return systems[key].members.find((member) => member.id === Number(id));
}

function validate(body, system) {
  const read = (key) => typeof body[key] === "string" ? body[key].trim() : "";
  const name = read("name"), group = read(system.group), debut = read("debut_date");
  const channel = read("channel_url"), extra = read(system.extra);
  if (!name || !group || (system !== systems.milipro && !extra)) return { error: "必須項目を入力してください。" };
  const date = new Date(`${debut}T00:00:00Z`);
  if (debut && (!/^\d{4}-\d{2}-\d{2}$/.test(debut) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== debut)) return { error: "正しい日付を入力してください。" };
  if (channel) {
    try {
      const url = new URL(channel);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    } catch { return { error: "URLはhttpまたはhttpsで入力してください。" }; }
  }
  return { values: [name, group, debut || null, channel || null, extra || null] };
}

function updateMember(system, member, values) {
  [member.name, member[system.group], member.debut_date, member.channel_url, member[system.extra]] = values;
}
function addMember(system, values) {
  const member = { id: system.nextId++ };
  updateMember(system, member, values);
  system.members.push(member);
  return member;
}
function deleteMember(system, member) {
  system.members.splice(system.members.indexOf(member), 1);
}

// APIは一覧・詳細の取得、追加、変更、削除にHTTPメソッドを使う。
app.use("/api/:system", (req, res, next) => {
  const key = req.params.system;
  if (!Object.hasOwn(systems, key)) return res.status(404).json({ error: "システムが見つかりません。" });
  res.locals.apiSystem = systems[key];
  next();
});
app.get("/api/:system", (req, res) => res.json(res.locals.apiSystem.members));
app.post("/api/:system", (req, res) => {
  const system = res.locals.apiSystem;
  const result = validate(req.body || {}, system);
  if (result.error) return res.status(400).json({ error: result.error });
  const member = addMember(system, result.values);
  res.status(201).location(`/api/${req.params.system}/${member.id}`).json(member);
});
app.get("/api/:system/:id", (req, res) => {
  const member = findMember(req.params.system, req.params.id);
  if (!member) return res.status(404).json({ error: "メンバーが見つかりません。" });
  res.json(member);
});
app.put("/api/:system/:id", (req, res) => {
  const system = res.locals.apiSystem;
  const member = findMember(req.params.system, req.params.id);
  if (!member) return res.status(404).json({ error: "メンバーが見つかりません。" });
  const result = validate(req.body || {}, system);
  if (result.error) return res.status(400).json({ error: result.error });
  updateMember(system, member, result.values);
  res.json(member);
});
app.delete("/api/:system/:id", (req, res) => {
  const system = res.locals.apiSystem;
  const member = findMember(req.params.system, req.params.id);
  if (!member) return res.status(404).json({ error: "メンバーが見つかりません。" });
  deleteMember(system, member);
  res.status(204).end();
});

app.use("/:system", (req, res, next) => {
  const key = req.params.system;
  if (!Object.hasOwn(systems, key)) return res.status(404).send("システムが見つかりません。");
  res.locals.key = key;
  res.locals.system = systems[key];
  next();
});

app.get("/:system", (req, res) => {
  const { key, system } = res.locals;
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const members = system.members.filter((member) => member.name.includes(query));
  res.render("members_list", { members, query, system });
});
app.get("/:system/new", (req, res) => res.render("members_form", { member: {}, error: "", editing: false }));
app.post("/:system", (req, res) => {
  const { key, system } = res.locals;
  const result = validate(req.body, system);
  if (result.error) return res.status(400).render("members_form", { member: req.body, error: result.error, editing: false });
  addMember(system, result.values);
  res.redirect(`/${key}`);
});
app.get("/:system/:id/edit", (req, res) => {
  const member = findMember(res.locals.key, req.params.id);
  if (!member) return res.status(404).send("メンバーが見つかりません。");
  res.render("members_form", { member, error: "", editing: true });
});
app.post("/:system/:id", (req, res) => {
  const { key, system } = res.locals;
  const member = findMember(key, req.params.id);
  if (!member) return res.status(404).send("メンバーが見つかりません。");
  const result = validate(req.body, system);
  if (result.error) return res.status(400).render("members_form", { member: { ...req.body, id: member.id }, error: result.error, editing: true });
  updateMember(system, member, result.values);
  res.redirect(`/${key}/${member.id}`);
});
app.get("/:system/:id/delete", (req, res) => {
  const member = findMember(res.locals.key, req.params.id);
  if (!member) return res.status(404).send("メンバーが見つかりません。");
  res.render("members_delete", { member });
});
app.post("/:system/:id/delete", (req, res) => {
  const { key, system } = res.locals;
  const member = findMember(key, req.params.id);
  if (!member) return res.status(404).send("メンバーが見つかりません。");
  deleteMember(system, member);
  res.redirect(`/${key}`);
});
app.get("/:system/:id", (req, res) => {
  const member = findMember(res.locals.key, req.params.id);
  if (!member) return res.status(404).send("メンバーが見つかりません。");
  res.render("members_detail", { member });
});

if (require.main === module) app.listen(8081, () => console.log("メンバー管理: http://localhost:8081"));
module.exports = { app };
