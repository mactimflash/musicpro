const audio = document.getElementById("audio");
const listEl = document.getElementById("list");

// Hỗ trợ cả 2 bộ id (bản tối giản hoặc bản UI lớn)
const playBtn = document.getElementById("play") || document.getElementById("btnPlay");
const nextBtn = document.getElementById("next") || document.getElementById("btnNext");
const prevBtn = document.getElementById("prev") || document.getElementById("btnPrev");
const sectionSel = document.getElementById("section") || null;

let tracks = [];
let currentIndex = 0;

function safeAudioUrl(filePath) {
  // Encode từng phần của path để tránh lỗi space, dấu, ký tự lạ
  // Ví dụ: "music/Warmup/Bài 1 #1.mp3" -> encode đúng
  const parts = String(filePath).split("/").map(p => encodeURIComponent(p));
  const encodedPath = parts.join("/");
  return new URL(encodedPath, location.href).href;
}

function render() {
  listEl.innerHTML = "";

  const sec = sectionSel ? sectionSel.value : "All";

  // mapping realIndex để không bị lệch khi filter
  const filtered = tracks
    .map((t, realIndex) => ({ t, realIndex }))
    .filter(x => sec === "All" || x.t.section === sec);

  filtered.forEach(({ t, realIndex }) => {
    const li = document.createElement("li");
    li.className = "item";
    li.dataset.realIndex = String(realIndex);
    li.textContent = `${t.title} (${t.section})`;

    li.addEventListener("click", async () => {
      currentIndex = Number(li.dataset.realIndex);
      await loadByIndex(currentIndex, true);
    });

    listEl.appendChild(li);
  });
}

async function loadByIndex(i, autoplay) {
  const track = tracks[i];
  if (!track) return;

  const src = safeAudioUrl(track.file);
  audio.src = src;

  if (autoplay) {
    try {
      await audio.play(); // click = user gesture => iOS OK
    } catch (e) {
      // nếu bị iOS chặn (hiếm), user bấm Play là chạy
      console.log("play blocked:", e);
    }
  }
}

async function togglePlay() {
  try {
    if (audio.paused) await audio.play();
    else audio.pause();
  } catch (e) {
    console.log(e);
  }
}

audio.addEventListener("error", () => {
  console.log("Audio error:", audio.error, audio.src);
  alert("Không phát được audio từ playlist.\n" +
        "Thường do tên file có ký tự đặc biệt hoặc sai hoa/thường.\n" +
        "Hãy thử đổi tên file (không dấu, không # % ? & +) và push lại.");
});

if (playBtn) playBtn.addEventListener("click", togglePlay);

if (nextBtn) nextBtn.addEventListener("click", async () => {
  if (!tracks.length) return;
  currentIndex = (currentIndex + 1) % tracks.length;
  await loadByIndex(currentIndex, true);
});

if (prevBtn) prevBtn.addEventListener("click", async () => {
  if (!tracks.length) return;
  currentIndex = currentIndex > 0 ? currentIndex - 1 : tracks.length - 1;
  await loadByIndex(currentIndex, true);
});

if (sectionSel) sectionSel.addEventListener("change", render);

fetch("tracks.json", { cache: "no-store" })
  .then(r => r.json())
  .then(j => {
    tracks = j || [];
    render();
    loadByIndex(0, false);
  });
