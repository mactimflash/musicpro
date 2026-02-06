const audio = document.getElementById("audio");

const nowTitle = document.getElementById("nowTitle");
const nowSub = document.getElementById("nowSub");
const art = document.getElementById("art");

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
const brandSub = document.getElementById("brandSub");

// mini
const mini = document.getElementById("mini");
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

let tracks = [];
let view = [];
let index = 0;
let isShuffle = false;
let isLoop = false;

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
  // Encode từng segment path để iOS Safari không “kẹt” khi tên có space/ký tự lạ
  const parts = String(filePath).split("/").map(p => encodeURIComponent(p));
  return new URL(parts.join("/"), location.href).href;
}

function persist(){
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

function restore(){
  try{
    const s = JSON.parse(localStorage.getItem("musicpro_ui_state") || "null");
    if(!s){
      isShuffle = DEFAULT_SHUFFLE_ON_FIRST_RUN;
      btnShuffle.setAttribute("aria-pressed", String(isShuffle));
      btnShuffle2.setAttribute("aria-pressed", String(isShuffle));
      return;
    }
    index = Number.isFinite(s.index) ? s.index : 0;
    audio.volume = Number.isFinite(s.vol) ? s.vol : 1;
    vol.value = String(audio.volume);
    vol2.value = String(audio.volume);

    isShuffle = !!s.isShuffle;
    isLoop = !!s.isLoop;
    audio.loop = isLoop;

    btnShuffle.setAttribute("aria-pressed", String(isShuffle));
    btnShuffle2.setAttribute("aria-pressed", String(isShuffle));
    btnLoop.setAttribute("aria-pressed", String(isLoop));
    btnLoop2.setAttribute("aria-pressed", String(isLoop));

    if(typeof s.q === "string") q.value = s.q;
    if(s.section) sectionSel.value = s.section;
    if(s.sort) sortSel.value = s.sort;
  }catch{}
}

function setNow(t){
  const bpm = t._bpm != null ? `BPM ${t._bpm}` : "BPM —";
  const section = t.section || "Other";
  const meta = `${t.artist || "Workout"} • ${section} • ${bpm}`;

  nowTitle.textContent = t.title || "—";
  nowSub.textContent = meta;

  const icon = t.coverEmoji || coverEmoji(section);
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

function pickNextIndex(){
  if(isShuffle){
    if(tracks.length <= 1) return index;
    let r = index;
    while(r === index) r = Math.floor(Math.random() * tracks.length);
    return r;
  }
  return (index + 1) % tracks.length;
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
    audio.play().catch(()=>{ /* iOS may block without gesture */ });
  }
  updatePlayIcons();
  persist();
}

function highlightActive(){
  document.querySelectorAll(".item").forEach(el=>{
    el.classList.toggle("active", el.dataset.realIndex == index);
  });
}

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
  persist();
}

function renderList(){
  listEl.innerHTML = "";
  view.forEach(({t, realIndex})=>{
    const li = document.createElement("li");
    li.className = "item";
    li.dataset.realIndex = String(realIndex);

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = t.coverEmoji || coverEmoji(t.section);

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

    li.appendChild(badge);
    li.appendChild(meta);

    li.addEventListener("click", ()=>{
      loadByIndex(realIndex, true);
      openSheet(); // trải nghiệm “app”
    });

    listEl.appendChild(li);
  });

  highlightActive();
}

async function loadDurations(){
  await Promise.all(tracks.map(t => new Promise((resolve)=>{
    const a = new Audio();
    a.preload = "metadata";
    a.src = safeAudioUrl(t.file);
    a.addEventListener("loadedmetadata", ()=>{ t._dur = a.duration; resolve(); }, {once:true});
    a.addEventListener("error", ()=> resolve(), {once:true});
  })));
}

function openSheet(){
  sheet.classList.add("show");
  sheet.setAttribute("aria-hidden", "false");
}
function closeSheet(){
  sheet.classList.remove("show");
  sheet.setAttribute("aria-hidden", "true");
}

btnReload.addEventListener("click", ()=> location.reload());

btnPlay.addEventListener("click", async ()=>{
  try{
    if(audio.paused) await audio.play();
    else audio.pause();
  }catch{}
  updatePlayIcons();
  persist();
});
miniPlay.addEventListener("click", ()=> btnPlay.click());
btnPlay2.addEventListener("click", ()=> btnPlay.click());

btnNext.addEventListener("click", ()=> loadByIndex(pickNextIndex(), true));
miniNext.addEventListener("click", ()=> btnNext.click());
btnNext2.addEventListener("click", ()=> btnNext.click());

btnPrev.addEventListener("click", ()=>{
  if(audio.currentTime > 3){ audio.currentTime = 0; return; }
  loadByIndex(index - 1, true);
});
miniPrev.addEventListener("click", ()=> btnPrev.click());
btnPrev2.addEventListener("click", ()=> btnPrev.click());

function setShuffle(v){
  isShuffle = v;
  btnShuffle.setAttribute("aria-pressed", String(isShuffle));
  btnShuffle2.setAttribute("aria-pressed", String(isShuffle));
  persist();
}
function setLoop(v){
  isLoop = v;
  audio.loop = isLoop;
  btnLoop.setAttribute("aria-pressed", String(isLoop));
  btnLoop2.setAttribute("aria-pressed", String(isLoop));
  persist();
}

btnShuffle.addEventListener("click", ()=> setShuffle(!isShuffle));
btnShuffle2.addEventListener("click", ()=> setShuffle(!isShuffle));
btnLoop.addEventListener("click", ()=> setLoop(!isLoop));
btnLoop2.addEventListener("click", ()=> setLoop(!isLoop));

vol.addEventListener("input", ()=>{
  audio.volume = Number(vol.value);
  vol2.value = vol.value;
  persist();
});
vol2.addEventListener("input", ()=>{
  audio.volume = Number(vol2.value);
  vol.value = vol2.value;
  persist();
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
  if(Math.floor(audio.currentTime) % 5 === 0) persist();
});

audio.addEventListener("play", updatePlayIcons);
audio.addEventListener("pause", updatePlayIcons);
audio.addEventListener("ended", ()=>{
  if(isLoop) return;
  loadByIndex(pickNextIndex(), true);
});

q.addEventListener("input", applyQuery);
sectionSel.addEventListener("change", applyQuery);
sortSel.addEventListener("change", applyQuery);

miniOpen.addEventListener("click", openSheet);
sheetBack.addEventListener("click", closeSheet);
sheetClose.addEventListener("click", closeSheet);

// Safety: show useful error if file name has bad chars/case mismatch
audio.addEventListener("error", ()=>{
  alert("Không phát được bài này từ playlist.\n" +
        "Gợi ý: đổi tên file không dấu, không ký tự # % ? & +, và đúng hoa/thường.\n" +
        "Ví dụ: cardio-145bpm.mp3");
});

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
    _added: i
  }));

  restore();

  brandSub.textContent = `${tracks.length} bài • ${isShuffle ? "Shuffle ON" : "Shuffle OFF"}`;

  // Deep link ?t=
  const url = new URL(location.href);
  const tid = url.searchParams.get("t");
  const found = tracks.findIndex(x => String(x.id) === String(tid));
  if(found >= 0) index = found;

  loadByIndex(index, false);

  // Restore time
  try{
    const s = JSON.parse(localStorage.getItem("musicpro_ui_state") || "null");
    if(s && Number.isFinite(s.time) && s.time > 0){
      audio.currentTime = s.time;
    }
  }catch{}

  applyQuery();
  loadDurations().then(()=> applyQuery());
}

init().catch(err=>{
  brandSub.textContent = "Failed to load tracks.json";
  console.error(err);
});
