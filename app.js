const audio = document.getElementById("audio");
const list = document.getElementById("list");
const playBtn = document.getElementById("play");
const nextBtn = document.getElementById("next");
const prevBtn = document.getElementById("prev");
const section = document.getElementById("section");

let tracks = [];
let currentIndex = 0;

// Debug lỗi load audio (rất hữu ích trên iPhone)
audio.addEventListener("error", () => {
  const err = audio.error;
  alert(
    "Audio load error. " +
    "Kiểm tra tên file/ký tự đặc biệt/case-sensitive.\n" +
    "code=" + (err?.code ?? "unknown")
  );
});

fetch("tracks.json", { cache: "no-store" })
  .then(r => r.json())
  .then(j => {
    tracks = j;
    render();
    loadByIndex(0, false);
  });

function resolveSrc(filePath) {
  // Make absolute & safe for iOS Safari
  return new URL(filePath, location.href).href;
}

function render() {
  list.innerHTML = "";

  const sec = section.value;
  const filtered = tracks
    .map((t, realIndex) => ({ t, realIndex }))
    .filter(x => sec === "All" || x.t.section === sec);

  filtered.forEach(({ t, realIndex }) => {
    const li = document.createElement("li");
    li.style.padding = "10px";
    li.style.cursor = "pointer";
    li.textContent = `${t.title} (${t.section})`;

    // Store real index
    li.dataset.realIndex = String(realIndex);

    li.onclick = async () => {
      currentIndex = Number(li.dataset.realIndex);
      await loadByIndex(currentIndex, true);
    };

    list.appendChild(li);
  });
}

section.onchange = render;

async function loadByIndex(i, autoplay) {
  if (!tracks[i]) return;
  audio.src = resolveSrc(tracks[i].file);

  if (autoplay) {
    try {
      await audio.play(); // iOS requires user gesture; click qualifies
    } catch (e) {
      // If blocked, user can press Play manually
      console.log("play blocked:", e);
    }
  }
}

playBtn.onclick = async () => {
  try {
    if (audio.paused) await audio.play();
    else audio.pause();
  } catch (e) {
    console.log(e);
  }
};

nextBtn.onclick = async () => {
  currentIndex = (currentIndex + 1) % tracks.length;
  await loadByIndex(currentIndex, true);
};

prevBtn.onclick = async () => {
  currentIndex = currentIndex > 0 ? currentIndex - 1 : tracks.length - 1;
  await loadByIndex(currentIndex, true);
};
