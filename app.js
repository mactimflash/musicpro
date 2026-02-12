// ========================
// MusicPro (Queue + Multi-select) - iOS Safari friendly
// ========================

const audio = document.getElementById("audio");

const nowTitle = document.getElementById("nowTitle");
const nowSub = document.getElementById("nowSub");
const art = document.getElementById("art");
const brandSub = document.getElementById("brandSub");

const tCur = document.getElementById("tCur");
const tDur = document.getElementById("tDur");
const seek = document.getElementById("seek");
const vol = document.getElementById("vol");

const btnPlay = document.getElementById("btnPlay");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");
const btnShuffle = document.getElementById("btnShuffle");
const btnLoop = document.getElementById("btnLoop");
const btnReload = document.getElementById("btnReload");

const q = document.getElementById("q");
const sectionSel = document.getElementById("section");
const sortSel = document.getElementById("sort");
const listEl = document.getElementById("list");

// mini
const miniOpen = document.getElementById("miniOpen");
const miniArt = document.getElementById("miniArt");
const miniTitle = document.getElementById("miniTitle");
const miniSubTitle = document.getElementById("miniSubTitle");
const miniPrev = document.getElementById("miniPrev");
const miniPlay = document.getElementById("miniPlay");
const miniNext = document.getElementById("miniNext");

// sheet
const sheet = document.getElementById("sheet");
const sheetBack = document.getElementById("sheetBack");
const sheetClose = document.getElementById("sheetClose");
const sheetArt = document.getElementById("sheetArt");
const sheetTitle = document.getElementById("sheetTitle");
const sheetSub = document.getElementById("sheetSub");
const tCur2 = document.getElementById("tCur2");
const tDur2 = document.getElementById("tDur2");
const seek2 = document.getElementById("seek2");
const vol2 = document.getElementById("vol2");
const btnPrev2 = document.getElementById("btnPrev2");
const btnPlay2 = document.getElementById("btnPlay2");
const btnNext2 = document.getElementById("btnNext2");
const btnShuffle2 = document.getElementById("btnShuffle2");
const btnLoop2 = document.getElementById("btnLoop2");

// queue/cart
const queueEl = document.getElementById("queue");
const cartDrop = document.getElementById("cartDrop");
const cartSub = document.getElementById("cartSub");
const btnQueueMode = document.getElementById("btnQueueMode");
const btnClearQueue = document.getElementById("btnClearQueue");

// multi-select
const btnSelectMode = document.getElementById("btnSelectMode");
const btnSelectAll = document.getElementById("btnSelectAll");
const btnClearSel = document.getElementById("btnClearSel");
const btnAddSelected = document.getElementById("btnAddSelected");
const multiInfo = document.getElementById("multiInfo");

// state
let tracks = [];
let view = [];
let index = 0;

let isShuffle = false;
let isLoop = false;

// Queue state: store realIndex in tracks[]
let queue = [];
let queuePos = 0;
let playQueueMode = true;

// Multi-select state
let selectMode = false;
let selected = new Set();

// ---- utils ----
const DEFAULT_SHUFFLE_ON_FIRST_RUN = true;

function fmt(sec){
  if(!isFinite(sec)) return "0:00";
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec/60);
  const s = sec%60;
  return `${m}:${String(s).padStart(2,"0")}`;
}

function parseBpm(text){
  const m = String(text||"").match(/(\d{2,3})\s*bpm\b/i);
  if(!m) return null;
  const bpm = Number(m[1]);
  return (bpm >= 60 && bpm <= 220) ? bpm : null;
}

function coverEmoji(section){
  if(section === "Warmup") return "🔥";
  if(section === "Cardio") return "💪";
  if(section === "Cooldown") return "🧘";
  return "🎵";
}

function safeAudioUrl(filePath){
  // Encode từng segment để iOS Safari không “kẹt” khi tên có space/ký tự lạ
  const parts = String(filePath).split("/").map(p => encodeURIComponent(p));
  return new URL(parts.join("/"), location.href).href;
}

// ---- persistence ----
function persistUI(){
  const s = {
    index,
    time: audio.currentTime || 0,
    vol: audio.volume,
    isShuffle,
    isLoop,
    q: q.value || "",
    section: sectionSel.value,
    sort: sortSel.value,
  };
  localStorage.setItem("musicpro_ui_state", JSON.stringify(s));
}
function restoreUI(){
  try{
    const s = JSON.parse(localStorage.getItem("musicpro_ui_state") || "null");
    if(!s){
      isShuffle = DEFAULT_SHUFFLE_ON_FIRST_RUN;
      setShuffle(isShuffle);
      return;
    }
    index = Number.isFinite(s.index) ? s.index : 0;

    audio.volume = Number.isFinite(s.vol) ? s.vol : 1;
    vol.value = String(audio.volume);
    vol2.value = String(audio.volume);

    isShuffle = !!s.isShuffle;
    isLoop = !!s.isLoop;
    audio.loop = isLoop;

    setShuffle(isShuffle);
    setLoop(isLoop);

    if(typeof s.q === "string") q.value = s.q;
    if(s.section) sectionSel.value = s.section;
    if(s.sort) sortSel.value = s.sort;
  }catch{}
}
function saveQueue(){
  localStorage.setItem("musicpro_queue", JSON.stringify({ queue, queuePos, playQueueMode }));
}
function loadQueue(){
  try{
    const s = JSON.parse(localStorage.getItem("musicpro_queue") || "null");
    if(!s) return;
    queue = Array.isArray(s.queue) ? s.queue : [];
    queuePos = Number.isFinite(s.queuePos) ? s.queuePos : 0;
    playQueueMode = !!s.playQueueMode;
    btnQueueMode?.setAttribute("aria-pressed", String(playQueueMode));
  }catch{}
}

// ---- Now playing UI ----
function setNow(t){
  const bpm = t._bpm != null ? `BPM ${t._bpm}` : "BPM —";
  const section = t.section || "Other";
  const meta = `${t.artist || "Workout"} • ${section} • ${bpm}`;
  const icon = t.coverEmoji || coverEmoji(section);

  nowTitle.textContent = t.title || "—";
  nowSub.textContent = meta;
  art.textContent = icon;

  miniArt.textContent = icon;
  miniTitle.textContent = t.title || "—";
  miniSubTitle.textContent = meta;

  sheetArt.textContent = icon;
  sheetTitle.textContent = t.title || "—";
  sheetSub.textContent = meta;

  document.title = t.title ? `${t.title} • MusicPro` : "MusicPro";
}

function updatePlayIcons(){
  const playing = !audio.paused;
  const icon = playing ? "⏸" : "▶";
  btnPlay.textContent = icon;
  miniPlay.textContent = icon;
  btnPlay2.textContent = icon;
}

function highlightActive(){
  document.querySelectorAll(".item").forEach(el=>{
    el.classList.toggle("active", Number(el.dataset.realIndex) === index);
  });
  document.querySelectorAll(".qItem").forEach((el, pos)=>{
    el.classList.toggle("active", playQueueMode && pos === queuePos);
  });
}

function openSheet(){
  sheet.classList.add("show");
  sheet.setAttribute("aria-hidden", "false");
}
function closeSheet(){
  sheet.classList.remove("show");
  sheet.setAttribute("aria-hidden", "true");
}

// ---- playback logic ----
function pickRandomIndex(){
  if(tracks.length <= 1) return index;
  let r = index;
  while(r === index) r = Math.floor(Math.random() * tracks.length);
  return r;
}

function nextIndexNormal(){
  return isShuffle ? pickRandomIndex() : ((index + 1) % tracks.length);
}

function loadByIndex(i, autoplay=false){
  index = (i + tracks.length) % tracks.length;
  const t = tracks[index];
  if(!t) return;

  audio.src = safeAudioUrl(t.file);
  audio.loop = isLoop;

  setNow(t);
  highlightActive();

  if(autoplay){
    audio.play().catch(()=>{});
  }
  updatePlayIcons();
  persistUI();
}

function playNext(){
  if(playQueueMode && queue.length){
    if(queuePos + 1 >= queue.length){
      // End of queue: stop at last
      queuePos = queue.length - 1;
      saveQueue();
      renderQueue();
      return;
    }
    queuePos++;
    saveQueue();
    renderQueue();
    loadByIndex(queue[queuePos], true);
    return;
  }
  loadByIndex(nextIndexNormal(), true);
}

function playPrev(){
  if(audio.currentTime > 3){
    audio.currentTime = 0;
    return;
  }

  if(playQueueMode && queue.length){
    queuePos = Math.max(0, queuePos - 1);
    saveQueue();
    renderQueue();
    loadByIndex(queue[queuePos], true);
    return;
  }

  loadByIndex(index - 1, true);
}

// ---- shuffle/loop ----
function setShuffle(v){
  isShuffle = !!v;
  btnShuffle.setAttribute("aria-pressed", String(isShuffle));
  btnShuffle2.setAttribute("aria-pressed", String(isShuffle));
  persistUI();
}
function setLoop(v){
  isLoop = !!v;
  audio.loop = isLoop;
  btnLoop.setAttribute("aria-pressed", String(isLoop));
  btnLoop2.setAttribute("aria-pressed", String(isLoop));
  persistUI();
}

// ---- query / list ----
function applyQuery(){
  const text = (q.value || "").trim().toLowerCase();
  const sec = sectionSel.value;

  view = tracks
    .map((t, realIndex)=>({ t, realIndex }))
    .filter(x => (sec === "All" ? true : x.t.section === sec))
    .filter(x => {
      if(!text) return true;
      const t = x.t;
      return (t.title||"").toLowerCase().includes(text)
        || (t.artist||"").toLowerCase().includes(text)
        || (t.section||"").toLowerCase().includes(text)
        || String(t._bpm ?? "").includes(text);
    });

  const mode = sortSel.value;
  const safe = v => (v||"").toString().toLowerCase();

  view.sort((a,b)=>{
    const A=a.t, B=b.t;
    if(mode==="title") return safe(A.title).localeCompare(safe(B.title));
    if(mode==="section") return safe(A.section).localeCompare(safe(B.section)) || safe(A.title).localeCompare(safe(B.title));
    if(mode==="bpm") return (A._bpm ?? 999) - (B._bpm ?? 999) || safe(A.title).localeCompare(safe(B.title));
    if(mode==="duration") return (A._dur||0) - (B._dur||0);
    return (B._added||0) - (A._added||0);
  });

  renderList();
  persistUI();
}

// ---- multi-select ----
function setSelectMode(v){
  selectMode = !!v;
  btnSelectMode?.setAttribute("aria-pressed", String(selectMode));
  if(!selectMode) selected.clear();
  updateMultiInfo();
  renderList();
}

function toggleSelected(realIndex){
  if(selected.has(realIndex)) selected.delete(realIndex);
  else selected.add(realIndex);
  updateMultiInfo();
  highlightSelectedInDOM();
}

function updateMultiInfo(){
  if(!multiInfo) return;
  multiInfo.textContent = `${selected.size} selected`;
}

function highlightSelectedInDOM(){
  document.querySelectorAll(".item").forEach(el=>{
    const ri = Number(el.dataset.realIndex);
    el.classList.toggle("selected", selected.has(ri));
    const box = el.querySelector(".selBox");
    if(box) box.textContent = selected.has(ri) ? "✓" : "";
  });
}

// ---- queue/cart ----
function addToQueue(realIndex){
  if(!tracks[realIndex]) return;
  queue.push(realIndex);
  saveQueue();
  renderQueue();
}

function removeFromQueue(pos){
  queue.splice(pos, 1);
  if(queuePos >= queue.length) queuePos = Math.max(0, queue.length - 1);
  saveQueue();
  renderQueue();
}

function moveQueue(from, to){
  if(from === to) return;
  const item = queue.splice(from, 1)[0];
  queue.splice(to, 0, item);

  // keep queuePos stable
  if(from === queuePos) queuePos = to;
  else{
    if(from < queuePos && to >= queuePos) queuePos--;
    if(from > queuePos && to <= queuePos) queuePos++;
  }

  saveQueue();
  renderQueue();
}

function renderQueue(){
  if(!queueEl) return;
  queueEl.innerHTML = "";
  cartSub.textContent = `${queue.length} bài`;

  queue.forEach((realIndex, pos) => {
    const t = tracks[realIndex];

    const li = document.createElement("li");
    li.className = "qItem" + (playQueueMode && pos === queuePos ? " active" : "");

    const drag = document.createElement("div");
    drag.className = "qDrag";
    drag.textContent = "⋮⋮";
    drag.title = "Drag to reorder (desktop)";
    li.appendChild(drag);

    const meta = document.createElement("div");
    meta.className = "qMeta";

    const title = document.createElement("div");
    title.className = "qTitle";
    title.textContent = t?.title || "—";

    const sub = document.createElement("div");
    sub.className = "qSub";
    sub.textContent = `${t?.section || "Other"} • BPM ${t?._bpm ?? "—"}`;

    meta.appendChild(title);
    meta.appendChild(sub);
    li.appendChild(meta);

    const btns = document.createElement("div");
    btns.className = "qBtns";

    const up = document.createElement("button");
    up.className = "qBtn";
    up.type = "button";
    up.textContent = "↑";
    up.title = "Move up";
    up.onclick = () => moveQueue(pos, Math.max(0, pos - 1));

    const down = document.createElement("button");
    down.className = "qBtn";
    down.type = "button";
    down.textContent = "↓";
    down.title = "Move down";
    down.onclick = () => moveQueue(pos, Math.min(queue.length - 1, pos + 1));

    const play = document.createElement("button");
    play.className = "qBtn";
    play.type = "button";
    play.textContent = "▶";
    play.title = "Play from here";
    play.onclick = () => {
      playQueueMode = true;
      queuePos = pos;
      btnQueueMode.setAttribute("aria-pressed", "true");
      saveQueue();
      renderQueue();
      loadByIndex(queue[queuePos], true);
    };

    const del = document.createElement("button");
    del.className = "qBtn";
    del.type = "button";
    del.textContent = "✕";
    del.title = "Remove";
    del.onclick = () => removeFromQueue(pos);

    btns.appendChild(up);
    btns.appendChild(down);
    btns.appendChild(play);
    btns.appendChild(del);

    li.appendChild(btns);

    li.addEventListener("click", () => {
      playQueueMode = true;
      queuePos = pos;
      btnQueueMode.setAttribute("aria-pressed", "true");
      saveQueue();
      renderQueue();
      loadByIndex(queue[queuePos], true);
      openSheet();
    });

    // Desktop drag reorder inside queue
    li.draggable = true;
    li.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/qpos", String(pos));
    });
    li.addEventListener("dragover", (e) => e.preventDefault());
    li.addEventListener("drop", (e) => {
      e.preventDefault();
      const from = Number(e.dataTransfer.getData("text/qpos"));
      const to = pos;
      if(Number.isFinite(from)) moveQueue(from, to);
    });

    queueEl.appendChild(li);
  });

  highlightActive();
}

// ---- render list ----
function renderList(){
  listEl.innerHTML = "";

  view.forEach(({t, realIndex})=>{
    const li = document.createElement("li");
    li.className = "item";
    li.dataset.realIndex = String(realIndex);

    // checkbox for select mode
    if(selectMode){
      const selBox = document.createElement("div");
      selBox.className = "selBox";
      selBox.textContent = selected.has(realIndex) ? "✓" : "";
      li.appendChild(selBox);
    }

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = t.coverEmoji || coverEmoji(t.section);
    li.appendChild(badge);

    const meta = document.createElement("div");
    meta.className = "itemMeta";

    const title = document.createElement("div");
    title.className = "itemTitle";
    title.textContent = t.title || "Untitled";

    const sub = document.createElement("div");
    sub.className = "itemSub";
    sub.innerHTML = `
      <span class="pill">${t.section || "Other"}</span>
      <span class="pill">BPM ${t._bpm ?? "—"}</span>
      <span class="pill">${t._dur ? fmt(t._dur) : "—"}</span>
    `;

    meta.appendChild(title);
    meta.appendChild(sub);

    li.appendChild(meta);

    // Add-to-queue button (tap-friendly on iPhone)
    const add = document.createElement("button");
    add.className = "addBtn";
    add.type = "button";
    add.textContent = "➕";
    add.title = "Add to Queue";
    add.addEventListener("click", (ev) => {
      ev.stopPropagation();
      addToQueue(realIndex);
    });
    li.appendChild(add);

    // click behavior
    li.addEventListener("click", ()=>{
      if(selectMode){
        toggleSelected(realIndex);
        return;
      }
      loadByIndex(realIndex, true);
      openSheet();
    });

    // Desktop drag into cart
    li.draggable = true;
    li.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", String(realIndex));
    });

    listEl.appendChild(li);
  });

  highlightActive();
  highlightSelectedInDOM();
}

// ---- durations (optional) ----
async function loadDurations(){
  await Promise.all(tracks.map(t => new Promise((resolve)=>{
    const a = new Audio();
    a.preload = "metadata";
    a.src = safeAudioUrl(t.file);
    a.addEventListener("loadedmetadata", ()=>{ t._dur = a.duration; resolve(); }, {once:true});
    a.addEventListener("error", ()=> resolve(), {once:true});
  })));
}

// ---- events ----
btnReload.addEventListener("click", ()=> location.reload());

btnPlay.addEventListener("click", async ()=>{
  try{
    if(audio.paused) await audio.play();
    else audio.pause();
  }catch{}
  updatePlayIcons();
  persistUI();
});
miniPlay.addEventListener("click", ()=> btnPlay.click());
btnPlay2.addEventListener("click", ()=> btnPlay.click());

btnNext.addEventListener("click", ()=> playNext());
miniNext.addEventListener("click", ()=> btnNext.click());
btnNext2.addEventListener("click", ()=> btnNext.click());

btnPrev.addEventListener("click", ()=> playPrev());
miniPrev.addEventListener("click", ()=> btnPrev.click());
btnPrev2.addEventListener("click", ()=> btnPrev.click());

btnShuffle.addEventListener("click", ()=> setShuffle(!isShuffle));
btnShuffle2.addEventListener("click", ()=> setShuffle(!isShuffle));
btnLoop.addEventListener("click", ()=> setLoop(!isLoop));
btnLoop2.addEventListener("click", ()=> setLoop(!isLoop));

vol.addEventListener("input", ()=>{
  audio.volume = Number(vol.value);
  vol2.value = vol.value;
  persistUI();
});
vol2.addEventListener("input", ()=>{
  audio.volume = Number(vol2.value);
  vol.value = vol2.value;
  persistUI();
});

seek.addEventListener("input", ()=>{
  if(!isFinite(audio.duration)) return;
  audio.currentTime = (Number(seek.value)/100) * audio.duration;
});
seek2.addEventListener("input", ()=>{
  if(!isFinite(audio.duration)) return;
  audio.currentTime = (Number(seek2.value)/100) * audio.duration;
});

audio.addEventListener("timeupdate", ()=>{
  tCur.textContent = fmt(audio.currentTime);
  tCur2.textContent = tCur.textContent;

  if(isFinite(audio.duration)){
    tDur.textContent = fmt(audio.duration);
    tDur2.textContent = tDur.textContent;
    const p = (audio.currentTime / audio.duration) * 100;
    seek.value = String(p);
    seek2.value = String(p);
  }
  if(Math.floor(audio.currentTime) % 5 === 0) persistUI();
});

audio.addEventListener("play", updatePlayIcons);
audio.addEventListener("pause", updatePlayIcons);
audio.addEventListener("ended", ()=>{
  if(isLoop) return; // native loop
  playNext();
});

// sheet open/close
miniOpen.addEventListener("click", openSheet);
sheetBack.addEventListener("click", closeSheet);
sheetClose.addEventListener("click", closeSheet);

// query controls
q.addEventListener("input", applyQuery);
sectionSel.addEventListener("change", applyQuery);
sortSel.addEventListener("change", applyQuery);

// multi-select buttons
btnSelectMode.addEventListener("click", ()=> setSelectMode(!selectMode));
btnSelectAll.addEventListener("click", ()=>{
  if(!view.length) return;
  view.forEach(x => selected.add(x.realIndex));
  updateMultiInfo();
  highlightSelectedInDOM();
});
btnClearSel.addEventListener("click", ()=>{
  selected.clear();
  updateMultiInfo();
  highlightSelectedInDOM();
});
btnAddSelected.addEventListener("click", ()=>{
  if(!selected.size) return;
  // Add theo thứ tự hiện tại trong view (đúng kiểu giỏ hàng)
  const ordered = view.map(x => x.realIndex).filter(ri => selected.has(ri));
  ordered.forEach(ri => addToQueue(ri));
  selected.clear();
  updateMultiInfo();
  renderQueue();
  highlightSelectedInDOM();
});

// queue/cart buttons
btnQueueMode.addEventListener("click", ()=>{
  playQueueMode = !playQueueMode;
  btnQueueMode.setAttribute("aria-pressed", String(playQueueMode));
  saveQueue();
  renderQueue();
});
btnClearQueue.addEventListener("click", ()=>{
  queue = [];
  queuePos = 0;
  saveQueue();
  renderQueue();
});

// cart drop (desktop)
if(cartDrop){
  cartDrop.addEventListener("dragover", (e) => {
    e.preventDefault();
    cartDrop.classList.add("isOver");
  });
  cartDrop.addEventListener("dragleave", () => cartDrop.classList.remove("isOver"));
  cartDrop.addEventListener("drop", (e) => {
    e.preventDefault();
    cartDrop.classList.remove("isOver");
    const realIndex = Number(e.dataTransfer.getData("text/plain"));
    if(Number.isFinite(realIndex)) addToQueue(realIndex);
  });
}

// friendly error
audio.addEventListener("error", ()=>{
  alert("Không phát được bài này từ playlist.\n" +
        "Gợi ý: đổi tên file không dấu, không ký tự # % ? & +, và đúng hoa/thường.\n" +
        "Ví dụ: cardio-145bpm.mp3");
});

// ---- init ----
async function init(){
  const res = await fetch("tracks.json", { cache: "no-store" });
  tracks = await res.json();

  tracks = tracks.map((t, i)=>({
    id: t.id ?? String(i),
    title: t.title || (t.file ? t.file.split("/").pop() : `Track ${i+1}`),
    artist: t.artist || "Workout",
    file: t.file,
    section: t.section || "Other",
    bpm: t.bpm ?? null,
    coverEmoji: t.coverEmoji || coverEmoji(t.section || "Other"),
    _bpm: (t.bpm != null) ? t.bpm : (parseBpm(t.title) ?? parseBpm(t.file)),
    _added: i,
    _dur: null,
  }));

  restoreUI();
  loadQueue();

  brandSub.textContent = `${tracks.length} bài • ${isShuffle ? "Shuffle ON" : "Shuffle OFF"} • ${playQueueMode ? "Play Queue" : "Normal"}`;

  // initial load
  loadByIndex(index, false);

  // restore time
  try{
    const s = JSON.parse(localStorage.getItem("musicpro_ui_state") || "null");
    if(s && Number.isFinite(s.time) && s.time > 0){
      audio.currentTime = s.time;
    }
  }catch{}

  // render + queue
  applyQuery();
  updateMultiInfo();
  renderQueue();

  // optional: load durations then refresh pills
  loadDurations().then(()=> applyQuery());
}

init().catch(err=>{
  console.error(err);
  brandSub.textContent = "Failed to load tracks.json";
});
